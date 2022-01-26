const puppeteer = require('puppeteer')
const fs = require('fs-extra')
const mkdirp = require('mkdirp')
const path = require('path')
const uuid = require('uuid/v1')
const moment = require('moment')
const os = require('os')

const stepLogin = async (page, options) => {
  // Open homepage and fill account info
  console.log('Opening bank homepage...')
  console.debug('Itaú url:', options.itau.url)
  await page.goto(options.itau.url)
  console.log('Homepage loaded.')
  await page.type('#agencia', options.branch)
  await page.type('#conta', options.account)
  console.log('Account and branch number has been filled.')
  await page.waitFor(500)
  await page.click('#btnLoginSubmit')
  console.log('Opening password page...')

  // Input password
  await page.waitFor('div.modulo-login')
  console.log('Password page loaded.')
  const passwordKeys = await mapPasswordKeys(page)
  const keyClickOption = { delay: 300 }
  await page.waitFor(500)
  console.log('Filling account password...')
  for (const digit of options.password.toString()) {
    await passwordKeys[digit].click(keyClickOption)
  }
  console.log('Password has been filled...login...')
  await page.waitFor(500)
  page.click('#acessar', keyClickOption)
  await page.waitFor('#sectionHomePessoaFisica')
  console.log('Logged!')
}

const stepExport = async (page, options) => {
  try {
    
  
  console.log('Opening statement page...')
  // Go to extrato page
  await page.evaluate(() => { document.querySelector('.sub-mnu').style.display = 'block' })
  await page.waitFor(1000)

  //await page.hover('#varejo > header > div.container > nav > ul > li > div > div > div:nth-child(1) > ul:nth-child(1) > li:nth-child(2) > a')
  //await page.click('#varejo > header > div.container > nav > ul > li > div > div > div:nth-child(1) > ul:nth-child(1) > li:nth-child(2) > a')
  console.log('Statement page loaded.')

  // Close guide
  await stepCloseStatementGuide(page)
  console.log('Statement has been closed')

  // Close menu
  await page.evaluate(() => { document.querySelector('.sub-mnu').style.display = 'none' })
  await page.waitFor(1000)
  console.log('Menu has been closed')

  // Select transactions tab
  // await page.click('#btn-aba-lancamentos')
  // console.log('Selected transactions tab')

  // Select all entries on the filters
  await page.click('#extrato-filtro-lancamentos .todas-filtro-extrato-pf')
  console.log('Selected all entries on the filters')

  // Select period of days
  await page.select('cpv-select[model=\'pc.periodoSelecionado\'] select', options.days.toString())
  console.log('Selected period of days on the filters')

  // wait load transactions
  await page.waitFor(10000)

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
  const finalFilePathWithExtension = download(page, triggerDownload, finalFilePath, options)
  console.log('Download has been finished.')
  console.log('Export document final path: ', finalFilePathWithExtension)
  } catch (error) {
   console.error("OPS");   
  }
}

const stepCloseStatementGuide = async (page) => {
  await page.waitForSelector('.close-btn-H2O', { timeout: 4000 })
    .then(() => page.click('.close-btn-H2O')) // eslint-disable-line
    .catch(() => {})
}

const stepClosePossiblePopup = async (page) => {
  await page.waitForSelector('.close-btn-H2O', { timeout: 4000 })
    .then(() => page.evaluate(() => popFechar())) // eslint-disable-line
    .catch(() => {
      console.error("erro ")
    })
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

const passoExtra = async( page ) => {
  // await page.waitFor('#input-busca')
  // page.type('#input-busca', "fatura");
  // page.type('#input-busca', "fatura");
  // page.type('#input-busca', "fatura");
  // page.type('#input-busca', "fatura");
  // page.type('#input-busca', "fatura");
  
  // var seletor = "#cartao-card-accordion";
  // var seletor = ".close-btn-H20";
  
  //chama funcao que fechao modal
  var seletor = "#overlayPopupH2OID";
  await page.waitForSelector(seletor, { timeout: 4000 })
    .then(() => page.evaluate(() => window.top._closeModalH2o('/21672839401/PF_HOME_POPUP_02'))) // eslint-disable-line
    .catch(() => {
      console.error("erro ")
    })
  
  var seletor = "#input-busca";
  await page.waitForSelector(seletor, { timeout: 4000 })
    .then(() => {
      // page.type('#input-busca', "fatura");
      // page.waitFor(1000);
      // page.type('#input-busca', "fatura2");
      page.evaluate(() => barraBuscaController.iniciarCartaoRapido());

      seletor = ".cartoes.clear";
      page.waitForSelector(seletor, { timeout: 4000 })
      .then(async () => {
        console.info("encontrou o seletor: " + seletor);
        await page.waitFor(1000);

        page.click(seletor);
      }) // eslint-disable-line
      .catch(() => {
        console.error("erro ")
      })  

    })
    .catch(() => {
      console.error("erro ")
    })

    

    
  // 

  //menu
  // seletor = ".btn-nav btn-menu";
  // await page.waitForSelector(seletor, { timeout: 8000 })
  //   .then(() => page.click(seletor)) // eslint-disable-line
  //   .catch((e) => {
  //     console.error("erro " + e)
  //   })

  //sub menu
  // seletor = "#person > header > div.container > nav > ul > li > div > div > div:nth-child(2) > ul:nth-child(2) > li:nth-child(2) > a";
  // await page.waitForSelector(seletor, { timeout: 8000 })
  //   .then(() => page.click(seletor)) // eslint-disable-line
  //   .catch((e) => {
  //     console.error("erro " + e)
  //   })

    

  

  // for (let cont = 0; cont < 20; cont++) {
    // await page.waitFor(1000)
    // console.info("encontrou o seletor: " + seletor);
    // console.info("iteracao: " + cont);
    // page.click(seletor);

    
    //call JS
    //window.top._closeModalH2o('/21672839401/PF_HOME_POPUP_02')
  // }

}

const scraper = async (options) => {
  console.log('Starting Itaú scraper...')
  console.log('Account Branch Number:', options.branch)
  console.log('Account number:', options.account)
  console.log('Transaction log days:', options.days)
  console.log('File Format:', options.file_format)

  console.debug('Puppeter - options', options.puppeteer)
  const browser = await puppeteer.launch(options.puppeteer)

  const page = await browser.newPage()
  console.debug('Viewport - options', options.viewport)
  page.setViewport(options.viewport)

  await stepLogin(page, options)

  await passoExtra(page);
  //await stepClosePossiblePopup(page)
  //await stepExport(page, options)

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
