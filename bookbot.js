import dotenv from 'dotenv'
dotenv.config()
import moment from 'moment'
import nodemailer from 'nodemailer'
import nightmare from 'nightmare'
import nightmareDownloadManager from 'nightmare-download-manager'
import path from 'path'
import debug from 'debug'
import when from 'when'
import {CronJob} from 'cron'
import getopt from 'node-getopt'

const log = debug('bookbot')
const args = getopt.create([
  ['g', '', 'run now'],
  ['t', '', 'run now'],
  ['c', '', 'run cron'],
  ['T', '=', 'cron string'], 
  ['G', '=', 'cron string'], 
]).bindHelp().parseSystem()

nightmareDownloadManager(nightmare)

export class Bookbot {
  constructor() {
    this.mailer = nodemailer.createTransport({
      host: process.env['SMTP_SERVER'],
      port: 587,
      secure: false,
      auth: {
        user: process.env['EMAIL'],
        pass: process.env['SMTP_PASSWORD']
      }
    })
    this.browser = new nightmare({show: !(process.env['DISPLAY']===null)});

  }

  sendAttachment(filepath) {
    log(`send attachment ${filepath}`)
    const msg = {
      sender: process.env['EMAIL'],
      from: `Akcja Bot <${process.env['EMAIL']}>`,
      bcc: process.env['TO'],
      subject: 'Dzisiejsza gazeta',
      html: 'W załącznku dzisiejsza gazeta &lt;3',
      attachments: {
        filename: path.basename(filepath),
        path: filepath
      }
    }
    return when.promise((ok, fail) => {
      this.mailer.sendMail(msg, (err, info) => {
        if (err) {
          log(err)
          return fail(err)
        }
        return ok()
      })
    })
  }

  getGazeta() {
    const filename = `./gazeta-${moment().format('YYYY-MM-DD')}.mobi`
    this.browser.once('download', (state, downloadItem) => {
      if(state == 'started'){
        log(`download started to ${filename}`)
        this.browser.emit('download', filename, downloadItem);
      }
    });
    return this.browser.downloadManager()
      .goto('https://www.publio.pl/klient/logowanie.html')
      .viewport(2014, 768)
      .type('#j_username', process.env['LOGIN'])
      .type('#j_password', process.env['PASSWORD'])
      .click('.btn-login')
      .wait(1000)
      .wait('a.username')
      .goto("https://www.publio.pl/klient/publikacje.html?pressTitle=91417")
      .wait('.downloadStatus')
      .click('.downloadStatus .btn-simple')
      .wait('.productDownloadInfo')
      .click("input[name^='downloadPackage'][value='6']")
      .click('.btn-simple.mR10')
      .waitDownloadsComplete()
      .end().then(() => {
        return filename;
      })
  }

  getTygodnik() {
    const filename = `./tygodnik-${moment().format('YYYY-MM-DD')}.mobi`
    this.browser.once('download', (state, downloadItem) => {
      if(state == 'started'){
        log(`download started to ${filename}`)
        this.browser.emit('download', filename, downloadItem);
      }
    });
    return this.browser.downloadManager()
      .goto('https://www.publio.pl/klient/logowanie.html')
      .viewport(2014, 768)
      .type('#j_username', process.env['LOGIN'])
      .type('#j_password', process.env['PASSWORD'])
      .click('.btn-login')
      .wait(1000)
      .wait('a.username')
      .goto("https://www.publio.pl/klient/publikacje.html?pressTitle=94542")
      .wait('.downloadStatus')
      .click('.downloadStatus .btn-simple')
      .wait('.productDownloadInfo')
      .click("input[name^='downloadPackage'][value='6']")
      .click('.btn-simple.mR10')
      .waitDownloadsComplete()
      .end().then(() => {
        return filename;
      })
  }

}

export const morningGazeta = () => {
  log('morningGazeta job started')
  const bot = new Bookbot()
  bot.getGazeta()
    .then(fn => bot.sendAttachment(fn))
    .then(x => console.info('Morning Gazeta delivered!'))
}

export const sundayTygodnik = () => {
  log('sundayTygodnik job started')
  const bot = new Bookbot()
  bot.getTygodnik()
    .then(fn => bot.sendAttachment(fn))
    .then(x => console.info('Sunday Tygodnik delivered!'))
}

if (args.options.g) {
  morningGazeta()
}

if (args.options.t) {
  sundayTygodnik()
}

if (args.options.c) {
  let gazetaStr = args.options.G || '0 0 7 * * *'
  let tygodnikStr = args.options.T || '0 30 7 * * 0'
  console.log(`gazeta schedule ${gazetaStr}`)
  new CronJob(gazetaStr, morningGazeta, null, true, 'Europe/Warsaw')
  console.log(`tygodnik schedule ${tygodnikStr}`)
  new CronJob(tygodnikStr, sundayTygodnik, null, true, 'Europe/Warsaw')
}
