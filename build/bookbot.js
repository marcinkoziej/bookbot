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
  var gazetaStr = args.options.G || '0 0 7 * * 1-6';
  var tygodnikStr = args.options.T || '0 30 7 * * 0';
  console.log('gazeta schedule ' + gazetaStr);
  new _cron.CronJob(gazetaStr, morningGazeta, null, true, 'Europe/Warsaw');
  console.log('tygodnik schedule ' + tygodnikStr);
  new _cron.CronJob(tygodnikStr, sundayTygodnik, null, true, 'Europe/Warsaw');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9ib29rYm90LmpzIl0sIm5hbWVzIjpbImNvbmZpZyIsImxvZyIsImFyZ3MiLCJjcmVhdGUiLCJiaW5kSGVscCIsInBhcnNlU3lzdGVtIiwiQm9va2JvdCIsIm1haWxlciIsImNyZWF0ZVRyYW5zcG9ydCIsImhvc3QiLCJwcm9jZXNzIiwiZW52IiwicG9ydCIsInNlY3VyZSIsImF1dGgiLCJ1c2VyIiwicGFzcyIsImJyb3dzZXIiLCJzaG93IiwiZmlsZXBhdGgiLCJtc2ciLCJzZW5kZXIiLCJmcm9tIiwiYmNjIiwic3ViamVjdCIsImh0bWwiLCJhdHRhY2htZW50cyIsImZpbGVuYW1lIiwiYmFzZW5hbWUiLCJwYXRoIiwicHJvbWlzZSIsIm9rIiwiZmFpbCIsInNlbmRNYWlsIiwiZXJyIiwiaW5mbyIsImZvcm1hdCIsIm9uY2UiLCJzdGF0ZSIsImRvd25sb2FkSXRlbSIsImVtaXQiLCJkb3dubG9hZE1hbmFnZXIiLCJnb3RvIiwidmlld3BvcnQiLCJ0eXBlIiwiY2xpY2siLCJ3YWl0Iiwid2FpdERvd25sb2Fkc0NvbXBsZXRlIiwiZW5kIiwidGhlbiIsIm1vcm5pbmdHYXpldGEiLCJib3QiLCJnZXRHYXpldGEiLCJzZW5kQXR0YWNobWVudCIsImZuIiwiY29uc29sZSIsInN1bmRheVR5Z29kbmlrIiwiZ2V0VHlnb2RuaWsiLCJvcHRpb25zIiwiZyIsInQiLCJjIiwiZ2F6ZXRhU3RyIiwiRyIsInR5Z29kbmlrU3RyIiwiVCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7Ozs7OztBQVRBLGlCQUFPQSxNQUFQOzs7QUFXQSxJQUFNQyxNQUFNLHFCQUFNLFNBQU4sQ0FBWjtBQUNBLElBQU1DLE9BQU8scUJBQU9DLE1BQVAsQ0FBYyxDQUN6QixDQUFDLEdBQUQsRUFBTSxFQUFOLEVBQVUsU0FBVixDQUR5QixFQUV6QixD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b3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZG90ZW52IGZyb20gJ2RvdGVudidcbmRvdGVudi5jb25maWcoKVxuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5pbXBvcnQgbm9kZW1haWxlciBmcm9tICdub2RlbWFpbGVyJ1xuaW1wb3J0IG5pZ2h0bWFyZSBmcm9tICduaWdodG1hcmUnXG5pbXBvcnQgbmlnaHRtYXJlRG93bmxvYWRNYW5hZ2VyIGZyb20gJ25pZ2h0bWFyZS1kb3dubG9hZC1tYW5hZ2VyJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBkZWJ1ZyBmcm9tICdkZWJ1ZydcbmltcG9ydCB3aGVuIGZyb20gJ3doZW4nXG5pbXBvcnQge0Nyb25Kb2J9IGZyb20gJ2Nyb24nXG5pbXBvcnQgZ2V0b3B0IGZyb20gJ25vZGUtZ2V0b3B0J1xuXG5jb25zdCBsb2cgPSBkZWJ1ZygnYm9va2JvdCcpXG5jb25zdCBhcmdzID0gZ2V0b3B0LmNyZWF0ZShbXG4gIFsnZycsICcnLCAncnVuIG5vdyddLFxuICBbJ3QnLCAnJywgJ3J1biBub3cnXSxcbiAgWydjJywgJycsICdydW4gY3JvbiddLFxuICBbJ1QnLCAnPScsICdjcm9uIHN0cmluZyddLCBcbiAgWydHJywgJz0nLCAnY3JvbiBzdHJpbmcnXSwgXG5dKS5iaW5kSGVscCgpLnBhcnNlU3lzdGVtKClcblxubmlnaHRtYXJlRG93bmxvYWRNYW5hZ2VyKG5pZ2h0bWFyZSlcblxuZXhwb3J0IGNsYXNzIEJvb2tib3Qge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm1haWxlciA9IG5vZGVtYWlsZXIuY3JlYXRlVHJhbnNwb3J0KHtcbiAgICAgIGhvc3Q6IHByb2Nlc3MuZW52WydTTVRQX1NFUlZFUiddLFxuICAgICAgcG9ydDogNTg3LFxuICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIGF1dGg6IHtcbiAgICAgICAgdXNlcjogcHJvY2Vzcy5lbnZbJ0VNQUlMJ10sXG4gICAgICAgIHBhc3M6IHByb2Nlc3MuZW52WydTTVRQX1BBU1NXT1JEJ11cbiAgICAgIH1cbiAgICB9KVxuICAgIHRoaXMuYnJvd3NlciA9IG5ldyBuaWdodG1hcmUoe3Nob3c6ICEocHJvY2Vzcy5lbnZbJ0RJU1BMQVknXT09PW51bGwpfSk7XG5cbiAgfVxuXG4gIHNlbmRBdHRhY2htZW50KGZpbGVwYXRoKSB7XG4gICAgbG9nKGBzZW5kIGF0dGFjaG1lbnQgJHtmaWxlcGF0aH1gKVxuICAgIGNvbnN0IG1zZyA9IHtcbiAgICAgIHNlbmRlcjogcHJvY2Vzcy5lbnZbJ0VNQUlMJ10sXG4gICAgICBmcm9tOiBgQWtjamEgQm90IDwke3Byb2Nlc3MuZW52WydFTUFJTCddfT5gLFxuICAgICAgYmNjOiBwcm9jZXNzLmVudlsnVE8nXSxcbiAgICAgIHN1YmplY3Q6ICdEemlzaWVqc3phIGdhemV0YScsXG4gICAgICBodG1sOiAnVyB6YcWCxIVjem5rdSBkemlzaWVqc3phIGdhemV0YSAmbHQ7MycsXG4gICAgICBhdHRhY2htZW50czoge1xuICAgICAgICBmaWxlbmFtZTogcGF0aC5iYXNlbmFtZShmaWxlcGF0aCksXG4gICAgICAgIHBhdGg6IGZpbGVwYXRoXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB3aGVuLnByb21pc2UoKG9rLCBmYWlsKSA9PiB7XG4gICAgICB0aGlzLm1haWxlci5zZW5kTWFpbChtc2csIChlcnIsIGluZm8pID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGxvZyhlcnIpXG4gICAgICAgICAgcmV0dXJuIGZhaWwoZXJyKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvaygpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBnZXRHYXpldGEoKSB7XG4gICAgY29uc3QgZmlsZW5hbWUgPSBgLi9nYXpldGEtJHttb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKX0ubW9iaWBcbiAgICB0aGlzLmJyb3dzZXIub25jZSgnZG93bmxvYWQnLCAoc3RhdGUsIGRvd25sb2FkSXRlbSkgPT4ge1xuICAgICAgaWYoc3RhdGUgPT0gJ3N0YXJ0ZWQnKXtcbiAgICAgICAgbG9nKGBkb3dubG9hZCBzdGFydGVkIHRvICR7ZmlsZW5hbWV9YClcbiAgICAgICAgdGhpcy5icm93c2VyLmVtaXQoJ2Rvd25sb2FkJywgZmlsZW5hbWUsIGRvd25sb2FkSXRlbSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuYnJvd3Nlci5kb3dubG9hZE1hbmFnZXIoKVxuICAgICAgLmdvdG8oJ2h0dHBzOi8vd3d3LnB1Ymxpby5wbC9rbGllbnQvbG9nb3dhbmllLmh0bWwnKVxuICAgICAgLnZpZXdwb3J0KDIwMTQsIDc2OClcbiAgICAgIC50eXBlKCcjal91c2VybmFtZScsIHByb2Nlc3MuZW52WydMT0dJTiddKVxuICAgICAgLnR5cGUoJyNqX3Bhc3N3b3JkJywgcHJvY2Vzcy5lbnZbJ1BBU1NXT1JEJ10pXG4gICAgICAuY2xpY2soJy5idG4tbG9naW4nKVxuICAgICAgLndhaXQoMTAwMClcbiAgICAgIC53YWl0KCdhLnVzZXJuYW1lJylcbiAgICAgIC5nb3RvKFwiaHR0cHM6Ly93d3cucHVibGlvLnBsL2tsaWVudC9wdWJsaWthY2plLmh0bWw/cHJlc3NUaXRsZT05MTQxN1wiKVxuICAgICAgLndhaXQoJy5kb3dubG9hZFN0YXR1cycpXG4gICAgICAuY2xpY2soJy5kb3dubG9hZFN0YXR1cyAuYnRuLXNpbXBsZScpXG4gICAgICAud2FpdCgnLnByb2R1Y3REb3dubG9hZEluZm8nKVxuICAgICAgLmNsaWNrKFwiaW5wdXRbbmFtZV49J2Rvd25sb2FkUGFja2FnZSddW3ZhbHVlPSc2J11cIilcbiAgICAgIC5jbGljaygnLmJ0bi1zaW1wbGUubVIxMCcpXG4gICAgICAud2FpdERvd25sb2Fkc0NvbXBsZXRlKClcbiAgICAgIC5lbmQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgICAgfSlcbiAgfVxuXG4gIGdldFR5Z29kbmlrKCkge1xuICAgIGNvbnN0IGZpbGVuYW1lID0gYC4vdHlnb2RuaWstJHttb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKX0ubW9iaWBcbiAgICB0aGlzLmJyb3dzZXIub25jZSgnZG93bmxvYWQnLCAoc3RhdGUsIGRvd25sb2FkSXRlbSkgPT4ge1xuICAgICAgaWYoc3RhdGUgPT0gJ3N0YXJ0ZWQnKXtcbiAgICAgICAgbG9nKGBkb3dubG9hZCBzdGFydGVkIHRvICR7ZmlsZW5hbWV9YClcbiAgICAgICAgdGhpcy5icm93c2VyLmVtaXQoJ2Rvd25sb2FkJywgZmlsZW5hbWUsIGRvd25sb2FkSXRlbSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuYnJvd3Nlci5kb3dubG9hZE1hbmFnZXIoKVxuICAgICAgLmdvdG8oJ2h0dHBzOi8vd3d3LnB1Ymxpby5wbC9rbGllbnQvbG9nb3dhbmllLmh0bWwnKVxuICAgICAgLnZpZXdwb3J0KDIwMTQsIDc2OClcbiAgICAgIC50eXBlKCcjal91c2VybmFtZScsIHByb2Nlc3MuZW52WydMT0dJTiddKVxuICAgICAgLnR5cGUoJyNqX3Bhc3N3b3JkJywgcHJvY2Vzcy5lbnZbJ1BBU1NXT1JEJ10pXG4gICAgICAuY2xpY2soJy5idG4tbG9naW4nKVxuICAgICAgLndhaXQoMTAwMClcbiAgICAgIC53YWl0KCdhLnVzZXJuYW1lJylcbiAgICAgIC5nb3RvKFwiaHR0cHM6Ly93d3cucHVibGlvLnBsL2tsaWVudC9wdWJsaWthY2plLmh0bWw/cHJlc3NUaXRsZT05NDU0MlwiKVxuICAgICAgLndhaXQoJy5kb3dubG9hZFN0YXR1cycpXG4gICAgICAuY2xpY2soJy5kb3dubG9hZFN0YXR1cyAuYnRuLXNpbXBsZScpXG4gICAgICAud2FpdCgnLnByb2R1Y3REb3dubG9hZEluZm8nKVxuICAgICAgLmNsaWNrKFwiaW5wdXRbbmFtZV49J2Rvd25sb2FkUGFja2FnZSddW3ZhbHVlPSc2J11cIilcbiAgICAgIC5jbGljaygnLmJ0bi1zaW1wbGUubVIxMCcpXG4gICAgICAud2FpdERvd25sb2Fkc0NvbXBsZXRlKClcbiAgICAgIC5lbmQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgICAgfSlcbiAgfVxuXG59XG5cbmV4cG9ydCBjb25zdCBtb3JuaW5nR2F6ZXRhID0gKCkgPT4ge1xuICBsb2coJ21vcm5pbmdHYXpldGEgam9iIHN0YXJ0ZWQnKVxuICBjb25zdCBib3QgPSBuZXcgQm9va2JvdCgpXG4gIGJvdC5nZXRHYXpldGEoKVxuICAgIC50aGVuKGZuID0+IGJvdC5zZW5kQXR0YWNobWVudChmbikpXG4gICAgLnRoZW4oeCA9PiBjb25zb2xlLmluZm8oJ01vcm5pbmcgR2F6ZXRhIGRlbGl2ZXJlZCEnKSlcbn1cblxuZXhwb3J0IGNvbnN0IHN1bmRheVR5Z29kbmlrID0gKCkgPT4ge1xuICBsb2coJ3N1bmRheVR5Z29kbmlrIGpvYiBzdGFydGVkJylcbiAgY29uc3QgYm90ID0gbmV3IEJvb2tib3QoKVxuICBib3QuZ2V0VHlnb2RuaWsoKVxuICAgIC50aGVuKGZuID0+IGJvdC5zZW5kQXR0YWNobWVudChmbikpXG4gICAgLnRoZW4oeCA9PiBjb25zb2xlLmluZm8oJ1N1bmRheSBUeWdvZG5payBkZWxpdmVyZWQhJykpXG59XG5cbmlmIChhcmdzLm9wdGlvbnMuZykge1xuICBtb3JuaW5nR2F6ZXRhKClcbn1cblxuaWYgKGFyZ3Mub3B0aW9ucy50KSB7XG4gIHN1bmRheVR5Z29kbmlrKClcbn1cblxuaWYgKGFyZ3Mub3B0aW9ucy5jKSB7XG4gIGxldCBnYXpldGFTdHIgPSBhcmdzLm9wdGlvbnMuRyB8fCAnMCAwIDcgKiAqIDEtNidcbiAgbGV0IHR5Z29kbmlrU3RyID0gYXJncy5vcHRpb25zLlQgfHwgJzAgMzAgNyAqICogMCdcbiAgY29uc29sZS5sb2coYGdhemV0YSBzY2hlZHVsZSAke2dhemV0YVN0cn1gKVxuICBuZXcgQ3JvbkpvYihnYXpldGFTdHIsIG1vcm5pbmdHYXpldGEsIG51bGwsIHRydWUsICdFdXJvcGUvV2Fyc2F3JylcbiAgY29uc29sZS5sb2coYHR5Z29kbmlrIHNjaGVkdWxlICR7dHlnb2RuaWtTdHJ9YClcbiAgbmV3IENyb25Kb2IodHlnb2RuaWtTdHIsIHN1bmRheVR5Z29kbmlrLCBudWxsLCB0cnVlLCAnRXVyb3BlL1dhcnNhdycpXG59XG4iXX0=