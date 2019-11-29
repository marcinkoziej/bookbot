'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KrritBot = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _dotenv = require('dotenv');

var _dotenv2 = _interopRequireDefault(_dotenv);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _nodemailer = require('nodemailer');

var _nodemailer2 = _interopRequireDefault(_nodemailer);

var _nightmare = require('nightmare');

var _nightmare2 = _interopRequireDefault(_nightmare);

var _nightmareDownloadManager = require('nightmare-download-manager');

var _nightmareDownloadManager2 = _interopRequireDefault(_nightmareDownloadManager);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _when = require('when');

var _when2 = _interopRequireDefault(_when);

var _cron = require('cron');

var _nodeGetopt = require('node-getopt');

var _nodeGetopt2 = _interopRequireDefault(_nodeGetopt);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

_dotenv2.default.config();


var log = (0, _debug2.default)('krritbot');
var args = _nodeGetopt2.default.create([['c', '', 'run cron']]).bindHelp().parseSystem();

(0, _nightmareDownloadManager2.default)(_nightmare2.default);

var KrritBot = exports.KrritBot = function () {
  function KrritBot(program, rmail) {
    _classCallCheck(this, KrritBot);

    this.program = program;
    this.rmail = rmail;
    this.magicNumber = null;
    this.mailer = _nodemailer2.default.createTransport({
      host: process.env['SMTP_SERVER'],
      port: 587,
      secure: false,
      auth: {
        user: process.env['EMAIL'],
        pass: process.env['SMTP_PASSWORD']
      }
    });
    this.browser = new _nightmare2.default({ show: !(process.env['DISPLAY'] === null) });
  }

  // this function is sent to the browser


  _createClass(KrritBot, [{
    key: 'fillOut',
    value: function fillOut(label, value) {
      var inputId = $('label:contains(\'' + label + '\')').attr('for');
      var input = $('#' + inputId);

      if (input.length == 1) {
        input.val(value);
        return true;
      } else {
        return false;
      }
    }
  }, {
    key: 'complaint',
    value: function complaint() {
      var _this = this;

      return this.browser.goto('https://www.krrit.gov.pl/dla-abonentow-i-konsumentow/kontakt-i-formularze/skargi-i-wnioski/').viewport(1024, 968).wait(1000).then(function () {
        return _this.captcha();
      });
    }
  }, {
    key: 'captcha',
    value: function captcha() {
      var _this2 = this;

      return this.browser.evaluate(function () {
        var frame = document.getElementsByName('captcha')[0];
        return frame.contentWindow.document.querySelector('.captcha p').childNodes[0].nodeValue;
      }).then(function (puzzle) {
        console.log('mysterious puzzle is ' + puzzle);
        puzzle = puzzle.replace('x', '*');
        _this2.magicNumber = eval(puzzle);

        return _this2.fillOutFields();
      });
    }
  }, {
    key: 'fillOutFields',
    value: function fillOutFields() {
      var _this3 = this;

      var fields = {
        'Imię i nazwisko': this.rmail.firstname + ' ' + this.rmail.lastname,
        'ulica': this.rmail.address1 + ', ' + this.rmail.postcode + ', ' + this.rmail.town,
        'Adres e-mail': '' + this.rmail.email,
        'Nazwa programu': this.program.title,
        'Tytuł audycji': this.program.episode,
        'Data i godzina': this.program.date_time,
        'Treść skargi': this.rmail.subject ? this.rmail.subject + '\n' + this.rmail.body : this.rmail.body,
        'Kod obrazkowy': this.magicNumber
      };

      Object.keys(fields).reduce(function (p, field) {
        return p.then(function (results) {
          return _this3.browser.evaluate(_this3.fillOut, field, fields[field]).then(function (isFilled) {
            console.log('Filled ' + field + '? ' + isFilled);
            results.push(isFilled);
            return results;
          });
        });
      }, _when2.default.resolve([])).then(function (results) {
        console.log('results: ' + results);
        return _this3.browser.check('[name=Field_00019]'); //.end()
      });
    }
  }]);

  return KrritBot;
}();

if (args.options.c) {
  var gazetaStr = args.options.G || '0 0 7 * * *';
  var tygodnikStr = args.options.T || '0 30 7 * * 0';
  console.log('gazeta schedule ' + gazetaStr);
  new _cron.CronJob(gazetaStr, morningGazeta, null, true, 'Europe/Warsaw');
  console.log('tygodnik schedule ' + tygodnikStr);
  new _cron.CronJob(tygodnikStr, sundayTygodnik, null, true, 'Europe/Warsaw');
} else {
  var p = {
    title: 'Gumisie', episode: 'Atak trzmieli', date_time: '1 marca 2017'
  };
  var m = {
    firstname: 'Marcin', lastname: 'Koziej', postcode: '02-707', email: 'marcin@cahoots.pl',
    address1: 'Żurawia 24a / 8', town: 'Warszawa', body: 'Jestem niezadowolony'
  };
  var bot = new KrritBot(p, m);
  bot.complaint();
}