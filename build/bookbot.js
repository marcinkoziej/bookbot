'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sundayTygodnik = exports.morningGazeta = exports.Bookbot = undefined;

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


var log = (0, _debug2.default)('bookbot');
var args = _nodeGetopt2.default.create([['g', '', 'run now'], ['t', '', 'run now'], ['c', '', 'run cron'], ['T', '=', 'cron string'], ['G', '=', 'cron string']]).bindHelp().parseSystem();

(0, _nightmareDownloadManager2.default)(_nightmare2.default);

var Bookbot = exports.Bookbot = function () {
  function Bookbot() {
    _classCallCheck(this, Bookbot);

    this.mailer = _nodemailer2.default.createTransport({
      host: process.env['SMTP_SERVER'],
      port: 587,
      secure: false,
      auth: {
        user: process.env['SMTP_USERNAME'],
        pass: process.env['SMTP_PASSWORD']
      }
    });
    this.browser = new _nightmare2.default({ show: !(process.env['DISPLAY'] === null) });
  }

  _createClass(Bookbot, [{
    key: 'sendAttachment',
    value: function sendAttachment(filepath) {
      var _this = this;

      log('send attachment ' + filepath);
      var msg = {
        sender: process.env['EMAIL'],
        from: 'Bot z gazetami <' + process.env['EMAIL'] + '>',
        bcc: process.env['TO'],
        subject: 'Dzisiejsza gazeta',
        html: 'W załącznku dzisiejsza gazeta &lt;3',
        attachments: {
          filename: _path2.default.basename(filepath),
          path: filepath
        }
      };
      return _when2.default.promise(function (ok, fail) {
        _this.mailer.sendMail(msg, function (err, info) {
          if (err) {
            log(err);
            return fail(err);
          }
          return ok();
        });
      });
    }
  }, {
    key: 'getGazeta',
    value: function getGazeta() {
      var _this2 = this;

      var filename = './gazeta-' + (0, _moment2.default)().format('YYYY-MM-DD') + '.mobi';
      this.browser.once('download', function (state, downloadItem) {
        if (state == 'started') {
          log('download started to ' + filename);
          _this2.browser.emit('download', filename, downloadItem);
        }
      });
      return this.browser.downloadManager().goto('https://www.publio.pl/klient/logowanie.html').viewport(2014, 768).type('#j_username', process.env['LOGIN']).type('#j_password', process.env['PASSWORD']).click('.btn-login').wait(1000).wait('a.username').goto("https://www.publio.pl/klient/publikacje.html?pressTitle=91417").wait('.downloadStatus').click('.downloadStatus .btn-simple').wait('.productDownloadInfo').click("input[name^='downloadPackage'][value='6']").click('.btn-simple.mR10').waitDownloadsComplete().end().then(function () {
        return filename;
      });
    }
  }, {
    key: 'getTygodnik',
    value: function getTygodnik() {
      var _this3 = this;

      var filename = './tygodnik-' + (0, _moment2.default)().format('YYYY-MM-DD') + '.mobi';
      this.browser.once('download', function (state, downloadItem) {
        if (state == 'started') {
          log('download started to ' + filename);
          _this3.browser.emit('download', filename, downloadItem);
        }
      });
      return this.browser.downloadManager().goto('https://www.publio.pl/klient/logowanie.html').viewport(2014, 768).type('#j_username', process.env['LOGIN']).type('#j_password', process.env['PASSWORD']).click('.btn-login').wait(1000).wait('a.username').goto("https://www.publio.pl/klient/publikacje.html?pressTitle=94542").wait('.downloadStatus').click('.downloadStatus .btn-simple').wait('.productDownloadInfo').click("input[name^='downloadPackage'][value='6']").click('.btn-simple.mR10').waitDownloadsComplete().end().then(function () {
        return filename;
      });
    }
  }]);

  return Bookbot;
}();

var morningGazeta = exports.morningGazeta = function morningGazeta() {
  log('morningGazeta job started');
  var bot = new Bookbot();
  bot.getGazeta().then(function (fn) {
    return bot.sendAttachment(fn);
  }).then(function (x) {
    return console.info('Morning Gazeta delivered!');
  });
};

var sundayTygodnik = exports.sundayTygodnik = function sundayTygodnik() {
  log('sundayTygodnik job started');
  var bot = new Bookbot();
  bot.getTygodnik().then(function (fn) {
    return bot.sendAttachment(fn);
  }).then(function (x) {
    return console.info('Sunday Tygodnik delivered!');
  });
};

if (args.options.g) {
  morningGazeta();
}

if (args.options.t) {
  sundayTygodnik();
}

if (args.options.c) {
  var gazetaStr = args.options.G || '0 0 7 * * 1-6';
  var tygodnikStr = args.options.T || '0 30 7 * * 0';
  console.log('gazeta schedule ' + gazetaStr);
  new _cron.CronJob(gazetaStr, morningGazeta, null, true, 'Europe/Warsaw');
  console.log('tygodnik schedule ' + tygodnikStr);
  new _cron.CronJob(tygodnikStr, sundayTygodnik, null, true, 'Europe/Warsaw');
}