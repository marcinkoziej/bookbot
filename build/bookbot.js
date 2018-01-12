'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.morningGazeta = exports.Bookbot = undefined;

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
var args = _nodeGetopt2.default.create([['n', '', 'run now'], ['c', '', 'run cron'], ['C', '', 'cron string']]).bindHelp().parseSystem();

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

if (args.options.n) {
  morningGazeta();
}

if (args.options.c) {
  var cronStr = args.options.C || '0 0 7 * *';
  new _cron.CronJob(cronStr, morningGazeta, null, false, 'Europe/Warsaw');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2Jvb2tib3QuanMiXSwibmFtZXMiOlsiY29uZmlnIiwibG9nIiwiYXJncyIsImNyZWF0ZSIsImJpbmRIZWxwIiwicGFyc2VTeXN0ZW0iLCJCb29rYm90IiwibWFpbGVyIiwiY3JlYXRlVHJhbnNwb3J0IiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJwb3J0Iiwic2VjdXJlIiwiYXV0aCIsInVzZXIiLCJwYXNzIiwiYnJvd3NlciIsInNob3ciLCJmaWxlcGF0aCIsIm1zZyIsInNlbmRlciIsImZyb20iLCJ0byIsInN1YmplY3QiLCJodG1sIiwiYXR0YWNobWVudHMiLCJmaWxlbmFtZSIsImJhc2VuYW1lIiwicGF0aCIsInByb21pc2UiLCJvayIsImZhaWwiLCJzZW5kTWFpbCIsImVyciIsImluZm8iLCJmb3JtYXQiLCJvbmNlIiwic3RhdGUiLCJkb3dubG9hZEl0ZW0iLCJlbWl0IiwiZG93bmxvYWRNYW5hZ2VyIiwiZ290byIsInZpZXdwb3J0IiwidHlwZSIsImNsaWNrIiwid2FpdCIsIndhaXREb3dubG9hZHNDb21wbGV0ZSIsImVuZCIsInRoZW4iLCJtb3JuaW5nR2F6ZXRhIiwiYm90IiwiZ2V0R2F6ZXRhIiwic2VuZEF0dGFjaG1lbnQiLCJmbiIsImNvbnNvbGUiLCJvcHRpb25zIiwibiIsImMiLCJjcm9uU3RyIiwiQyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7Ozs7OztBQVRBLGlCQUFPQSxNQUFQOzs7QUFXQSxJQUFNQyxNQUFNLHFCQUFNLFNBQU4sQ0FBWjtBQUNBLElBQU1DLE9BQU8scUJBQU9DLE1BQVAsQ0FBYyxDQUN6QixDQUFDLEdBQUQsRUFBTSxFQUFOLEVBQVUsU0FBVixDQUR5QixFQUV6QixDQUFDLEdBQUQsRUFBTSxFQUFOLEVBQVUsVUFBVixDQUZ5QixFQUd6QixDQUFDLEdBQUQsRUFBTSxFQUFO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LEVBQVo7QUFDQTZDLE1BQUlDLFNBQUosR0FDR0gsSUFESCxDQUNRO0FBQUEsV0FBTUUsSUFBSUUsY0FBSixDQUFtQkMsRUFBbkIsQ0FBTjtBQUFBLEdBRFIsRUFFR0wsSUFGSCxDQUVRO0FBQUEsV0FBS00sUUFBUXBCLElBQVIsQ0FBYSwyQkFBYixDQUFMO0FBQUEsR0FGUjtBQUdELENBTk07O0FBUVAsSUFBSWpDLEtBQUtzRCxPQUFMLENBQWFDLENBQWpCLEVBQW9CO0FBQ2xCUDtBQUNEOztBQUVELElBQUloRCxLQUFLc0QsT0FBTCxDQUFhRSxDQUFqQixFQUFvQjtBQUNsQixNQUFJQyxVQUFVekQsS0FBS3NELE9BQUwsQ0FBYUksQ0FBYixJQUFrQixXQUFoQztBQUNBLG9CQUFZRCxPQUFaLEVBQXFCVCxhQUFyQixFQUFvQyxJQUFwQyxFQUEwQyxLQUExQyxFQUFpRCxlQUFqRDtBQUNEIiwiZmlsZSI6ImJvb2tib3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZG90ZW52IGZyb20gJ2RvdGVudidcbmRvdGVudi5jb25maWcoKVxuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5pbXBvcnQgbm9kZW1haWxlciBmcm9tICdub2RlbWFpbGVyJ1xuaW1wb3J0IG5pZ2h0bWFyZSBmcm9tICduaWdodG1hcmUnXG5pbXBvcnQgbmlnaHRtYXJlRG93bmxvYWRNYW5hZ2VyIGZyb20gJ25pZ2h0bWFyZS1kb3dubG9hZC1tYW5hZ2VyJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBkZWJ1ZyBmcm9tICdkZWJ1ZydcbmltcG9ydCB3aGVuIGZyb20gJ3doZW4nXG5pbXBvcnQge0Nyb25Kb2J9IGZyb20gJ2Nyb24nXG5pbXBvcnQgZ2V0b3B0IGZyb20gJ25vZGUtZ2V0b3B0J1xuXG5jb25zdCBsb2cgPSBkZWJ1ZygnYm9va2JvdCcpXG5jb25zdCBhcmdzID0gZ2V0b3B0LmNyZWF0ZShbXG4gIFsnbicsICcnLCAncnVuIG5vdyddLFxuICBbJ2MnLCAnJywgJ3J1biBjcm9uJ10sXG4gIFsnQycsICcnLCAnY3JvbiBzdHJpbmcnXSwgXG5dKS5iaW5kSGVscCgpLnBhcnNlU3lzdGVtKClcblxubmlnaHRtYXJlRG93bmxvYWRNYW5hZ2VyKG5pZ2h0bWFyZSlcblxuZXhwb3J0IGNsYXNzIEJvb2tib3Qge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm1haWxlciA9IG5vZGVtYWlsZXIuY3JlYXRlVHJhbnNwb3J0KHtcbiAgICAgIGhvc3Q6IHByb2Nlc3MuZW52WydTTVRQX1NFUlZFUiddLFxuICAgICAgcG9ydDogNTg3LFxuICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIGF1dGg6IHtcbiAgICAgICAgdXNlcjogcHJvY2Vzcy5lbnZbJ0VNQUlMJ10sXG4gICAgICAgIHBhc3M6IHByb2Nlc3MuZW52WydTTVRQX1BBU1NXT1JEJ11cbiAgICAgIH1cbiAgICB9KVxuICAgIHRoaXMuYnJvd3NlciA9IG5ldyBuaWdodG1hcmUoe3Nob3c6ICEocHJvY2Vzcy5lbnZbJ0RJU1BMQVknXT09PW51bGwpfSk7XG5cbiAgfVxuXG4gIHNlbmRBdHRhY2htZW50KGZpbGVwYXRoKSB7XG4gICAgbG9nKGBzZW5kIGF0dGFjaG1lbnQgJHtmaWxlcGF0aH1gKVxuICAgIGNvbnN0IG1zZyA9IHtcbiAgICAgIHNlbmRlcjogcHJvY2Vzcy5lbnZbJ0VNQUlMJ10sXG4gICAgICBmcm9tOiBgQWtjamEgQm90IDwke3Byb2Nlc3MuZW52WydFTUFJTCddfT5gLFxuICAgICAgdG86IHByb2Nlc3MuZW52WydUTyddLFxuICAgICAgc3ViamVjdDogJ0R6aXNpZWpzemEgZ2F6ZXRhJyxcbiAgICAgIGh0bWw6ICdXIHphxYLEhWN6bmt1IGR6aXNpZWpzemEgZ2F6ZXRhICZsdDszJyxcbiAgICAgIGF0dGFjaG1lbnRzOiB7XG4gICAgICAgIGZpbGVuYW1lOiBwYXRoLmJhc2VuYW1lKGZpbGVwYXRoKSxcbiAgICAgICAgcGF0aDogZmlsZXBhdGhcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHdoZW4ucHJvbWlzZSgob2ssIGZhaWwpID0+IHtcbiAgICAgIHRoaXMubWFpbGVyLnNlbmRNYWlsKG1zZywgKGVyciwgaW5mbykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgbG9nKGVycilcbiAgICAgICAgICByZXR1cm4gZmFpbChlcnIpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9rKClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGdldEdhemV0YSgpIHtcbiAgICBjb25zdCBmaWxlbmFtZSA9IGAuL2dhemV0YS0ke21vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpfS5tb2JpYFxuICAgIHRoaXMuYnJvd3Nlci5vbmNlKCdkb3dubG9hZCcsIChzdGF0ZSwgZG93bmxvYWRJdGVtKSA9PiB7XG4gICAgICBpZihzdGF0ZSA9PSAnc3RhcnRlZCcpe1xuICAgICAgICBsb2coYGRvd25sb2FkIHN0YXJ0ZWQgdG8gJHtmaWxlbmFtZX1gKVxuICAgICAgICB0aGlzLmJyb3dzZXIuZW1pdCgnZG93bmxvYWQnLCBmaWxlbmFtZSwgZG93bmxvYWRJdGVtKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5icm93c2VyLmRvd25sb2FkTWFuYWdlcigpXG4gICAgICAuZ290bygnaHR0cHM6Ly93d3cucHVibGlvLnBsL2tsaWVudC9sb2dvd2FuaWUuaHRtbCcpXG4gICAgICAudmlld3BvcnQoMjAxNCwgNzY4KVxuICAgICAgLnR5cGUoJyNqX3VzZXJuYW1lJywgcHJvY2Vzcy5lbnZbJ0xPR0lOJ10pXG4gICAgICAudHlwZSgnI2pfcGFzc3dvcmQnLCBwcm9jZXNzLmVudlsnUEFTU1dPUkQnXSlcbiAgICAgIC5jbGljaygnLmJ0bi1sb2dpbicpXG4gICAgICAud2FpdCgxMDAwKVxuICAgICAgLndhaXQoJ2EudXNlcm5hbWUnKVxuICAgICAgLmdvdG8oXCJodHRwczovL3d3dy5wdWJsaW8ucGwva2xpZW50L3B1Ymxpa2FjamUuaHRtbD9wcmVzc1RpdGxlPTkxNDE3XCIpXG4gICAgICAud2FpdCgnLmRvd25sb2FkU3RhdHVzJylcbiAgICAgIC5jbGljaygnLmRvd25sb2FkU3RhdHVzIC5idG4tc2ltcGxlJylcbiAgICAgIC53YWl0KCcucHJvZHVjdERvd25sb2FkSW5mbycpXG4gICAgICAuY2xpY2soXCJpbnB1dFtuYW1lXj0nZG93bmxvYWRQYWNrYWdlJ11bdmFsdWU9JzYnXVwiKVxuICAgICAgLmNsaWNrKCcuYnRuLXNpbXBsZS5tUjEwJylcbiAgICAgIC53YWl0RG93bmxvYWRzQ29tcGxldGUoKVxuICAgICAgLmVuZCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gZmlsZW5hbWU7XG4gICAgICB9KVxuICB9XG59XG5cbmV4cG9ydCBjb25zdCBtb3JuaW5nR2F6ZXRhID0gKCkgPT4ge1xuICBsb2coJ21vcm5pbmdHYXpldGEgam9iIHN0YXJ0ZWQnKVxuICBjb25zdCBib3QgPSBuZXcgQm9va2JvdCgpXG4gIGJvdC5nZXRHYXpldGEoKVxuICAgIC50aGVuKGZuID0+IGJvdC5zZW5kQXR0YWNobWVudChmbikpXG4gICAgLnRoZW4oeCA9PiBjb25zb2xlLmluZm8oJ01vcm5pbmcgR2F6ZXRhIGRlbGl2ZXJlZCEnKSlcbn1cblxuaWYgKGFyZ3Mub3B0aW9ucy5uKSB7XG4gIG1vcm5pbmdHYXpldGEoKVxufVxuXG5pZiAoYXJncy5vcHRpb25zLmMpIHtcbiAgbGV0IGNyb25TdHIgPSBhcmdzLm9wdGlvbnMuQyB8fCAnMCAwIDcgKiAqJ1xuICBuZXcgQ3JvbkpvYihjcm9uU3RyLCBtb3JuaW5nR2F6ZXRhLCBudWxsLCBmYWxzZSwgJ0V1cm9wZS9XYXJzYXcnKVxufVxuIl19