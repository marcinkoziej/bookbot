import dotenv from 'dotenv'
dotenv.config()
import moment from 'moment'
import nodemailer from 'nodemailer'
import nightmare from 'nightmare'
import nightmareDownloadManager from 'nightmare-download-manager'
import path from 'path'
import fs from 'fs'
import debug from 'debug'
import when from 'when'
import {CronJob} from 'cron'
import getopt from 'node-getopt'
import {exec} from 'child_process'

const log = debug('bookbot')
const args = getopt.create([
  ['c', '', 'run cron'],
  ['s', '', 'mode: start snapshot'],
  ['f', '', 'mode: fetch snapshot'],
  ['r', '', 'mode: restore snapshot to db'],
  ['R', '', 'restore immediately after fetch'],
  ['D', '', 'delete snapshot from server immedately after download'],
  ['S', '=', 'cron schedule for starting snapshot'],
  ['F', '=', 'cron schedule for fetching snapshot'],
  ['n', '=', 'snapshot name (default based on current date)'],
  ['N', '=', 'snapshot filename (default based on current date)'],
]).bindHelp().parseSystem()

nightmareDownloadManager(nightmare)

export class NBSnapper {
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
    this.nb = {
      url: process.env['NATIONBUILDER_URL']
    }
    this.database_url = process.env['DATABASE_URL']
    this.browser = new nightmare({show: !(process.env['DISPLAY']===null)});
    // this.browser.on('page', function(event, msg, resp) {
    //   log(`${event}: ${msg} -> ${resp}`)
    //   return true;
    // })

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

  restoreSnapshot(filename) {
    if (!this.database_url) {
      log('no DATABASE_URL set')
      return
    }
    if (!fs.existsSync(filename)) {
      log(`${filename} does not exist`)
      return
    }
    log(`pg_restore -Fc -c -f "${filename}" url...`)
    exec(`pg_restore -Fc -c -d ${this.database_url} "${filename}"`, {}, (err, stdout, stderr) => {
      if (stdout) {
        log(stdout)
      }
      if (err) {
        log(stderr)
        return
      }
      fs.unlink(filename, (err) => { if (err) { log(`error removing ${filename}: ${err}`) } })
    })

  }

  startSnapshot(name='Daily snapshot') {
    return this.login()
      .wait(1000)
      .goto(this.nb.url + '/admin/backups')
      .type('#nation_backup_comment', name)
      .click('[name="commit"]')
      .end()
  }

  fetchSnapshot(name='Daily snapshot', filename='snapshot.snap', remove=true) {
    this.browser.once('download', (state, downloadItem) => {
      if(state == 'started'){
        log(`download started to ${filename}`)
        this.browser.emit('download', filename, downloadItem);
      }
    });


    return this.login()
      .wait(1000)
      .goto(this.nb.url + '/admin/backups')
      .evaluate((name) => {
        // hijack confirm
        window.confirm = function(msg) { return true; }
        // Find snapshot table
        const rows = document.querySelector('table.table').querySelectorAll('tr')

        // look for snapshot by name
        for (const tr of rows) {
          const td = tr.querySelector('td:nth-child(4)')
          if (td && td.innerHTML.includes(name)) {
            // find download link and remove link
            const downloadLink = tr.querySelector('td:nth-child(3) a')
            const removeLink = tr.querySelector('[data-method="delete"]')

            if (removeLink) {
              // mark the remove link for later with a class
              removeLink.classList.add('x-remove-snapshot')
            }
            if (downloadLink) {
              downloadLink.click()
              return true
            }
            return false
          }
        }
      }, name)
      .then((downloading) => {
        if (downloading) {
          let b = this.browser.waitDownloadsComplete()
          if (remove) {
            b = b.click('.x-remove-snapshot').wait(1000)
          }
          return b.end()
        } else {
          log(`Snapshot ${name} not ready yet`)
          return this.browser.end()
        }
      })
  }

  login() {
    return this.browser.downloadManager()
      .goto(this.nb.url + '/admin')
      .viewport(2014, 768)
      .type('#user_session_email', process.env['LOGIN'])
      .type('#user_session_password', process.env['PASSWORD'])
      .click('.submit-button')
  }

}

const nameForToday = () => {
  const d = new Date();
  const ds = moment().format('YYYY-MM-DD')
  return {
    name: `Daily snapshot ${ds}`,
    filename: `nb-snapshot-${ds}.db`
  }
}

export const createSnapshot = (name) => {
  const n = nameForToday()
  if (!name) {
    name = n.name
  }
  log(`Star t snapshot named ${name}`)
  const bot = new NBSnapper()
  bot.startSnapshot(name).then(r => log(`ok ${r}`))
}

export const fetchSnapshot = (name, filename) => {
  const n = nameForToday()
  if (!name) {
    name = n.name
  }
  if (!filename) {
    filename = n.filename
  }

  log(`Fetch snapshot named ${name} to ${filename}`)
  const bot = new NBSnapper()
  bot.fetchSnapshot(name, filename, !!args.options.D).then(() => {

    if (args.options.R) {
      return bot.restoreSnapshot(filename)
    }
  })
}


if (args.options.c) {
  let crontab = args.options.S || '0 0 5 * * *'
  let crontab2 = args.options.F || '0 0 7 * * *'
  new CronJob(crontab, createSnapshot, null, true, 'Europe/Warsaw')
  new CronJob(crontab2, fetchSnapshot, null, true, 'Europe/Warsaw')
}

if (args.options.s) {
  createSnapshot(args.options.n)
}


if (args.options.f) {
  fetchSnapshot(args.options.n, args.options.N)
}


if (args.options.r) {
  const bot = new NBSnapper()
  bot.restoreSnapshot(args.options.N)
}
