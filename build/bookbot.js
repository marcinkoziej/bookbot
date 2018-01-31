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
        user: process.env['EMAIL'],
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
        from: 'Akcja Bot <' + process.env['EMAIL'] + '>',
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
  var gazetaStr = args.options.G || '0 0 7 * * *';
  var tygodnikStr = args.options.T || '0 30 7 * * 0';
  console.log('gazeta schedule ' + gazetaStr);
  new _cron.CronJob(gazetaStr, morningGazeta, null, true, 'Europe/Warsaw');
  console.log('tygodnik schedule ' + tygodnikStr);
  new _cron.CronJob(tygodnikStr, sundayTygodnik, null, true, 'Europe/Warsaw');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2Jvb2tib3QuanMiXSwibmFtZXMiOlsiY29uZmlnIiwibG9nIiwiYXJncyIsImNyZWF0ZSIsImJpbmRIZWxwIiwicGFyc2VTeXN0ZW0iLCJCb29rYm90IiwibWFpbGVyIiwiY3JlYXRlVHJhbnNwb3J0IiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJwb3J0Iiwic2VjdXJlIiwiYXV0aCIsInVzZXIiLCJwYXNzIiwiYnJvd3NlciIsInNob3ciLCJmaWxlcGF0aCIsIm1zZyIsInNlbmRlciIsImZyb20iLCJiY2MiLCJzdWJqZWN0IiwiaHRtbCIsImF0dGFjaG1lbnRzIiwiZmlsZW5hbWUiLCJiYXNlbmFtZSIsInBhdGgiLCJwcm9taXNlIiwib2siLCJmYWlsIiwic2VuZE1haWwiLCJlcnIiLCJpbmZvIiwiZm9ybWF0Iiwib25jZSIsInN0YXRlIiwiZG93bmxvYWRJdGVtIiwiZW1pdCIsImRvd25sb2FkTWFuYWdlciIsImdvdG8iLCJ2aWV3cG9ydCIsInR5cGUiLCJjbGljayIsIndhaXQiLCJ3YWl0RG93bmxvYWRzQ29tcGxldGUiLCJlbmQiLCJ0aGVuIiwibW9ybmluZ0dhemV0YSIsImJvdCIsImdldEdhemV0YSIsInNlbmRBdHRhY2htZW50IiwiZm4iLCJjb25zb2xlIiwic3VuZGF5VHlnb2RuaWsiLCJnZXRUeWdvZG5payIsIm9wdGlvbnMiLCJnIiwidCIsImMiLCJnYXpldGFTdHIiLCJHIiwidHlnb2RuaWtTdHIiLCJUIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7OztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7Ozs7O0FBVEEsaUJBQU9BLE1BQVA7OztBQVdBLElBQU1DLE1BQU0scUJBQU0sU0FBTixDQUFaO0FBQ0EsSUFBTUMsT0FBTyxxQkFBT0MsTUFBUCxDQUFjLENBQ3pCLENBQUMsR0FBRCxFQUFNLEVBQU4sRUFBVSxTQUFWLENBRHlCLEVBRXpCLENBQUMs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ZXNDb250ZW50IjpbImltcG9ydCBkb3RlbnYgZnJvbSAnZG90ZW52J1xuZG90ZW52LmNvbmZpZygpXG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCdcbmltcG9ydCBub2RlbWFpbGVyIGZyb20gJ25vZGVtYWlsZXInXG5pbXBvcnQgbmlnaHRtYXJlIGZyb20gJ25pZ2h0bWFyZSdcbmltcG9ydCBuaWdodG1hcmVEb3dubG9hZE1hbmFnZXIgZnJvbSAnbmlnaHRtYXJlLWRvd25sb2FkLW1hbmFnZXInXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IGRlYnVnIGZyb20gJ2RlYnVnJ1xuaW1wb3J0IHdoZW4gZnJvbSAnd2hlbidcbmltcG9ydCB7Q3JvbkpvYn0gZnJvbSAnY3JvbidcbmltcG9ydCBnZXRvcHQgZnJvbSAnbm9kZS1nZXRvcHQnXG5cbmNvbnN0IGxvZyA9IGRlYnVnKCdib29rYm90JylcbmNvbnN0IGFyZ3MgPSBnZXRvcHQuY3JlYXRlKFtcbiAgWydnJywgJycsICdydW4gbm93J10sXG4gIFsndCcsICcnLCAncnVuIG5vdyddLFxuICBbJ2MnLCAnJywgJ3J1biBjcm9uJ10sXG4gIFsnVCcsICc9JywgJ2Nyb24gc3RyaW5nJ10sIFxuICBbJ0cnLCAnPScsICdjcm9uIHN0cmluZyddLCBcbl0pLmJpbmRIZWxwKCkucGFyc2VTeXN0ZW0oKVxuXG5uaWdodG1hcmVEb3dubG9hZE1hbmFnZXIobmlnaHRtYXJlKVxuXG5leHBvcnQgY2xhc3MgQm9va2JvdCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubWFpbGVyID0gbm9kZW1haWxlci5jcmVhdGVUcmFuc3BvcnQoe1xuICAgICAgaG9zdDogcHJvY2Vzcy5lbnZbJ1NNVFBfU0VSVkVSJ10sXG4gICAgICBwb3J0OiA1ODcsXG4gICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgYXV0aDoge1xuICAgICAgICB1c2VyOiBwcm9jZXNzLmVudlsnRU1BSUwnXSxcbiAgICAgICAgcGFzczogcHJvY2Vzcy5lbnZbJ1NNVFBfUEFTU1dPUkQnXVxuICAgICAgfVxuICAgIH0pXG4gICAgdGhpcy5icm93c2VyID0gbmV3IG5pZ2h0bWFyZSh7c2hvdzogIShwcm9jZXNzLmVudlsnRElTUExBWSddPT09bnVsbCl9KTtcblxuICB9XG5cbiAgc2VuZEF0dGFjaG1lbnQoZmlsZXBhdGgpIHtcbiAgICBsb2coYHNlbmQgYXR0YWNobWVudCAke2ZpbGVwYXRofWApXG4gICAgY29uc3QgbXNnID0ge1xuICAgICAgc2VuZGVyOiBwcm9jZXNzLmVudlsnRU1BSUwnXSxcbiAgICAgIGZyb206IGBBa2NqYSBCb3QgPCR7cHJvY2Vzcy5lbnZbJ0VNQUlMJ119PmAsXG4gICAgICBiY2M6IHByb2Nlc3MuZW52WydUTyddLFxuICAgICAgc3ViamVjdDogJ0R6aXNpZWpzemEgZ2F6ZXRhJyxcbiAgICAgIGh0bWw6ICdXIHphxYLEhWN6bmt1IGR6aXNpZWpzemEgZ2F6ZXRhICZsdDszJyxcbiAgICAgIGF0dGFjaG1lbnRzOiB7XG4gICAgICAgIGZpbGVuYW1lOiBwYXRoLmJhc2VuYW1lKGZpbGVwYXRoKSxcbiAgICAgICAgcGF0aDogZmlsZXBhdGhcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHdoZW4ucHJvbWlzZSgob2ssIGZhaWwpID0+IHtcbiAgICAgIHRoaXMubWFpbGVyLnNlbmRNYWlsKG1zZywgKGVyciwgaW5mbykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgbG9nKGVycilcbiAgICAgICAgICByZXR1cm4gZmFpbChlcnIpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9rKClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGdldEdhemV0YSgpIHtcbiAgICBjb25zdCBmaWxlbmFtZSA9IGAuL2dhemV0YS0ke21vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpfS5tb2JpYFxuICAgIHRoaXMuYnJvd3Nlci5vbmNlKCdkb3dubG9hZCcsIChzdGF0ZSwgZG93bmxvYWRJdGVtKSA9PiB7XG4gICAgICBpZihzdGF0ZSA9PSAnc3RhcnRlZCcpe1xuICAgICAgICBsb2coYGRvd25sb2FkIHN0YXJ0ZWQgdG8gJHtmaWxlbmFtZX1gKVxuICAgICAgICB0aGlzLmJyb3dzZXIuZW1pdCgnZG93bmxvYWQnLCBmaWxlbmFtZSwgZG93bmxvYWRJdGVtKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5icm93c2VyLmRvd25sb2FkTWFuYWdlcigpXG4gICAgICAuZ290bygnaHR0cHM6Ly93d3cucHVibGlvLnBsL2tsaWVudC9sb2dvd2FuaWUuaHRtbCcpXG4gICAgICAudmlld3BvcnQoMjAxNCwgNzY4KVxuICAgICAgLnR5cGUoJyNqX3VzZXJuYW1lJywgcHJvY2Vzcy5lbnZbJ0xPR0lOJ10pXG4gICAgICAudHlwZSgnI2pfcGFzc3dvcmQnLCBwcm9jZXNzLmVudlsnUEFTU1dPUkQnXSlcbiAgICAgIC5jbGljaygnLmJ0bi1sb2dpbicpXG4gICAgICAud2FpdCgxMDAwKVxuICAgICAgLndhaXQoJ2EudXNlcm5hbWUnKVxuICAgICAgLmdvdG8oXCJodHRwczovL3d3dy5wdWJsaW8ucGwva2xpZW50L3B1Ymxpa2FjamUuaHRtbD9wcmVzc1RpdGxlPTkxNDE3XCIpXG4gICAgICAud2FpdCgnLmRvd25sb2FkU3RhdHVzJylcbiAgICAgIC5jbGljaygnLmRvd25sb2FkU3RhdHVzIC5idG4tc2ltcGxlJylcbiAgICAgIC53YWl0KCcucHJvZHVjdERvd25sb2FkSW5mbycpXG4gICAgICAuY2xpY2soXCJpbnB1dFtuYW1lXj0nZG93bmxvYWRQYWNrYWdlJ11bdmFsdWU9JzYnXVwiKVxuICAgICAgLmNsaWNrKCcuYnRuLXNpbXBsZS5tUjEwJylcbiAgICAgIC53YWl0RG93bmxvYWRzQ29tcGxldGUoKVxuICAgICAgLmVuZCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gZmlsZW5hbWU7XG4gICAgICB9KVxuICB9XG5cbiAgZ2V0VHlnb2RuaWsoKSB7XG4gICAgY29uc3QgZmlsZW5hbWUgPSBgLi90eWdvZG5pay0ke21vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpfS5tb2JpYFxuICAgIHRoaXMuYnJvd3Nlci5vbmNlKCdkb3dubG9hZCcsIChzdGF0ZSwgZG93bmxvYWRJdGVtKSA9PiB7XG4gICAgICBpZihzdGF0ZSA9PSAnc3RhcnRlZCcpe1xuICAgICAgICBsb2coYGRvd25sb2FkIHN0YXJ0ZWQgdG8gJHtmaWxlbmFtZX1gKVxuICAgICAgICB0aGlzLmJyb3dzZXIuZW1pdCgnZG93bmxvYWQnLCBmaWxlbmFtZSwgZG93bmxvYWRJdGVtKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5icm93c2VyLmRvd25sb2FkTWFuYWdlcigpXG4gICAgICAuZ290bygnaHR0cHM6Ly93d3cucHVibGlvLnBsL2tsaWVudC9sb2dvd2FuaWUuaHRtbCcpXG4gICAgICAudmlld3BvcnQoMjAxNCwgNzY4KVxuICAgICAgLnR5cGUoJyNqX3VzZXJuYW1lJywgcHJvY2Vzcy5lbnZbJ0xPR0lOJ10pXG4gICAgICAudHlwZSgnI2pfcGFzc3dvcmQnLCBwcm9jZXNzLmVudlsnUEFTU1dPUkQnXSlcbiAgICAgIC5jbGljaygnLmJ0bi1sb2dpbicpXG4gICAgICAud2FpdCgxMDAwKVxuICAgICAgLndhaXQoJ2EudXNlcm5hbWUnKVxuICAgICAgLmdvdG8oXCJodHRwczovL3d3dy5wdWJsaW8ucGwva2xpZW50L3B1Ymxpa2FjamUuaHRtbD9wcmVzc1RpdGxlPTk0NTQyXCIpXG4gICAgICAud2FpdCgnLmRvd25sb2FkU3RhdHVzJylcbiAgICAgIC5jbGljaygnLmRvd25sb2FkU3RhdHVzIC5idG4tc2ltcGxlJylcbiAgICAgIC53YWl0KCcucHJvZHVjdERvd25sb2FkSW5mbycpXG4gICAgICAuY2xpY2soXCJpbnB1dFtuYW1lXj0nZG93bmxvYWRQYWNrYWdlJ11bdmFsdWU9JzYnXVwiKVxuICAgICAgLmNsaWNrKCcuYnRuLXNpbXBsZS5tUjEwJylcbiAgICAgIC53YWl0RG93bmxvYWRzQ29tcGxldGUoKVxuICAgICAgLmVuZCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gZmlsZW5hbWU7XG4gICAgICB9KVxuICB9XG5cbn1cblxuZXhwb3J0IGNvbnN0IG1vcm5pbmdHYXpldGEgPSAoKSA9PiB7XG4gIGxvZygnbW9ybmluZ0dhemV0YSBqb2Igc3RhcnRlZCcpXG4gIGNvbnN0IGJvdCA9IG5ldyBCb29rYm90KClcbiAgYm90LmdldEdhemV0YSgpXG4gICAgLnRoZW4oZm4gPT4gYm90LnNlbmRBdHRhY2htZW50KGZuKSlcbiAgICAudGhlbih4ID0+IGNvbnNvbGUuaW5mbygnTW9ybmluZyBHYXpldGEgZGVsaXZlcmVkIScpKVxufVxuXG5leHBvcnQgY29uc3Qgc3VuZGF5VHlnb2RuaWsgPSAoKSA9PiB7XG4gIGxvZygnc3VuZGF5VHlnb2RuaWsgam9iIHN0YXJ0ZWQnKVxuICBjb25zdCBib3QgPSBuZXcgQm9va2JvdCgpXG4gIGJvdC5nZXRUeWdvZG5paygpXG4gICAgLnRoZW4oZm4gPT4gYm90LnNlbmRBdHRhY2htZW50KGZuKSlcbiAgICAudGhlbih4ID0+IGNvbnNvbGUuaW5mbygnU3VuZGF5IFR5Z29kbmlrIGRlbGl2ZXJlZCEnKSlcbn1cblxuaWYgKGFyZ3Mub3B0aW9ucy5nKSB7XG4gIG1vcm5pbmdHYXpldGEoKVxufVxuXG5pZiAoYXJncy5vcHRpb25zLnQpIHtcbiAgc3VuZGF5VHlnb2RuaWsoKVxufVxuXG5pZiAoYXJncy5vcHRpb25zLmMpIHtcbiAgbGV0IGdhemV0YVN0ciA9IGFyZ3Mub3B0aW9ucy5HIHx8ICcwIDAgNyAqICogKidcbiAgbGV0IHR5Z29kbmlrU3RyID0gYXJncy5vcHRpb25zLlQgfHwgJzAgMzAgNyAqICogMCdcbiAgY29uc29sZS5sb2coYGdhemV0YSBzY2hlZHVsZSAke2dhemV0YVN0cn1gKVxuICBuZXcgQ3JvbkpvYihnYXpldGFTdHIsIG1vcm5pbmdHYXpldGEsIG51bGwsIHRydWUsICdFdXJvcGUvV2Fyc2F3JylcbiAgY29uc29sZS5sb2coYHR5Z29kbmlrIHNjaGVkdWxlICR7dHlnb2RuaWtTdHJ9YClcbiAgbmV3IENyb25Kb2IodHlnb2RuaWtTdHIsIHN1bmRheVR5Z29kbmlrLCBudWxsLCB0cnVlLCAnRXVyb3BlL1dhcnNhdycpXG59XG4iXX0=