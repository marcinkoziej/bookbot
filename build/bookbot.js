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
        to: process.env['TO'],
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2Jvb2tib3QuanMiXSwibmFtZXMiOlsiY29uZmlnIiwibG9nIiwiYXJncyIsImNyZWF0ZSIsImJpbmRIZWxwIiwicGFyc2VTeXN0ZW0iLCJCb29rYm90IiwibWFpbGVyIiwiY3JlYXRlVHJhbnNwb3J0IiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJwb3J0Iiwic2VjdXJlIiwiYXV0aCIsInVzZXIiLCJwYXNzIiwiYnJvd3NlciIsInNob3ciLCJmaWxlcGF0aCIsIm1zZyIsInNlbmRlciIsImZyb20iLCJ0byIsInN1YmplY3QiLCJodG1sIiwiYXR0YWNobWVudHMiLCJmaWxlbmFtZSIsImJhc2VuYW1lIiwicGF0aCIsInByb21pc2UiLCJvayIsImZhaWwiLCJzZW5kTWFpbCIsImVyciIsImluZm8iLCJmb3JtYXQiLCJvbmNlIiwic3RhdGUiLCJkb3dubG9hZEl0ZW0iLCJlbWl0IiwiZG93bmxvYWRNYW5hZ2VyIiwiZ290byIsInZpZXdwb3J0IiwidHlwZSIsImNsaWNrIiwid2FpdCIsIndhaXREb3dubG9hZHNDb21wbGV0ZSIsImVuZCIsInRoZW4iLCJtb3JuaW5nR2F6ZXRhIiwiYm90IiwiZ2V0R2F6ZXRhIiwic2VuZEF0dGFjaG1lbnQiLCJmbiIsImNvbnNvbGUiLCJzdW5kYXlUeWdvZG5payIsImdldFR5Z29kbmlrIiwib3B0aW9ucyIsImciLCJ0IiwiYyIsImdhemV0YVN0ciIsIkciLCJ0eWdvZG5pa1N0ciIsIlQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7O0FBRUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7Ozs7Ozs7QUFUQSxpQkFBT0EsTUFBUDs7O0FBV0EsSUFBTUMsTUFBTSxxQkFBTSxTQUFOLENBQVo7QUFDQSxJQUFNQyxPQUFPLHFCQUFPQyxNQUFQLENBQWMsQ0FDekIsQ0FBQyxHQUFELEVBQU0sRUFBTixFQUFVLFNBQVYsQ0FEeUIsRUFFekIsQ0FBQyxH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c0NvbnRlbnQiOlsiaW1wb3J0IGRvdGVudiBmcm9tICdkb3RlbnYnXG5kb3RlbnYuY29uZmlnKClcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50J1xuaW1wb3J0IG5vZGVtYWlsZXIgZnJvbSAnbm9kZW1haWxlcidcbmltcG9ydCBuaWdodG1hcmUgZnJvbSAnbmlnaHRtYXJlJ1xuaW1wb3J0IG5pZ2h0bWFyZURvd25sb2FkTWFuYWdlciBmcm9tICduaWdodG1hcmUtZG93bmxvYWQtbWFuYWdlcidcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnXG5pbXBvcnQgd2hlbiBmcm9tICd3aGVuJ1xuaW1wb3J0IHtDcm9uSm9ifSBmcm9tICdjcm9uJ1xuaW1wb3J0IGdldG9wdCBmcm9tICdub2RlLWdldG9wdCdcblxuY29uc3QgbG9nID0gZGVidWcoJ2Jvb2tib3QnKVxuY29uc3QgYXJncyA9IGdldG9wdC5jcmVhdGUoW1xuICBbJ2cnLCAnJywgJ3J1biBub3cnXSxcbiAgWyd0JywgJycsICdydW4gbm93J10sXG4gIFsnYycsICcnLCAncnVuIGNyb24nXSxcbiAgWydUJywgJz0nLCAnY3JvbiBzdHJpbmcnXSwgXG4gIFsnRycsICc9JywgJ2Nyb24gc3RyaW5nJ10sIFxuXSkuYmluZEhlbHAoKS5wYXJzZVN5c3RlbSgpXG5cbm5pZ2h0bWFyZURvd25sb2FkTWFuYWdlcihuaWdodG1hcmUpXG5cbmV4cG9ydCBjbGFzcyBCb29rYm90IHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5tYWlsZXIgPSBub2RlbWFpbGVyLmNyZWF0ZVRyYW5zcG9ydCh7XG4gICAgICBob3N0OiBwcm9jZXNzLmVudlsnU01UUF9TRVJWRVInXSxcbiAgICAgIHBvcnQ6IDU4NyxcbiAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICBhdXRoOiB7XG4gICAgICAgIHVzZXI6IHByb2Nlc3MuZW52WydFTUFJTCddLFxuICAgICAgICBwYXNzOiBwcm9jZXNzLmVudlsnU01UUF9QQVNTV09SRCddXG4gICAgICB9XG4gICAgfSlcbiAgICB0aGlzLmJyb3dzZXIgPSBuZXcgbmlnaHRtYXJlKHtzaG93OiAhKHByb2Nlc3MuZW52WydESVNQTEFZJ109PT1udWxsKX0pO1xuXG4gIH1cblxuICBzZW5kQXR0YWNobWVudChmaWxlcGF0aCkge1xuICAgIGxvZyhgc2VuZCBhdHRhY2htZW50ICR7ZmlsZXBhdGh9YClcbiAgICBjb25zdCBtc2cgPSB7XG4gICAgICBzZW5kZXI6IHByb2Nlc3MuZW52WydFTUFJTCddLFxuICAgICAgZnJvbTogYEFrY2phIEJvdCA8JHtwcm9jZXNzLmVudlsnRU1BSUwnXX0+YCxcbiAgICAgIHRvOiBwcm9jZXNzLmVudlsnVE8nXSxcbiAgICAgIHN1YmplY3Q6ICdEemlzaWVqc3phIGdhemV0YScsXG4gICAgICBodG1sOiAnVyB6YcWCxIVjem5rdSBkemlzaWVqc3phIGdhemV0YSAmbHQ7MycsXG4gICAgICBhdHRhY2htZW50czoge1xuICAgICAgICBmaWxlbmFtZTogcGF0aC5iYXNlbmFtZShmaWxlcGF0aCksXG4gICAgICAgIHBhdGg6IGZpbGVwYXRoXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB3aGVuLnByb21pc2UoKG9rLCBmYWlsKSA9PiB7XG4gICAgICB0aGlzLm1haWxlci5zZW5kTWFpbChtc2csIChlcnIsIGluZm8pID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGxvZyhlcnIpXG4gICAgICAgICAgcmV0dXJuIGZhaWwoZXJyKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvaygpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBnZXRHYXpldGEoKSB7XG4gICAgY29uc3QgZmlsZW5hbWUgPSBgLi9nYXpldGEtJHttb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKX0ubW9iaWBcbiAgICB0aGlzLmJyb3dzZXIub25jZSgnZG93bmxvYWQnLCAoc3RhdGUsIGRvd25sb2FkSXRlbSkgPT4ge1xuICAgICAgaWYoc3RhdGUgPT0gJ3N0YXJ0ZWQnKXtcbiAgICAgICAgbG9nKGBkb3dubG9hZCBzdGFydGVkIHRvICR7ZmlsZW5hbWV9YClcbiAgICAgICAgdGhpcy5icm93c2VyLmVtaXQoJ2Rvd25sb2FkJywgZmlsZW5hbWUsIGRvd25sb2FkSXRlbSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuYnJvd3Nlci5kb3dubG9hZE1hbmFnZXIoKVxuICAgICAgLmdvdG8oJ2h0dHBzOi8vd3d3LnB1Ymxpby5wbC9rbGllbnQvbG9nb3dhbmllLmh0bWwnKVxuICAgICAgLnZpZXdwb3J0KDIwMTQsIDc2OClcbiAgICAgIC50eXBlKCcjal91c2VybmFtZScsIHByb2Nlc3MuZW52WydMT0dJTiddKVxuICAgICAgLnR5cGUoJyNqX3Bhc3N3b3JkJywgcHJvY2Vzcy5lbnZbJ1BBU1NXT1JEJ10pXG4gICAgICAuY2xpY2soJy5idG4tbG9naW4nKVxuICAgICAgLndhaXQoMTAwMClcbiAgICAgIC53YWl0KCdhLnVzZXJuYW1lJylcbiAgICAgIC5nb3RvKFwiaHR0cHM6Ly93d3cucHVibGlvLnBsL2tsaWVudC9wdWJsaWthY2plLmh0bWw/cHJlc3NUaXRsZT05MTQxN1wiKVxuICAgICAgLndhaXQoJy5kb3dubG9hZFN0YXR1cycpXG4gICAgICAuY2xpY2soJy5kb3dubG9hZFN0YXR1cyAuYnRuLXNpbXBsZScpXG4gICAgICAud2FpdCgnLnByb2R1Y3REb3dubG9hZEluZm8nKVxuICAgICAgLmNsaWNrKFwiaW5wdXRbbmFtZV49J2Rvd25sb2FkUGFja2FnZSddW3ZhbHVlPSc2J11cIilcbiAgICAgIC5jbGljaygnLmJ0bi1zaW1wbGUubVIxMCcpXG4gICAgICAud2FpdERvd25sb2Fkc0NvbXBsZXRlKClcbiAgICAgIC5lbmQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgICAgfSlcbiAgfVxuXG4gIGdldFR5Z29kbmlrKCkge1xuICAgIGNvbnN0IGZpbGVuYW1lID0gYC4vdHlnb2RuaWstJHttb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKX0ubW9iaWBcbiAgICB0aGlzLmJyb3dzZXIub25jZSgnZG93bmxvYWQnLCAoc3RhdGUsIGRvd25sb2FkSXRlbSkgPT4ge1xuICAgICAgaWYoc3RhdGUgPT0gJ3N0YXJ0ZWQnKXtcbiAgICAgICAgbG9nKGBkb3dubG9hZCBzdGFydGVkIHRvICR7ZmlsZW5hbWV9YClcbiAgICAgICAgdGhpcy5icm93c2VyLmVtaXQoJ2Rvd25sb2FkJywgZmlsZW5hbWUsIGRvd25sb2FkSXRlbSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuYnJvd3Nlci5kb3dubG9hZE1hbmFnZXIoKVxuICAgICAgLmdvdG8oJ2h0dHBzOi8vd3d3LnB1Ymxpby5wbC9rbGllbnQvbG9nb3dhbmllLmh0bWwnKVxuICAgICAgLnZpZXdwb3J0KDIwMTQsIDc2OClcbiAgICAgIC50eXBlKCcjal91c2VybmFtZScsIHByb2Nlc3MuZW52WydMT0dJTiddKVxuICAgICAgLnR5cGUoJyNqX3Bhc3N3b3JkJywgcHJvY2Vzcy5lbnZbJ1BBU1NXT1JEJ10pXG4gICAgICAuY2xpY2soJy5idG4tbG9naW4nKVxuICAgICAgLndhaXQoMTAwMClcbiAgICAgIC53YWl0KCdhLnVzZXJuYW1lJylcbiAgICAgIC5nb3RvKFwiaHR0cHM6Ly93d3cucHVibGlvLnBsL2tsaWVudC9wdWJsaWthY2plLmh0bWw/cHJlc3NUaXRsZT05NDU0MlwiKVxuICAgICAgLndhaXQoJy5kb3dubG9hZFN0YXR1cycpXG4gICAgICAuY2xpY2soJy5kb3dubG9hZFN0YXR1cyAuYnRuLXNpbXBsZScpXG4gICAgICAud2FpdCgnLnByb2R1Y3REb3dubG9hZEluZm8nKVxuICAgICAgLmNsaWNrKFwiaW5wdXRbbmFtZV49J2Rvd25sb2FkUGFja2FnZSddW3ZhbHVlPSc2J11cIilcbiAgICAgIC5jbGljaygnLmJ0bi1zaW1wbGUubVIxMCcpXG4gICAgICAud2FpdERvd25sb2Fkc0NvbXBsZXRlKClcbiAgICAgIC5lbmQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgICAgfSlcbiAgfVxuXG59XG5cbmV4cG9ydCBjb25zdCBtb3JuaW5nR2F6ZXRhID0gKCkgPT4ge1xuICBsb2coJ21vcm5pbmdHYXpldGEgam9iIHN0YXJ0ZWQnKVxuICBjb25zdCBib3QgPSBuZXcgQm9va2JvdCgpXG4gIGJvdC5nZXRHYXpldGEoKVxuICAgIC50aGVuKGZuID0+IGJvdC5zZW5kQXR0YWNobWVudChmbikpXG4gICAgLnRoZW4oeCA9PiBjb25zb2xlLmluZm8oJ01vcm5pbmcgR2F6ZXRhIGRlbGl2ZXJlZCEnKSlcbn1cblxuZXhwb3J0IGNvbnN0IHN1bmRheVR5Z29kbmlrID0gKCkgPT4ge1xuICBsb2coJ3N1bmRheVR5Z29kbmlrIGpvYiBzdGFydGVkJylcbiAgY29uc3QgYm90ID0gbmV3IEJvb2tib3QoKVxuICBib3QuZ2V0VHlnb2RuaWsoKVxuICAgIC50aGVuKGZuID0+IGJvdC5zZW5kQXR0YWNobWVudChmbikpXG4gICAgLnRoZW4oeCA9PiBjb25zb2xlLmluZm8oJ1N1bmRheSBUeWdvZG5payBkZWxpdmVyZWQhJykpXG59XG5cbmlmIChhcmdzLm9wdGlvbnMuZykge1xuICBtb3JuaW5nR2F6ZXRhKClcbn1cblxuaWYgKGFyZ3Mub3B0aW9ucy50KSB7XG4gIHN1bmRheVR5Z29kbmlrKClcbn1cblxuaWYgKGFyZ3Mub3B0aW9ucy5jKSB7XG4gIGxldCBnYXpldGFTdHIgPSBhcmdzLm9wdGlvbnMuRyB8fCAnMCAwIDcgKiAqIConXG4gIGxldCB0eWdvZG5pa1N0ciA9IGFyZ3Mub3B0aW9ucy5UIHx8ICcwIDMwIDcgKiAqIDAnXG4gIGNvbnNvbGUubG9nKGBnYXpldGEgc2NoZWR1bGUgJHtnYXpldGFTdHJ9YClcbiAgbmV3IENyb25Kb2IoZ2F6ZXRhU3RyLCBtb3JuaW5nR2F6ZXRhLCBudWxsLCB0cnVlLCAnRXVyb3BlL1dhcnNhdycpXG4gIGNvbnNvbGUubG9nKGB0eWdvZG5payBzY2hlZHVsZSAke3R5Z29kbmlrU3RyfWApXG4gIG5ldyBDcm9uSm9iKHR5Z29kbmlrU3RyLCBzdW5kYXlUeWdvZG5paywgbnVsbCwgdHJ1ZSwgJ0V1cm9wZS9XYXJzYXcnKVxufVxuIl19