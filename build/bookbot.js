'use strict';

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

var Bookbot = function () {
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
    this.browser = new _nightmare2.default({ show: true });
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

var morningGazeta = function morningGazeta() {
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
  new _cron.CronJob(cronStr, morningGazeta, null, true, 'Europe/Warsaw');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2Jvb2tib3QuanMiXSwibmFtZXMiOlsiY29uZmlnIiwibG9nIiwiYXJncyIsImNyZWF0ZSIsImJpbmRIZWxwIiwicGFyc2VTeXN0ZW0iLCJCb29rYm90IiwibWFpbGVyIiwiY3JlYXRlVHJhbnNwb3J0IiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJwb3J0Iiwic2VjdXJlIiwiYXV0aCIsInVzZXIiLCJwYXNzIiwiYnJvd3NlciIsInNob3ciLCJmaWxlcGF0aCIsIm1zZyIsInNlbmRlciIsImZyb20iLCJ0byIsInN1YmplY3QiLCJodG1sIiwiYXR0YWNobWVudHMiLCJmaWxlbmFtZSIsImJhc2VuYW1lIiwicGF0aCIsInByb21pc2UiLCJvayIsImZhaWwiLCJzZW5kTWFpbCIsImVyciIsImluZm8iLCJmb3JtYXQiLCJvbmNlIiwic3RhdGUiLCJkb3dubG9hZEl0ZW0iLCJlbWl0IiwiZG93bmxvYWRNYW5hZ2VyIiwiZ290byIsInZpZXdwb3J0IiwidHlwZSIsImNsaWNrIiwid2FpdCIsIndhaXREb3dubG9hZHNDb21wbGV0ZSIsImVuZCIsInRoZW4iLCJtb3JuaW5nR2F6ZXRhIiwiYm90IiwiZ2V0R2F6ZXRhIiwic2VuZEF0dGFjaG1lbnQiLCJmbiIsImNvbnNvbGUiLCJvcHRpb25zIiwibiIsImMiLCJjcm9uU3RyIiwiQyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBOzs7O0FBRUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7Ozs7Ozs7QUFUQSxpQkFBT0EsTUFBUDs7O0FBV0EsSUFBTUMsTUFBTSxxQkFBTSxTQUFOLENBQVo7QUFDQSxJQUFNQyxPQUFPLHFCQUFPQyxNQUFQLENBQWMsQ0FDekIsQ0FBQyxHQUFELEVBQU0sRUFBTixFQUFVLFNBQVYsQ0FEeUIsRUFFekIsQ0FBQyxHQUFELEVBQU0sRUFBTixFQUFVLFVBQVYsQ0FGeUIsRUFHekIsQ0FBQyxHQUFELEVBQU0sRUFBTixFQUFV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QUFJRSxjQUFKLENBQW1CQyxFQUFuQixDQUFOO0FBQUEsR0FEUixFQUVHTCxJQUZILENBRVE7QUFBQSxXQUFLTSxRQUFRcEIsSUFBUixDQUFhLDJCQUFiLENBQUw7QUFBQSxHQUZSO0FBR0QsQ0FORDs7QUFRQSxJQUFJakMsS0FBS3NELE9BQUwsQ0FBYUMsQ0FBakIsRUFBb0I7QUFDbEJQO0FBQ0Q7O0FBRUQsSUFBSWhELEtBQUtzRCxPQUFMLENBQWFFLENBQWpCLEVBQW9CO0FBQ2xCLE1BQUlDLFVBQVV6RCxLQUFLc0QsT0FBTCxDQUFhSSxDQUFiLElBQWtCLFdBQWhDO0FBQ0Esb0JBQVlELE9BQVosRUFBcUJULGFBQXJCLEVBQW9DLElBQXBDLEVBQTBDLElBQTFDLEVBQWdELGVBQWhEO0FBQ0QiLCJmaWxlIjoiYm9va2JvdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBkb3RlbnYgZnJvbSAnZG90ZW52J1xuZG90ZW52LmNvbmZpZygpXG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCdcbmltcG9ydCBub2RlbWFpbGVyIGZyb20gJ25vZGVtYWlsZXInXG5pbXBvcnQgbmlnaHRtYXJlIGZyb20gJ25pZ2h0bWFyZSdcbmltcG9ydCBuaWdodG1hcmVEb3dubG9hZE1hbmFnZXIgZnJvbSAnbmlnaHRtYXJlLWRvd25sb2FkLW1hbmFnZXInXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IGRlYnVnIGZyb20gJ2RlYnVnJ1xuaW1wb3J0IHdoZW4gZnJvbSAnd2hlbidcbmltcG9ydCB7Q3JvbkpvYn0gZnJvbSAnY3JvbidcbmltcG9ydCBnZXRvcHQgZnJvbSAnbm9kZS1nZXRvcHQnXG5cbmNvbnN0IGxvZyA9IGRlYnVnKCdib29rYm90JylcbmNvbnN0IGFyZ3MgPSBnZXRvcHQuY3JlYXRlKFtcbiAgWyduJywgJycsICdydW4gbm93J10sXG4gIFsnYycsICcnLCAncnVuIGNyb24nXSxcbiAgWydDJywgJycsICdjcm9uIHN0cmluZyddLCBcbl0pLmJpbmRIZWxwKCkucGFyc2VTeXN0ZW0oKVxuXG5uaWdodG1hcmVEb3dubG9hZE1hbmFnZXIobmlnaHRtYXJlKVxuXG5jbGFzcyBCb29rYm90IHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5tYWlsZXIgPSBub2RlbWFpbGVyLmNyZWF0ZVRyYW5zcG9ydCh7XG4gICAgICBob3N0OiBwcm9jZXNzLmVudlsnU01UUF9TRVJWRVInXSxcbiAgICAgIHBvcnQ6IDU4NyxcbiAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICBhdXRoOiB7XG4gICAgICAgIHVzZXI6IHByb2Nlc3MuZW52WydFTUFJTCddLFxuICAgICAgICBwYXNzOiBwcm9jZXNzLmVudlsnU01UUF9QQVNTV09SRCddXG4gICAgICB9XG4gICAgfSlcbiAgICB0aGlzLmJyb3dzZXIgPSBuZXcgbmlnaHRtYXJlKHtzaG93OiB0cnVlfSk7XG5cbiAgfVxuXG4gIHNlbmRBdHRhY2htZW50KGZpbGVwYXRoKSB7XG4gICAgbG9nKGBzZW5kIGF0dGFjaG1lbnQgJHtmaWxlcGF0aH1gKVxuICAgIGNvbnN0IG1zZyA9IHtcbiAgICAgIHNlbmRlcjogcHJvY2Vzcy5lbnZbJ0VNQUlMJ10sXG4gICAgICBmcm9tOiBgQWtjamEgQm90IDwke3Byb2Nlc3MuZW52WydFTUFJTCddfT5gLFxuICAgICAgdG86IHByb2Nlc3MuZW52WydUTyddLFxuICAgICAgc3ViamVjdDogJ0R6aXNpZWpzemEgZ2F6ZXRhJyxcbiAgICAgIGh0bWw6ICdXIHphxYLEhWN6bmt1IGR6aXNpZWpzemEgZ2F6ZXRhICZsdDszJyxcbiAgICAgIGF0dGFjaG1lbnRzOiB7XG4gICAgICAgIGZpbGVuYW1lOiBwYXRoLmJhc2VuYW1lKGZpbGVwYXRoKSxcbiAgICAgICAgcGF0aDogZmlsZXBhdGhcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHdoZW4ucHJvbWlzZSgob2ssIGZhaWwpID0+IHtcbiAgICAgIHRoaXMubWFpbGVyLnNlbmRNYWlsKG1zZywgKGVyciwgaW5mbykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgbG9nKGVycilcbiAgICAgICAgICByZXR1cm4gZmFpbChlcnIpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9rKClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGdldEdhemV0YSgpIHtcbiAgICBjb25zdCBmaWxlbmFtZSA9IGAuL2dhemV0YS0ke21vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpfS5tb2JpYFxuICAgIHRoaXMuYnJvd3Nlci5vbmNlKCdkb3dubG9hZCcsIChzdGF0ZSwgZG93bmxvYWRJdGVtKSA9PiB7XG4gICAgICBpZihzdGF0ZSA9PSAnc3RhcnRlZCcpe1xuICAgICAgICBsb2coYGRvd25sb2FkIHN0YXJ0ZWQgdG8gJHtmaWxlbmFtZX1gKVxuICAgICAgICB0aGlzLmJyb3dzZXIuZW1pdCgnZG93bmxvYWQnLCBmaWxlbmFtZSwgZG93bmxvYWRJdGVtKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5icm93c2VyLmRvd25sb2FkTWFuYWdlcigpXG4gICAgICAuZ290bygnaHR0cHM6Ly93d3cucHVibGlvLnBsL2tsaWVudC9sb2dvd2FuaWUuaHRtbCcpXG4gICAgICAudmlld3BvcnQoMjAxNCwgNzY4KVxuICAgICAgLnR5cGUoJyNqX3VzZXJuYW1lJywgcHJvY2Vzcy5lbnZbJ0xPR0lOJ10pXG4gICAgICAudHlwZSgnI2pfcGFzc3dvcmQnLCBwcm9jZXNzLmVudlsnUEFTU1dPUkQnXSlcbiAgICAgIC5jbGljaygnLmJ0bi1sb2dpbicpXG4gICAgICAud2FpdCgxMDAwKVxuICAgICAgLndhaXQoJ2EudXNlcm5hbWUnKVxuICAgICAgLmdvdG8oXCJodHRwczovL3d3dy5wdWJsaW8ucGwva2xpZW50L3B1Ymxpa2FjamUuaHRtbD9wcmVzc1RpdGxlPTkxNDE3XCIpXG4gICAgICAud2FpdCgnLmRvd25sb2FkU3RhdHVzJylcbiAgICAgIC5jbGljaygnLmRvd25sb2FkU3RhdHVzIC5idG4tc2ltcGxlJylcbiAgICAgIC53YWl0KCcucHJvZHVjdERvd25sb2FkSW5mbycpXG4gICAgICAuY2xpY2soXCJpbnB1dFtuYW1lXj0nZG93bmxvYWRQYWNrYWdlJ11bdmFsdWU9JzYnXVwiKVxuICAgICAgLmNsaWNrKCcuYnRuLXNpbXBsZS5tUjEwJylcbiAgICAgIC53YWl0RG93bmxvYWRzQ29tcGxldGUoKVxuICAgICAgLmVuZCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gZmlsZW5hbWU7XG4gICAgICB9KVxuICB9XG59XG5cbmNvbnN0IG1vcm5pbmdHYXpldGEgPSAoKSA9PiB7XG4gIGxvZygnbW9ybmluZ0dhemV0YSBqb2Igc3RhcnRlZCcpXG4gIGNvbnN0IGJvdCA9IG5ldyBCb29rYm90KClcbiAgYm90LmdldEdhemV0YSgpXG4gICAgLnRoZW4oZm4gPT4gYm90LnNlbmRBdHRhY2htZW50KGZuKSlcbiAgICAudGhlbih4ID0+IGNvbnNvbGUuaW5mbygnTW9ybmluZyBHYXpldGEgZGVsaXZlcmVkIScpKVxufVxuXG5pZiAoYXJncy5vcHRpb25zLm4pIHtcbiAgbW9ybmluZ0dhemV0YSgpXG59XG5cbmlmIChhcmdzLm9wdGlvbnMuYykge1xuICBsZXQgY3JvblN0ciA9IGFyZ3Mub3B0aW9ucy5DIHx8ICcwIDAgNyAqIConXG4gIG5ldyBDcm9uSm9iKGNyb25TdHIsIG1vcm5pbmdHYXpldGEsIG51bGwsIHRydWUsICdFdXJvcGUvV2Fyc2F3Jylcbn1cbiJdfQ==