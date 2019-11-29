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

const log = debug('krritbot')
const args = getopt.create([
  ['c', '', 'run cron']
]).bindHelp().parseSystem()

nightmareDownloadManager(nightmare)

export class KrritBot {
  constructor(program, rmail) {
    this.program = program
    this.rmail = rmail
    this.magicNumber = null
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

  // this function is sent to the browser
  fillOut(label, value) {
    const inputId = $(`label:contains('${label}')`).attr('for')
    const input = $(`#${inputId}`)

    if (input.length == 1) {
      input.val(value)
      return true
    }  else {
      return false
    }
  }

  complaint() {
    return this.browser
      .goto('https://www.krrit.gov.pl/dla-abonentow-i-konsumentow/kontakt-i-formularze/skargi-i-wnioski/')
      .viewport(1024, 968)
      .wait(1000).then(() => this.captcha())
  }

  captcha() {
    return this.browser.evaluate(() => {
        const frame = document.getElementsByName('captcha')[0]
        return frame.contentWindow.document.querySelector('.captcha p').childNodes[0].nodeValue
      }).then((puzzle) => {
        console.log(`mysterious puzzle is ${puzzle}`)
        puzzle = puzzle.replace('x', '*')
        this.magicNumber = eval(puzzle)

        return this.fillOutFields()
      })
  }

  fillOutFields()
  {
    const fields = {
      'Imię i nazwisko': `${this.rmail.firstname} ${this.rmail.lastname}`,
      'ulica': `${this.rmail.address1}, ${this.rmail.postcode}, ${this.rmail.town}`,
      'Adres e-mail': `${this.rmail.email}`,
      'Nazwa programu': this.program.title,
      'Tytuł audycji': this.program.episode,
      'Data i godzina': this.program.date_time,
      'Treść skargi': (this.rmail.subject ? `${this.rmail.subject}\n${this.rmail.body}` : this.rmail.body),
      'Kod obrazkowy': this.magicNumber,
    }

    Object.keys(fields).reduce((p, field) => {
      return p.then((results) => {
        return this.browser.evaluate(this.fillOut, field, fields[field]).
          then(isFilled => {
            console.log(`Filled ${field}? ${isFilled}`)
            results.push(isFilled)
            return results
          })
      })
    }, when.resolve([])).then((results) => {
      console.log(`results: ${results}`)
      return this.browser.check('[name=Field_00019]') //.end()
    })
  }

}


if (args.options.c) {
  let gazetaStr = args.options.G || '0 0 7 * * *'
  let tygodnikStr = args.options.T || '0 30 7 * * 0'
  console.log(`gazeta schedule ${gazetaStr}`)
  new CronJob(gazetaStr, morningGazeta, null, true, 'Europe/Warsaw')
  console.log(`tygodnik schedule ${tygodnikStr}`)
  new CronJob(tygodnikStr, sundayTygodnik, null, true, 'Europe/Warsaw')
} else {
  const p = {
    title: 'Gumisie', episode: 'Atak trzmieli', date_time: '1 marca 2017'
  }
  const m = {
    firstname: 'Marcin', lastname: 'Komar', postcode: '00-123', email: 'marcin@aaaaaaa.xyz',
    address1: 'Kwiatowa 123', town: 'Warszawa', body: 'Jestem niezadowolony'
  }
  const bot = new KrritBot(p, m)
  bot.complaint()
}
