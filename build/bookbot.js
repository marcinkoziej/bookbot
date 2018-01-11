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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

_dotenv2.default.config();


var log = (0, _debug2.default)('bookbot');

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

new _cron.CronJob('0 0 7 * *', morningGazeta, null, true, 'Europe/Warsaw');
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2Jvb2tib3QuanMiXSwibmFtZXMiOlsiY29uZmlnIiwibG9nIiwiQm9va2JvdCIsIm1haWxlciIsImNyZWF0ZVRyYW5zcG9ydCIsImhvc3QiLCJwcm9jZXNzIiwiZW52IiwicG9ydCIsInNlY3VyZSIsImF1dGgiLCJ1c2VyIiwicGFzcyIsImJyb3dzZXIiLCJzaG93IiwiZmlsZXBhdGgiLCJtc2ciLCJzZW5kZXIiLCJ0byIsInN1YmplY3QiLCJodG1sIiwiYXR0YWNobWVudHMiLCJmaWxlbmFtZSIsImJhc2VuYW1lIiwicGF0aCIsInByb21pc2UiLCJvayIsImZhaWwiLCJzZW5kTWFpbCIsImVyciIsImluZm8iLCJmb3JtYXQiLCJvbmNlIiwic3RhdGUiLCJkb3dubG9hZEl0ZW0iLCJlbWl0IiwiZG93bmxvYWRNYW5hZ2VyIiwiZ290byIsInZpZXdwb3J0IiwidHlwZSIsImNsaWNrIiwid2FpdCIsIndhaXREb3dubG9hZHNDb21wbGV0ZSIsImVuZCIsInRoZW4iLCJtb3JuaW5nR2F6ZXRhIiwiYm90IiwiZ2V0R2F6ZXRhIiwic2VuZEF0dGFjaG1lbnQiLCJmbiIsImNvbnNvbGUiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7OztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7OztBQVJBLGlCQUFPQSxNQUFQOzs7QUFVQSxJQUFNQyxNQUFNLHFCQUFNLFNBQU4sQ0FBWjs7QUFFQTs7SUFFTUMsTztBQUNKLHFCQUFjO0FBQUE7O0FBQ1osU0FBS0MsTUFBTCxHQUFjLHFCQUFXQyxlQUFYLENBQTJCO0FBQ3ZDQyxZQUFNQyxRQUFRQyxHQUFSLENBQVksYUFBWixDQURpQztBQUV2Q0MsWUFBTSxHQUZpQztBQUd2Q0MsY0FBUSxLQUgrQjtBQUl2Q0MsWUFBTTtBQUNKQyxjQUFNTCxRQUFRQyxHQUFSLENBQVksT0FBWixDQURGO0FBRUpLLGNBQU1OLFFBQVFDLEdBQVIsQ0FBWSxlQUFaO0FBRkY7QUFKaUMsS0FBM0IsQ0FBZDtBQVNBLFNBQUtNLE9BQUwsR0FBZSx3QkFBYyxFQUFDQyxNQUFNLElBQVAsRUFBZCxDQUFmO0FBRUQ7Ozs7bUNBRWNDLFEsRUFBVTtBQUFBOztBQUN2QmQsK0JBQXVCYyxRQUF2QjtBQUNBLFVBQU1DLE1BQU07QUFDVkMsZ0JBQVFYLFFBQVFDLEdBQVIsQ0FBWSxPQUFaLENBREU7QUFFVlcsWUFBSVosUUFBUUMsR0FBUixDQUFZLElBQVosQ0FGTTtBQUdWWSxpQkFBUyxtQkFIQztBQUlWQyxjQUFNLHFDQUpJO0FBS1ZDLHFCQUFhO0FBQ1hDLG9CQUFVLGVBQUtDLFFBQUwsQ0FBY1IsUUFBZCxDQURDO0FBRVhTLGdCQUFNVDtBQUZLO0FBTEgsT0FBWjtBQVVBLGFBQU8sZUFBS1UsT0FBTCxDQUFhLFVBQUNDLEVBQUQsRUFBS0MsSUFBTCxFQUFjO0FBQ2hDLGNBQUt4QixNQUFMLENBQVl5QixRQUFaLENBQXFCWixHQUFyQixFQUEwQixVQUFDYSxHQUFELEVBQU1DLElBQU4sRUFBZTtBQUN2QyxjQUFJRCxHQUFKLEVBQVM7QUFDUDVCLGdCQUFJNEIsR0FBSjtBQUNBLG1CQUFPRixLQUFLRSxHQUFMLENBQVA7QUFDRDtBQUNELGlCQUFPSCxJQUFQO0FBQ0QsU0FORDtBQU9ELE9BUk0sQ0FBUDtBQVNEOzs7Z0NBRVc7QUFBQTs7QUFDVixVQUFNSix5QkFBdUIsd0JBQVNTLE1BQVQsQ0FBZ0IsWUFBaEIsQ0FBdkIsVUFBTjtBQUNBLFdBQUtsQixPQUFMLENBQWFtQixJQUFiLENBQWtCLFVBQWxCLEVBQThCLFVBQUNDLEtBQUQsRUFBUUMsWUFBUixFQUF5QjtBQUNyRCxZQUFHRCxTQUFTLFNBQVosRUFBc0I7QUFDcEJoQyx1Q0FBMkJxQixRQUEzQjtBQUNBLGlCQUFLVCxPQUFMLENBQWFzQixJQUFiLENBQWtCLFVBQWxCLEVBQThCYixRQUE5QixFQUF3Q1ksWUFBeEM7QUFDRDtBQUNGLE9BTEQ7QUFNQSxhQUFPLEtBQUtyQixPQUFMLENBQWF1QixlQUFiLEdBQ0pDLElBREksQ0FDQyw2Q0FERCxFQUVKQyxRQUZJLENBRUssSUFGTCxFQUVXLEdBRlgsRUFHSkMsSUFISSxDQUdDLGFBSEQsRUFHZ0JqQyxRQUFRQyxHQUFSLENBQVksT0FBWixDQUhoQixFQUlKZ0MsSUFKSSxDQUlDLGFBSkQsRUFJZ0JqQyxRQUFRQyxHQUFSLENBQVksVUFBWixDQUpoQixFQUtKaUMsS0FMSSxDQUtFLFlBTEYsRUFNSkMsSUFOSSxDQU1DLElBTkQsRUFPSkEsSUFQSSxDQU9DLFlBUEQsRUFRSkosSUFSSSxDQVFDLCtEQVJELEVBU0pJLElBVEksQ0FTQyxpQkFURCxFQVVKRCxLQVZJLENBVUUsNkJBVkYsRUFXSkMsSUFYSSxDQVdDLHNCQVhELEVBWUpELEtBWkksQ0FZRSwyQ0FaRixFQWFKQSxLQWJJLENBYUUsa0JBYkYsRUFjSkUscUJBZEksR0FlSkMsR0FmSSxHQWVFQyxJQWZGLENBZU8sWUFBTTtBQUNoQixlQUFPdEIsUUFBUDtBQUNELE9BakJJLENBQVA7QUFrQkQ7Ozs7OztBQUdILElBQU11QixnQkFBZ0IsU0FBaEJBLGFBQWdCLEdBQU07QUFDMUI1QyxNQUFJLDJCQUFKO0FBQ0EsTUFBTTZDLE1BQU0sSUFBSTVDLE9BQUosRUFBWjtBQUNBNEMsTUFBSUMsU0FBSixHQUNHSCxJQURILENBQ1E7QUFBQSxXQUFNRSxJQUFJRSxjQUFKLENBQW1CQyxFQUFuQixDQUFOO0FBQUEsR0FEUixFQUVHTCxJQUZILENBRVE7QUFBQSxXQUFLTSxRQUFRcEIsSUFBUixDQUFhLDJCQUFiLENBQUw7QUFBQSxHQUZSO0FBR0QsQ0FORDs7QUFRQSxrQkFBWSxXQUFaLEVBQXlCZSxhQUF6QixFQUF3QyxJQUF4QyxFQUE4QyxJQUE5QyxFQUFvRCxlQUFwRCIsImZpbGUiOiJib29rYm90LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGRvdGVudiBmcm9tICdkb3RlbnYnXG5kb3RlbnYuY29uZmlnKClcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50J1xuaW1wb3J0IG5vZGVtYWlsZXIgZnJvbSAnbm9kZW1haWxlcidcbmltcG9ydCBuaWdodG1hcmUgZnJvbSAnbmlnaHRtYXJlJ1xuaW1wb3J0IG5pZ2h0bWFyZURvd25sb2FkTWFuYWdlciBmcm9tICduaWdodG1hcmUtZG93bmxvYWQtbWFuYWdlcidcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnXG5pbXBvcnQgd2hlbiBmcm9tICd3aGVuJ1xuaW1wb3J0IHtDcm9uSm9ifSBmcm9tICdjcm9uJ1xuXG5jb25zdCBsb2cgPSBkZWJ1ZygnYm9va2JvdCcpXG5cbm5pZ2h0bWFyZURvd25sb2FkTWFuYWdlcihuaWdodG1hcmUpXG5cbmNsYXNzIEJvb2tib3Qge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm1haWxlciA9IG5vZGVtYWlsZXIuY3JlYXRlVHJhbnNwb3J0KHtcbiAgICAgIGhvc3Q6IHByb2Nlc3MuZW52WydTTVRQX1NFUlZFUiddLFxuICAgICAgcG9ydDogNTg3LFxuICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIGF1dGg6IHtcbiAgICAgICAgdXNlcjogcHJvY2Vzcy5lbnZbJ0VNQUlMJ10sXG4gICAgICAgIHBhc3M6IHByb2Nlc3MuZW52WydTTVRQX1BBU1NXT1JEJ11cbiAgICAgIH1cbiAgICB9KVxuICAgIHRoaXMuYnJvd3NlciA9IG5ldyBuaWdodG1hcmUoe3Nob3c6IHRydWV9KTtcblxuICB9XG5cbiAgc2VuZEF0dGFjaG1lbnQoZmlsZXBhdGgpIHtcbiAgICBsb2coYHNlbmQgYXR0YWNobWVudCAke2ZpbGVwYXRofWApXG4gICAgY29uc3QgbXNnID0ge1xuICAgICAgc2VuZGVyOiBwcm9jZXNzLmVudlsnRU1BSUwnXSxcbiAgICAgIHRvOiBwcm9jZXNzLmVudlsnVE8nXSxcbiAgICAgIHN1YmplY3Q6ICdEemlzaWVqc3phIGdhemV0YScsXG4gICAgICBodG1sOiAnVyB6YcWCxIVjem5rdSBkemlzaWVqc3phIGdhemV0YSAmbHQ7MycsXG4gICAgICBhdHRhY2htZW50czoge1xuICAgICAgICBmaWxlbmFtZTogcGF0aC5iYXNlbmFtZShmaWxlcGF0aCksXG4gICAgICAgIHBhdGg6IGZpbGVwYXRoXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB3aGVuLnByb21pc2UoKG9rLCBmYWlsKSA9PiB7XG4gICAgICB0aGlzLm1haWxlci5zZW5kTWFpbChtc2csIChlcnIsIGluZm8pID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGxvZyhlcnIpXG4gICAgICAgICAgcmV0dXJuIGZhaWwoZXJyKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvaygpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBnZXRHYXpldGEoKSB7XG4gICAgY29uc3QgZmlsZW5hbWUgPSBgLi9nYXpldGEtJHttb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKX0ubW9iaWBcbiAgICB0aGlzLmJyb3dzZXIub25jZSgnZG93bmxvYWQnLCAoc3RhdGUsIGRvd25sb2FkSXRlbSkgPT4ge1xuICAgICAgaWYoc3RhdGUgPT0gJ3N0YXJ0ZWQnKXtcbiAgICAgICAgbG9nKGBkb3dubG9hZCBzdGFydGVkIHRvICR7ZmlsZW5hbWV9YClcbiAgICAgICAgdGhpcy5icm93c2VyLmVtaXQoJ2Rvd25sb2FkJywgZmlsZW5hbWUsIGRvd25sb2FkSXRlbSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuYnJvd3Nlci5kb3dubG9hZE1hbmFnZXIoKVxuICAgICAgLmdvdG8oJ2h0dHBzOi8vd3d3LnB1Ymxpby5wbC9rbGllbnQvbG9nb3dhbmllLmh0bWwnKVxuICAgICAgLnZpZXdwb3J0KDIwMTQsIDc2OClcbiAgICAgIC50eXBlKCcjal91c2VybmFtZScsIHByb2Nlc3MuZW52WydMT0dJTiddKVxuICAgICAgLnR5cGUoJyNqX3Bhc3N3b3JkJywgcHJvY2Vzcy5lbnZbJ1BBU1NXT1JEJ10pXG4gICAgICAuY2xpY2soJy5idG4tbG9naW4nKVxuICAgICAgLndhaXQoMTAwMClcbiAgICAgIC53YWl0KCdhLnVzZXJuYW1lJylcbiAgICAgIC5nb3RvKFwiaHR0cHM6Ly93d3cucHVibGlvLnBsL2tsaWVudC9wdWJsaWthY2plLmh0bWw/cHJlc3NUaXRsZT05MTQxN1wiKVxuICAgICAgLndhaXQoJy5kb3dubG9hZFN0YXR1cycpXG4gICAgICAuY2xpY2soJy5kb3dubG9hZFN0YXR1cyAuYnRuLXNpbXBsZScpXG4gICAgICAud2FpdCgnLnByb2R1Y3REb3dubG9hZEluZm8nKVxuICAgICAgLmNsaWNrKFwiaW5wdXRbbmFtZV49J2Rvd25sb2FkUGFja2FnZSddW3ZhbHVlPSc2J11cIilcbiAgICAgIC5jbGljaygnLmJ0bi1zaW1wbGUubVIxMCcpXG4gICAgICAud2FpdERvd25sb2Fkc0NvbXBsZXRlKClcbiAgICAgIC5lbmQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgICAgfSlcbiAgfVxufVxuXG5jb25zdCBtb3JuaW5nR2F6ZXRhID0gKCkgPT4ge1xuICBsb2coJ21vcm5pbmdHYXpldGEgam9iIHN0YXJ0ZWQnKVxuICBjb25zdCBib3QgPSBuZXcgQm9va2JvdCgpXG4gIGJvdC5nZXRHYXpldGEoKVxuICAgIC50aGVuKGZuID0+IGJvdC5zZW5kQXR0YWNobWVudChmbikpXG4gICAgLnRoZW4oeCA9PiBjb25zb2xlLmluZm8oJ01vcm5pbmcgR2F6ZXRhIGRlbGl2ZXJlZCEnKSlcbn1cblxubmV3IENyb25Kb2IoJzAgMCA3ICogKicsIG1vcm5pbmdHYXpldGEsIG51bGwsIHRydWUsICdFdXJvcGUvV2Fyc2F3JylcbiJdfQ==