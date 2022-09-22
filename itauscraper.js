const puppeteer = require('puppeteer')
const fs = require('fs-extra')
const mkdirp = require('mkdirp')
const path = require('path')
const { v4: uuid } = require('uuid')
const moment = require('moment')
const os = require('os')
var mysql = require('mysql')

var con = mysql.createConnection({
  host: "pwms.com.br",
  user: "controlei-user",
  password: "controlei-user-123",
  database: "controlei"
});

var cont = 0;
var contIgnorados = 0;
var bar;
// var lancamentos2;

var lancamentos = [
  [ '19/09/2022', 'REND PAGO APLIC AUT APR', '0,01', 'extrato', '' ],
  [ '19/09/2022', 'FINANC IMOBILIARIO 045', '-4.714,32', 'extrato', '' ],
  [ '16/09/2022', 'PIX QRS Nelson Alca16/09', '-35,00', 'extrato', '' ],
  [ '15/09/2022', 'TED 755.1306NETCRACKER T ', '8.000,00', 'extrato', '' ],
  [ '15/09/2022', 'PIX TRANSF WILLIAN15/09', '-1.000,00', 'extrato', '' ],
  [ '13/09/2022', 'DA CPFL PIR 10022161988 ', '-181,65', 'extrato', '' ],
  // [ '13/09/2022', 'PIX TRANSF WILLIAN13/09', '1.000,00', 'extrato', '' ],
  // [ '12/09/2022', 'REND PAGO APLIC AUT MAIS', '0,05', 'extrato', '' ],
  // [ '12/09/2022', 'DA CLARO MOVEL 34100712 ', '-56,98', 'extrato', '' ],
  // [ '12/09/2022', 'DA AGUA ARAÇOIABA 78059 ', '-72,62', 'extrato', '' ],
  // [ '12/09/2022', 'PIX TRANSF KLEBER 12/09', '-120,00', 'extrato', '' ],
  // [ '12/09/2022', 'INT PAG TIT BANCO 237', '-99,90', 'extrato', '' ],
  // [ '12/09/2022', 'INT PAG TIT 109000117954 ', '-1.249,99', 'extrato', '' ],
  // [ '12/09/2022', 'INT PAG TIT 109000117434 ', '-1.249,99', 'extrato', '' ],
  // [ '12/09/2022', 'CEL PAG TIT BANCO 237', '-142,22', 'extrato', '' ],
  // [ '09/09/2022', 'REND PAGO APLIC AUT MAIS', '0,01', 'extrato', '' ],
  // [ '09/09/2022', 'DDA PAG TIT', '-630,34', 'extrato', '' ],
  // [ '08/09/2022', 'PIX TRANSF UESLEI 08/09', '-100,00', 'extrato', '' ],
  // [ '16/09/2022', 'PIX QRS Nelson Alca16/09', '-35,00', 'extrato', '' ],
  // [ '19/09/2022', 'FINANC IMOBILIARIO 045', '-4.714,32', 'extrato', '' ],
  // [ '19/09/2022', 'REND PAGO APLIC AUT APR', '0,01', 'extrato', '' ]
];

converterDataBRtoUSA = function (dataBrasil) {
  return "" + dataBrasil.substring(6, 12) + "-" + dataBrasil.substring(3, 5) + "-" + dataBrasil.substring(0, 2);
}

var tratarLancamentos = function(){
  console.info("tratando datas e valores dos lançamentos...");
  for(value of lancamentos) {
    console.info("tratando... " + value);
    value[0] = converterDataBRtoUSA(value[0]);
    value[2] = value[2].replace('.', '').replace(',', '.');
    value[3] = 'extrato';
  };

  conectarNoBanco();
  
};

var conectarNoBanco = function(){
  console.info("Conectando ao banco de dados ...");
  con.connect(function(err) {
    console.info("Resposta do banco de dados ...");
    if (err) {
      console.info("erro" + err.code )
    }else{
      console.log("Database connected!");

      bar = new Promise((resolve, reject) => {
        var contMysql = 0;
        // twirlTimer();

        lancamentos.forEach((value, index, array) => {
          var sql = "INSERT INTO lancamentos (data, titulo, valor, origem, categoria) VALUES (?)";

          con.query(sql, [value], function (err, result) {
            
            if (err) {
              if(err.code == 'ER_DUP_ENTRY'){
                console.info("Status: já cadastrado: " + value);
                contIgnorados++;
              }else{
                console.info(err);
              }
            }else{
              cont++;
              // console.info("Inserido com sucesso");
              console.info("Inserindo..." + value);
            }
            contMysql++;

            // console.info("contMysql", contMysql);
            // console.info("array.length", array.length);
            if (contMysql === array.length) resolve();
          });
        });
      });

      bar.then(() => {
        sumario();
        // con.end();
      });
      
    }
  });
}

var sumario = function(){
  console.info("Novos registros: " + cont);
  console.info("Registros ignorados: " + contIgnorados);
  console.info("Finalizado com sucesso! ");
};

var twirlTimer = function() {
  var P = ["\\", "|", "/", "-"];
  var x = 0;
  return setInterval(function() {
    process.stdout.write("\r" + P[x++]);
    x &= 3;
  }, 250);
};

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

  if(!!options.name){
    console.log('Opening account holder page...');
    await page.waitForTimeout(2000)
    await stepAwaitRegularLoading(page)
    await page.waitForSelector('ul.selecao-nome-titular', { visible: true })
    console.log('Account holder page loaded.')

    const names = await page.$$('ul.selecao-nome-titular a[role="button"]');
    for (const name of names) {
      const text = await page.evaluate(element => element.textContent, name);
      if(text.toUpperCase() == options.name.toUpperCase()){
        name.click();
        console.log('Account holder selected.')
      }
    }
  }

  console.log('Opening password page...')
  await page.waitForTimeout(2000)
  await stepAwaitRegularLoading(page)
  await page.waitForSelector('div.modulo-login', { visible: true })
  console.log('Password page loaded.')

  // Input password
  const passwordKeys = await mapPasswordKeys(page)
  await page.waitForTimeout(500)

  console.log('Filling account password...')
  for (const digit of options.password.toString()) {
    await page.evaluate((selector) => {
      document.querySelector(selector).click()
    }, passwordKeys[digit])
    await page.waitForTimeout(300)
  }

  console.log('Password has been filled...login...')
  await page.waitForTimeout(1000)
  page.click('#acessar', { delay: 300 })
  await page.waitForSelector('#sectionHomePessoaFisica')
  console.log('Logged!')
}

const stepExport = async (page, options) => {
  console.log('Opening statement page...')
  // Go to statement page
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
  await stepAwaitRegularLoading(page)

  // Sort by most  recent transactions first
  await page.select('cpv-select[model=\'app.ordenacao\'] select', 'maisRecente')
  console.log('Sorted by most recent transactions first')
  await stepAwaitRegularLoading(page)

  // await prepararDownload(page)

  console.log('varrerArvoreLancamentos...')
  await varrerArvoreLancamentos(page);
}

const varrerArvoreLancamentos = async (page) => {
  console.info("Varrendo lista de lançamentos...");

  const data = await page.evaluate(
    () => Array.from(
      document.querySelectorAll('#corpoTabela-gridLancamentos-pessoa-fisica > tr'),
      row => Array.from(row.querySelectorAll('th, td'), cell => cell.innerText)
    )
  );

  console.info("Removendo itens desnecessários dos lançamentos...");
  var newData = data.filter(function (el) {
    return  el[1] != 'SALDO ANTERIOR' &&
            el[1] != 'SALDO DO DIA' && 
            el[1] != 'SDO CTA/APL AUTOMATICAS' &&
            el[1] != '(-) SALDO A LIBERAR' &&
            el[1] != 'SALDO FINAL DISPONIVEL' && 
            el[4] == '';
  });

  lancamentos = newData;

  tratarLancamentos();
}

const prepararDownload = async (page) => {
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

const stepAwaitRegularLoading = async (page) => {
  await page.waitForSelector('div.loading-nova-internet', { visible: true, timeout: 3000 })
  await page.waitForSelector('div.loading-nova-internet', { hidden: true })
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
      const rel = await page.evaluate(element => element.getAttribute('rel'), key)
      const selectorToClick = `a[rel="${rel}"]`
      const digits = text.split('ou').map(digit => digit.trim())
      keyMapped[digits[0]] = selectorToClick
      keyMapped[digits[1]] = selectorToClick
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
    console.log('Waiting to download file.... ')
    filename = fs.readdirSync(downloadPath)[0]
    await sleep(500)
  }
  return filename
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

  if(options.env.test){
    tratarLancamentos(); 
  }else{
    await stepLogin(page, options)
    await stepClosePossiblePopup(page)
    await stepExport(page, options)
    await browser.close()
    console.log('Itaú scraper finished.')
  }


}

/* eslint-disable */
String.prototype.interpolate = function (params) {
  const names = Object.keys(params)
  const vals = Object.values(params)
  return new Function(...names, `return \`${this}\`;`)(...vals)
}
/* eslint-enable */

module.exports = scraper
