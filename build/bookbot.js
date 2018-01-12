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
  var cronStr = args.options.C || '0 0 7 * * *';
  log('Newspaper delivery schedule: ' + cronStr);
  new _cron.CronJob(cronStr, morningGazeta, null, true, 'Europe/Warsaw');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2Jvb2tib3QuanMiXSwibmFtZXMiOlsiY29uZmlnIiwibG9nIiwiYXJncyIsImNyZWF0ZSIsImJpbmRIZWxwIiwicGFyc2VTeXN0ZW0iLCJCb29rYm90IiwibWFpbGVyIiwiY3JlYXRlVHJhbnNwb3J0IiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJwb3J0Iiwic2VjdXJlIiwiYXV0aCIsInVzZXIiLCJwYXNzIiwiYnJvd3NlciIsInNob3ciLCJmaWxlcGF0aCIsIm1zZyIsInNlbmRlciIsImZyb20iLCJ0byIsInN1YmplY3QiLCJodG1sIiwiYXR0YWNobWVudHMiLCJmaWxlbmFtZSIsImJhc2VuYW1lIiwicGF0aCIsInByb21pc2UiLCJvayIsImZhaWwiLCJzZW5kTWFpbCIsImVyciIsImluZm8iLCJmb3JtYXQiLCJvbmNlIiwic3RhdGUiLCJkb3dubG9hZEl0ZW0iLCJlbWl0IiwiZG93bmxvYWRNYW5hZ2VyIiwiZ290byIsInZpZXdwb3J0IiwidHlwZSIsImNsaWNrIiwid2FpdCIsIndhaXREb3dubG9hZHNDb21wbGV0ZSIsImVuZCIsInRoZW4iLCJtb3JuaW5nR2F6ZXRhIiwiYm90IiwiZ2V0R2F6ZXRhIiwic2VuZEF0dGFjaG1lbnQiLCJmbiIsImNvbnNvbGUiLCJvcHRpb25zIiwibiIsImMiLCJjcm9uU3RyIiwiQyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7Ozs7OztBQVRBLGlCQUFPQSxNQUFQOzs7QUFXQSxJQUFNQyxNQUFNLHFCQUFNLFNBQU4sQ0FBWjtBQUNBLElBQU1DLE9BQU8scUJBQU9DLE1BQVAsQ0FBYyxDQUN6QixDQUFDLEdBQUQsRUFBTSxFQUFOLEVBQVUsU0FBVixDQUR5QixFQUV6QixDQUFDLEdBQUQsRUFBTSxFQUFOLEVBQVUsVUFBVixDQUZ5QixFQUd6QixDQUFDLEdBQUQsRUFBTSxFQUFOLEVBQVUsYUFBVixDQUh5QixDQUFkLEVBSVZDLFFBSlUsR0FJQ0MsV0FKRCxFQUFiOztBQU1BOztJQUVhQyxPLFdBQUFBLE87QUFDWCxxQkFBYztBQUFBOztBQUNaLFNBQUtDLE1BQUwsR0FBYyxxQkFBV0MsZUFBWCxDQUEyQjtBQUN2Q0MsWUFBTUMsUUFBUUMsR0FBUixDQUFZLGFBQVosQ0FEaUM7QUFFdkNDLFlBQU0sR0FGaUM7QUFHdkNDLGNBQVEsS0FIK0I7QUFJdkNDLFlBQU07QUFDSkMsY0FBTUwsUUFBUUMsR0FBUixDQUFZLE9BQVosQ0FERjtBQUVKSyxjQUFNTixRQUFRQyxHQUFSLENBQVksZUFBWjtBQUZGO0FBSmlDLEtBQTNCLENBQWQ7QUFTQSxTQUFLTSxPQUFMLEdBQWUsd0JBQWMsRUFBQ0MsTUFBTSxFQUFFUixRQUFRQyxHQUFSLENBQVksU0FBWixNQUF5QixJQUEzQixDQUFQLEVBQWQsQ0FBZjtBQUVEOzs7O21DQUVjUSxRLEVBQVU7QUFBQTs7QUFDdkJsQiwrQkFBdUJrQixRQUF2QjtBQUNBLFVBQU1DLE1BQU07QUFDVkMsZ0JBQVFYLFFBQVFDLEdBQVIsQ0FBWSxPQUFaLENBREU7QUFFVlcsOEJBQW9CWixRQUFRQyxHQUFSLENBQVksT0FBWixDQUFwQixNQUZVO0FBR1ZZLFlBQUliLFFBQVFDLEdBQVIsQ0FBWSxJQUFaLENBSE07QUFJVmEsaUJBQVMsbUJBSkM7QUFLVkMsY0FBTSxxQ0FMSTtBQU1WQyxxQkFBYTtBQUNYQyxvQkFBVSxlQUFLQyxRQUFMLENBQWNULFFBQWQsQ0FEQztBQUVYVSxnQkFBTVY7QUFGSztBQU5ILE9BQVo7QUFXQSxhQUFPLGVBQUtXLE9BQUwsQ0FBYSxVQUFDQyxFQUFELEVBQUtDLElBQUwsRUFBYztBQUNoQyxjQUFLekIsTUFBTCxDQUFZMEIsUUFBWixDQUFxQmIsR0FBckIsRUFBMEIsVUFBQ2MsR0FBRCxFQUFNQyxJQUFOLEVBQWU7QUFDdkMsY0FBSUQsR0FBSixFQUFTO0FBQ1BqQyxnQkFBSWlDLEdBQUo7QUFDQSxtQkFBT0YsS0FBS0UsR0FBTCxDQUFQO0FBQ0Q7QUFDRCxpQkFBT0gsSUFBUDtBQUNELFNBTkQ7QUFPRCxPQVJNLENBQVA7QUFTRDs7O2dDQUVXO0FBQUE7O0FBQ1YsVUFBTUoseUJBQXVCLHdCQUFTUyxNQUFULENBQWdCLFlBQWhCLENBQXZCLFVBQU47QUFDQSxXQUFLbkIsT0FBTCxDQUFhb0IsSUFBYixDQUFrQixVQUFsQixFQUE4QixVQUFDQyxLQUFELEVBQVFDLFlBQVIsRUFBeUI7QUFDckQsWUFBR0QsU0FBUyxTQUFaLEVBQXNCO0FBQ3BCckMsdUNBQTJCMEIsUUFBM0I7QUFDQSxpQkFBS1YsT0FBTCxDQUFhdUIsSUFBYixDQUFrQixVQUFsQixFQUE4QmIsUUFBOUIsRUFBd0NZLFlBQXhDO0FBQ0Q7QUFDRixPQUxEO0FBTUEsYUFBTyxLQUFLdEIsT0FBTCxDQUFhd0IsZUFBYixHQUNKQyxJQURJLENBQ0MsNkNBREQsRUFFSkMsUUFGSSxDQUVLLElBRkwsRUFFVyxHQUZYLEVBR0pDLElBSEksQ0FHQyxhQUhELEVBR2dCbEMsUUFBUUMsR0FBUixDQUFZLE9BQVosQ0FIaEIsRUFJSmlDLElBSkksQ0FJQyxhQUpELEVBSWdCbEMsUUFBUUMsR0FBUixDQUFZLFVBQVosQ0FKaEIsRUFLSmtDLEtBTEksQ0FLRSxZQUxGLEVBTUpDLElBTkksQ0FNQyxJQU5ELEVBT0pBLElBUEksQ0FPQyxZQVBELEVBUUpKLElBUkksQ0FRQywrREFSRCxFQVNKSSxJQVRJLENBU0MsaUJBVEQsRUFVSkQsS0FWSSxDQVVFLDZCQVZGLEVBV0pDLElBWEksQ0FXQyxzQkFYRCxFQVlKRCxLQVpJLENBWUUsMkNBWkYsRUFhSkEsS0FiSSxDQWFFLGtCQWJGLEVBY0pFLHFCQWRJLEdBZUpDLEdBZkksR0FlRUMsSUFmRixDQWVPLFlBQU07QUFDaEIsZUFBT3RCLFFBQVA7QUFDRCxPQWpCSSxDQUFQO0FBa0JEOzs7Ozs7QUFHSSxJQUFNdUIsd0NBQWdCLFNBQWhCQSxhQUFnQixHQUFNO0FBQ2pDakQsTUFBSSwyQkFBSjtBQUNBLE1BQU1rRCxNQUFNLElBQUk3QyxPQUFKLEVBQVo7QUFDQTZDLE1BQUlDLFNBQUosR0FDR0gsSUFESCxDQUNRO0FBQUEsV0FBTUUsSUFBSUUsY0FBSixDQUFtQkMsRUFBbkIsQ0FBTjtBQUFBLEdBRFIsRUFFR0wsSUFGSCxDQUVRO0FBQUEsV0FBS00sUUFBUXBCLElBQVIsQ0FBYSwyQkFBYixDQUFMO0FBQUEsR0FGUjtBQUdELENBTk07O0FBUVAsSUFBSWpDLEtBQUtzRCxPQUFMLENBQWFDLENBQWpCLEVBQW9CO0FBQ2xCUDtBQUNEOztBQUVELElBQUloRCxLQUFLc0QsT0FBTCxDQUFhRSxDQUFqQixFQUFvQjtBQUNsQixNQUFJQyxVQUFVekQsS0FBS3NELE9BQUwsQ0FBYUksQ0FBYixJQUFrQixhQUFoQztBQUNBM0Qsd0NBQW9DMEQsT0FBcEM7QUFDQSxvQkFBWUEsT0FBWixFQUFxQlQsYUFBckIsRUFBb0MsSUFBcEMsRUFBMEMsSUFBMUMsRUFBZ0QsZUFBaEQ7QUFDRCIsImZpbGUiOiJib29rYm90LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGRvdGVudiBmcm9tICdkb3RlbnYnXG5kb3RlbnYuY29uZmlnKClcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50J1xuaW1wb3J0IG5vZGVtYWlsZXIgZnJvbSAnbm9kZW1haWxlcidcbmltcG9ydCBuaWdodG1hcmUgZnJvbSAnbmlnaHRtYXJlJ1xuaW1wb3J0IG5pZ2h0bWFyZURvd25sb2FkTWFuYWdlciBmcm9tICduaWdodG1hcmUtZG93bmxvYWQtbWFuYWdlcidcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnXG5pbXBvcnQgd2hlbiBmcm9tICd3aGVuJ1xuaW1wb3J0IHtDcm9uSm9ifSBmcm9tICdjcm9uJ1xuaW1wb3J0IGdldG9wdCBmcm9tICdub2RlLWdldG9wdCdcblxuY29uc3QgbG9nID0gZGVidWcoJ2Jvb2tib3QnKVxuY29uc3QgYXJncyA9IGdldG9wdC5jcmVhdGUoW1xuICBbJ24nLCAnJywgJ3J1biBub3cnXSxcbiAgWydjJywgJycsICdydW4gY3JvbiddLFxuICBbJ0MnLCAnJywgJ2Nyb24gc3RyaW5nJ10sIFxuXSkuYmluZEhlbHAoKS5wYXJzZVN5c3RlbSgpXG5cbm5pZ2h0bWFyZURvd25sb2FkTWFuYWdlcihuaWdodG1hcmUpXG5cbmV4cG9ydCBjbGFzcyBCb29rYm90IHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5tYWlsZXIgPSBub2RlbWFpbGVyLmNyZWF0ZVRyYW5zcG9ydCh7XG4gICAgICBob3N0OiBwcm9jZXNzLmVudlsnU01UUF9TRVJWRVInXSxcbiAgICAgIHBvcnQ6IDU4NyxcbiAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICBhdXRoOiB7XG4gICAgICAgIHVzZXI6IHByb2Nlc3MuZW52WydFTUFJTCddLFxuICAgICAgICBwYXNzOiBwcm9jZXNzLmVudlsnU01UUF9QQVNTV09SRCddXG4gICAgICB9XG4gICAgfSlcbiAgICB0aGlzLmJyb3dzZXIgPSBuZXcgbmlnaHRtYXJlKHtzaG93OiAhKHByb2Nlc3MuZW52WydESVNQTEFZJ109PT1udWxsKX0pO1xuXG4gIH1cblxuICBzZW5kQXR0YWNobWVudChmaWxlcGF0aCkge1xuICAgIGxvZyhgc2VuZCBhdHRhY2htZW50ICR7ZmlsZXBhdGh9YClcbiAgICBjb25zdCBtc2cgPSB7XG4gICAgICBzZW5kZXI6IHByb2Nlc3MuZW52WydFTUFJTCddLFxuICAgICAgZnJvbTogYEFrY2phIEJvdCA8JHtwcm9jZXNzLmVudlsnRU1BSUwnXX0+YCxcbiAgICAgIHRvOiBwcm9jZXNzLmVudlsnVE8nXSxcbiAgICAgIHN1YmplY3Q6ICdEemlzaWVqc3phIGdhemV0YScsXG4gICAgICBodG1sOiAnVyB6YcWCxIVjem5rdSBkemlzaWVqc3phIGdhemV0YSAmbHQ7MycsXG4gICAgICBhdHRhY2htZW50czoge1xuICAgICAgICBmaWxlbmFtZTogcGF0aC5iYXNlbmFtZShmaWxlcGF0aCksXG4gICAgICAgIHBhdGg6IGZpbGVwYXRoXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB3aGVuLnByb21pc2UoKG9rLCBmYWlsKSA9PiB7XG4gICAgICB0aGlzLm1haWxlci5zZW5kTWFpbChtc2csIChlcnIsIGluZm8pID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGxvZyhlcnIpXG4gICAgICAgICAgcmV0dXJuIGZhaWwoZXJyKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvaygpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBnZXRHYXpldGEoKSB7XG4gICAgY29uc3QgZmlsZW5hbWUgPSBgLi9nYXpldGEtJHttb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKX0ubW9iaWBcbiAgICB0aGlzLmJyb3dzZXIub25jZSgnZG93bmxvYWQnLCAoc3RhdGUsIGRvd25sb2FkSXRlbSkgPT4ge1xuICAgICAgaWYoc3RhdGUgPT0gJ3N0YXJ0ZWQnKXtcbiAgICAgICAgbG9nKGBkb3dubG9hZCBzdGFydGVkIHRvICR7ZmlsZW5hbWV9YClcbiAgICAgICAgdGhpcy5icm93c2VyLmVtaXQoJ2Rvd25sb2FkJywgZmlsZW5hbWUsIGRvd25sb2FkSXRlbSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuYnJvd3Nlci5kb3dubG9hZE1hbmFnZXIoKVxuICAgICAgLmdvdG8oJ2h0dHBzOi8vd3d3LnB1Ymxpby5wbC9rbGllbnQvbG9nb3dhbmllLmh0bWwnKVxuICAgICAgLnZpZXdwb3J0KDIwMTQsIDc2OClcbiAgICAgIC50eXBlKCcjal91c2VybmFtZScsIHByb2Nlc3MuZW52WydMT0dJTiddKVxuICAgICAgLnR5cGUoJyNqX3Bhc3N3b3JkJywgcHJvY2Vzcy5lbnZbJ1BBU1NXT1JEJ10pXG4gICAgICAuY2xpY2soJy5idG4tbG9naW4nKVxuICAgICAgLndhaXQoMTAwMClcbiAgICAgIC53YWl0KCdhLnVzZXJuYW1lJylcbiAgICAgIC5nb3RvKFwiaHR0cHM6Ly93d3cucHVibGlvLnBsL2tsaWVudC9wdWJsaWthY2plLmh0bWw/cHJlc3NUaXRsZT05MTQxN1wiKVxuICAgICAgLndhaXQoJy5kb3dubG9hZFN0YXR1cycpXG4gICAgICAuY2xpY2soJy5kb3dubG9hZFN0YXR1cyAuYnRuLXNpbXBsZScpXG4gICAgICAud2FpdCgnLnByb2R1Y3REb3dubG9hZEluZm8nKVxuICAgICAgLmNsaWNrKFwiaW5wdXRbbmFtZV49J2Rvd25sb2FkUGFja2FnZSddW3ZhbHVlPSc2J11cIilcbiAgICAgIC5jbGljaygnLmJ0bi1zaW1wbGUubVIxMCcpXG4gICAgICAud2FpdERvd25sb2Fkc0NvbXBsZXRlKClcbiAgICAgIC5lbmQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgICAgfSlcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgbW9ybmluZ0dhemV0YSA9ICgpID0+IHtcbiAgbG9nKCdtb3JuaW5nR2F6ZXRhIGpvYiBzdGFydGVkJylcbiAgY29uc3QgYm90ID0gbmV3IEJvb2tib3QoKVxuICBib3QuZ2V0R2F6ZXRhKClcbiAgICAudGhlbihmbiA9PiBib3Quc2VuZEF0dGFjaG1lbnQoZm4pKVxuICAgIC50aGVuKHggPT4gY29uc29sZS5pbmZvKCdNb3JuaW5nIEdhemV0YSBkZWxpdmVyZWQhJykpXG59XG5cbmlmIChhcmdzLm9wdGlvbnMubikge1xuICBtb3JuaW5nR2F6ZXRhKClcbn1cblxuaWYgKGFyZ3Mub3B0aW9ucy5jKSB7XG4gIGxldCBjcm9uU3RyID0gYXJncy5vcHRpb25zLkMgfHwgJzAgMCA3ICogKiAqJ1xuICBsb2coYE5ld3NwYXBlciBkZWxpdmVyeSBzY2hlZHVsZTogJHtjcm9uU3RyfWApXG4gIG5ldyBDcm9uSm9iKGNyb25TdHIsIG1vcm5pbmdHYXpldGEsIG51bGwsIHRydWUsICdFdXJvcGUvV2Fyc2F3Jylcbn1cbiJdfQ==