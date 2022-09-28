const puppeteer = require('puppeteer')
const fs = require('fs-extra')
const mkdirp = require('mkdirp')
const path = require('path')
const { v4: uuid } = require('uuid')
const moment = require('moment')
const os = require('os')
const utils = require('./utils');
const db = require('./banco-de-dados');

const stepLogin = async (page, options) => {
  // Open homepage and fill account info
  console.log('Opening bank homepage...')
  console.debug('Itaú url:', options.itau.url)
  await page.goto(options.itau.url)
  console.log('Homepage loaded.')
  await page.type('#agencia', options.branch)
  await page.type('#conta', options.account)
  console.log('Account and branch number has been filled.')
  await page.waitForTimeout(500)
  await page.click('button.login_button.icon-itaufonts_seta_right')
  console.log('Opening password page...')

  // Input password
  await page.waitForSelector('div.modulo-login')
  console.log('Password page loaded.')
  const passwordKeys = await mapPasswordKeys(page)
  const keyClickOption = { delay: 300 }
  await page.waitForTimeout(500)
  console.log('Filling account password...')
  for (const digit of options.password.toString()) {
    await passwordKeys[digit].click(keyClickOption)
  }
  console.log('Password has been filled...login...')
  await page.waitForTimeout(500)
  page.click('#acessar', keyClickOption)
  await page.waitForSelector('#sectionHomePessoaFisica')
  console.log('Logged!')
}

const stepFatura = async (page, options) => {
  console.log('Abrindo fatura...');

  //abrindo menu
  await page.evaluate(() => { document.querySelector('.sub-mnu').style.display = 'block' })
  await page.waitForTimeout(1000)

  //clicar no meu fatura
  await page.evaluate(() => {
    const xpath = "//*[@id='person']/header/div[3]/nav/ul/li/div/div/div[2]/ul[2]/li[2]/a";
    const result = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null) // eslint-disable-line
    result.iterateNext().click()
  })
  console.log('Entrou na tela de faturas')

  //fechar menu
  console.log('fechando menu...')
  await page.evaluate(() => { document.querySelector('.sub-mnu').style.display = 'none' })

  await page.waitForTimeout(3000)
  console.log('buscando lista de lançamentos...')
      
  await page.waitForTimeout(3000)
  
  const result = await page.evaluate( function(options){
    // CARTOES
    //lançamentos nacionais adicional NAYARA M DOMINGUES - final 5020
    var seletor = "table[summary*='"+options.cartao_numero+"'] tr.linha-valor-total"; 
    
    //ENCARGOS
    //lançamentos encargos e serviços
    // var seletor = "table[summary*='lançamentos encargos e serviços'] tr";
    
    const rows = document.querySelectorAll(seletor);
    
    
    return Array.from(rows, row => {
      const columns = row.querySelectorAll('td');
      return Array.from(columns, column => {

        var spans = column.querySelectorAll('span');
        console.log(">>>" + spans.length);

        var xxx = "";

        if(spans.length === 3){
          console.info("aqui");
          xxx = "-" + spans[2].innerText;
        }else if(spans.length === 1){
          xxx = spans[0].innerText;
        }else{
          xxx = column.innerText;
        }

        // return Array.from(spans, span => span.innerText) 
        return xxx;

      });
    });
  }, options);
  
  console.log("Encontrei " + result.length + " lançamentos.")

  //vencimento
  let vencimento = await page.evaluate(() => {
    const seletorVencimento = ".c-category-status__venc .c-category-status__value";
    let result = document.querySelector(seletorVencimento);
    return result.innerHTML;
  })

  console.log("vencimento-2 ");
  console.log(vencimento);
  await stepStore(result, options, vencimento);
}

const stepStore = async (result, options, vencimento) => {
  db.conectar();
  // bar = new Promise((resolve, reject) => {
  //   var contMysql = 0;
    for (let index = 0; index < result.length; index++) {
      let descricao = '';
      let valor = 0;
      let data = null;
      let vencimentoDB = null;

      if(result[index][1]){
        descricao = result[index][1].replace('\'', '');
      }

      if(result[index][2]){
        valor = result[index][2].replace('.', '').replace(',', '.');
      }

      if(result[index][0]){
        data = utils.dataExtensaParaBancoDeDados(result[index][0]);
      }

      if(vencimento){
        vencimentoDB = utils.datadataBRtoDatabase(vencimento);
      }

      console.log(data); 
      console.log(descricao);
      console.log(valor);
      console.log(vencimentoDB);
      console.log("---"); 

      if(data != undefined || data != null){
        db.salvar(data, descricao, valor, options.cartao_numero, vencimentoDB); 
      }
    }
}

const stepExport = async (page, options) => {
  console.log('Opening statement page...')
  // Go to extrato page
  await page.evaluate(() => { document.querySelector('.sub-mnu').style.display = 'block' })
  await page.waitForTimeout(1000)

  await page.evaluate(() => {
    const xpath = '//a[contains(., \'saldo e extrato\')]'
    const result = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null) // eslint-disable-line
    result.iterateNext().click()
  })
  console.log('Statement page loaded.')

  // Close guide
  await stepCloseStatementGuide(page)
  console.log('Statement has been closed')

  // Close menu
  await page.evaluate(() => { document.querySelector('.sub-mnu').style.display = 'none' })
  await page.waitForTimeout(1000)
  console.log('Menu has been closed')

  // Select period of days
  await page.select('cpv-select[model=\'pc.periodoSelecionado\'] select', options.days.toString())
  console.log('Selected period of days on the filters')
  await stepAwaitStatementLoading(page)

  // Sort by most  recent transactions first
  await page.select('cpv-select[model=\'app.ordenacao\'] select', 'maisRecente')
  console.log('Sorted by most recent transactions first')
  await stepAwaitStatementLoading(page)

  // configure Download Trigger
  let triggerDownload = (fileFormat) => { exportarExtratoArquivo('formExportarExtrato', fileFormat) }// eslint-disable-line
  if (options.file_format === 'pdf') {
    triggerDownload = (fileFormat) => { exportarArquivoLancamentoImprimirPdf('pdf') } // eslint-disable-line
  }

  const finalFilePath = path.resolve(
    options.download.path,
    options.download.filename.interpolate({
      days: options.days,
      timestamp: moment().unix()
    })
  )

  console.log('Starting download...')
  const finalFilePathWithExtension = await download(page, triggerDownload, finalFilePath, options)
  console.log('Download has been finished.')
  console.log('Export document final path: ', finalFilePathWithExtension)
}

const stepAwaitStatementLoading = async (page) => {
  await page.waitForSelector('div.blockPage div.loading-nova-internet', { visible: true })
  await page.waitForSelector('div.blockPage div.loading-nova-internet', { hidden: true })
}

const stepCloseStatementGuide = async (page) => {
  await page.waitForSelector('.feature-discovery-extrato button.hopscotch-cta', { timeout: 4000 })
    .then(() => page.click('.feature-discovery-extrato button.hopscotch-cta')) // eslint-disable-line
    .catch(() => {})
}

const stepClosePossiblePopup = async (page) => {
  await page.waitForSelector('div.mfp-wrap', { timeout: 4000 })
    .then(() => page.evaluate(() => popFechar())) // eslint-disable-line
    .catch(() => {})
}

const mapPasswordKeys = async (page) => {
  const keys = await page.$$('.teclas .tecla')
  const keyMapped = {}

  for (const key of keys) {
    const text = await page.evaluate(element => element.textContent, key)
    if (text.includes('ou')) {
      const digits = text.split('ou').map(digit => digit.trim())
      keyMapped[digits[0]] = key
      keyMapped[digits[1]] = key
    }
  }

  return keyMapped
}

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const download = async (page, triggerDownload, finalFilePath, options) => {
  const downloadPath = path.resolve(os.tmpdir(), 'download', uuid())
  mkdirp(downloadPath)
  console.log('Temporary downloading file to:', downloadPath)
  await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath })

  await page.evaluate(triggerDownload, options.file_format)

  const filename = await waitForFileToDownload(downloadPath)
  const tempFilePath = path.resolve(downloadPath, filename)
  const extension = path.extname(tempFilePath)

  finalFilePath += extension

  console.log('Moving file to final path.')
  await fs.moveSync(tempFilePath, finalFilePath)

  return finalFilePath
}

const waitForFileToDownload = async (downloadPath) => {
  console.log('Waiting to download file...')
  let filename
  while (!filename || filename.endsWith('.crdownload')) {
    filename = fs.readdirSync(downloadPath)[0]
    await sleep(500)
  }
  return filename
}

const scraper = async (options) => {
  console.log('Starting Itaú scraper...')
  console.log('Account Branch Number:', options.branch)
  console.log('Account number:', options.account)
  console.log('Card number:', options.cartao_numero)
  console.log('Transaction log days:', options.days)
  console.log('File Format:', options.file_format)

  console.debug('Puppeter - options', options.puppeteer)
  const browser = await puppeteer.launch(options.puppeteer)

  const page = await browser.newPage()
  console.debug('Viewport - options', options.viewport)
  page.setViewport(options.viewport)

  await stepLogin(page, options)
  await stepClosePossiblePopup(page)
  try {
    await stepFatura(page, options)
  } catch (error) {
    console.info(error)
  }
  // await stepExport(page, options)

  //await browser.close()


  console.log('Itaú scraper finished.')
}

/* eslint-disable */
String.prototype.interpolate = function (params) {
  const names = Object.keys(params)
  const vals = Object.values(params)
  return new Function(...names, `return \`${this}\`;`)(...vals)
}
/* eslint-enable */

module.exports = scraper
