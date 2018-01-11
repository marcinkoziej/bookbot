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

morningGazeta();
new _cron.CronJob('0 0 7 * *', morningGazeta, null, true, 'Europe/Warsaw');
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2Jvb2tib3QuanMiXSwibmFtZXMiOlsiY29uZmlnIiwibG9nIiwiQm9va2JvdCIsIm1haWxlciIsImNyZWF0ZVRyYW5zcG9ydCIsImhvc3QiLCJwcm9jZXNzIiwiZW52IiwicG9ydCIsInNlY3VyZSIsImF1dGgiLCJ1c2VyIiwicGFzcyIsImJyb3dzZXIiLCJzaG93IiwiZmlsZXBhdGgiLCJtc2ciLCJzZW5kZXIiLCJmcm9tIiwidG8iLCJzdWJqZWN0IiwiaHRtbCIsImF0dGFjaG1lbnRzIiwiZmlsZW5hbWUiLCJiYXNlbmFtZSIsInBhdGgiLCJwcm9taXNlIiwib2siLCJmYWlsIiwic2VuZE1haWwiLCJlcnIiLCJpbmZvIiwiZm9ybWF0Iiwib25jZSIsInN0YXRlIiwiZG93bmxvYWRJdGVtIiwiZW1pdCIsImRvd25sb2FkTWFuYWdlciIsImdvdG8iLCJ2aWV3cG9ydCIsInR5cGUiLCJjbGljayIsIndhaXQiLCJ3YWl0RG93bmxvYWRzQ29tcGxldGUiLCJlbmQiLCJ0aGVuIiwibW9ybmluZ0dhemV0YSIsImJvdCIsImdldEdhemV0YSIsInNlbmRBdHRhY2htZW50IiwiZm4iLCJjb25zb2xlIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7QUFSQSxpQkFBT0EsTUFBUDs7O0FBVUEsSUFBTUMsTUFBTSxxQkFBTSxTQUFOLENBQVo7O0FBRUE7O0lBRU1DLE87QUFDSixxQkFBYztBQUFBOztBQUNaLFNBQUtDLE1BQUwsR0FBYyxxQkFBV0MsZUFBWCxDQUEyQjtBQUN2Q0MsWUFBTUMsUUFBUUMsR0FBUixDQUFZLGFBQVosQ0FEaUM7QUFFdkNDLFlBQU0sR0FGaUM7QUFHdkNDLGNBQVEsS0FIK0I7QUFJdkNDLFlBQU07QUFDSkMsY0FBTUwsUUFBUUMsR0FBUixDQUFZLE9BQVosQ0FERjtBQUVKSyxjQUFNTixRQUFRQyxHQUFSLENBQVksZUFBWjtBQUZGO0FBSmlDLEtBQTNCLENBQWQ7QUFTQSxTQUFLTSxPQUFMLEdBQWUsd0JBQWMsRUFBQ0MsTUFBTSxJQUFQLEVBQWQsQ0FBZjtBQUVEOzs7O21DQUVjQyxRLEVBQVU7QUFBQTs7QUFDdkJkLCtCQUF1QmMsUUFBdkI7QUFDQSxVQUFNQyxNQUFNO0FBQ1ZDLGdCQUFRWCxRQUFRQyxHQUFSLENBQVksT0FBWixDQURFO0FBRVZXLDhCQUFvQlosUUFBUUMsR0FBUixDQUFZLE9BQVosQ0FBcEIsTUFGVTtBQUdWWSxZQUFJYixRQUFRQyxHQUFSLENBQVksSUFBWixDQUhNO0FBSVZhLGlCQUFTLG1CQUpDO0FBS1ZDLGNBQU0scUNBTEk7QUFNVkMscUJBQWE7QUFDWEMsb0JBQVUsZUFBS0MsUUFBTCxDQUFjVCxRQUFkLENBREM7QUFFWFUsZ0JBQU1WO0FBRks7QUFOSCxPQUFaO0FBV0EsYUFBTyxlQUFLVyxPQUFMLENBQWEsVUFBQ0MsRUFBRCxFQUFLQyxJQUFMLEVBQWM7QUFDaEMsY0FBS3pCLE1BQUwsQ0FBWTBCLFFBQVosQ0FBcUJiLEdBQXJCLEVBQTBCLFVBQUNjLEdBQUQsRUFBTUMsSUFBTixFQUFlO0FBQ3ZDLGNBQUlELEdBQUosRUFBUztBQUNQN0IsZ0JBQUk2QixHQUFKO0FBQ0EsbUJBQU9GLEtBQUtFLEdBQUwsQ0FBUDtBQUNEO0FBQ0QsaUJBQU9ILElBQVA7QUFDRCxTQU5EO0FBT0QsT0FSTSxDQUFQO0FBU0Q7OztnQ0FFVztBQUFBOztBQUNWLFVBQU1KLHlCQUF1Qix3QkFBU1MsTUFBVCxDQUFnQixZQUFoQixDQUF2QixVQUFOO0FBQ0EsV0FBS25CLE9BQUwsQ0FBYW9CLElBQWIsQ0FBa0IsVUFBbEIsRUFBOEIsVUFBQ0MsS0FBRCxFQUFRQyxZQUFSLEVBQXlCO0FBQ3JELFlBQUdELFNBQVMsU0FBWixFQUFzQjtBQUNwQmpDLHVDQUEyQnNCLFFBQTNCO0FBQ0EsaUJBQUtWLE9BQUwsQ0FBYXVCLElBQWIsQ0FBa0IsVUFBbEIsRUFBOEJiLFFBQTlCLEVBQXdDWSxZQUF4QztBQUNEO0FBQ0YsT0FMRDtBQU1BLGFBQU8sS0FBS3RCLE9BQUwsQ0FBYXdCLGVBQWIsR0FDSkMsSUFESSxDQUNDLDZDQURELEVBRUpDLFFBRkksQ0FFSyxJQUZMLEVBRVcsR0FGWCxFQUdKQyxJQUhJLENBR0MsYUFIRCxFQUdnQmxDLFFBQVFDLEdBQVIsQ0FBWSxPQUFaLENBSGhCLEVBSUppQyxJQUpJLENBSUMsYUFKRCxFQUlnQmxDLFFBQVFDLEdBQVIsQ0FBWSxVQUFaLENBSmhCLEVBS0prQyxLQUxJLENBS0UsWUFMRixFQU1KQyxJQU5JLENBTUMsSUFORCxFQU9KQSxJQVBJLENBT0MsWUFQRCxFQVFKSixJQVJJLENBUUMsK0RBUkQsRUFTSkksSUFUSSxDQVNDLGlCQVRELEVBVUpELEtBVkksQ0FVRSw2QkFWRixFQVdKQyxJQVhJLENBV0Msc0JBWEQsRUFZSkQsS0FaSSxDQVlFLDJDQVpGLEVBYUpBLEtBYkksQ0FhRSxrQkFiRixFQWNKRSxxQkFkSSxHQWVKQyxHQWZJLEdBZUVDLElBZkYsQ0FlTyxZQUFNO0FBQ2hCLGVBQU90QixRQUFQO0FBQ0QsT0FqQkksQ0FBUDtBQWtCRDs7Ozs7O0FBR0gsSUFBTXVCLGdCQUFnQixTQUFoQkEsYUFBZ0IsR0FBTTtBQUMxQjdDLE1BQUksMkJBQUo7QUFDQSxNQUFNOEMsTUFBTSxJQUFJN0MsT0FBSixFQUFaO0FBQ0E2QyxNQUFJQyxTQUFKLEdBQ0dILElBREgsQ0FDUTtBQUFBLFdBQU1FLElBQUlFLGNBQUosQ0FBbUJDLEVBQW5CLENBQU47QUFBQSxHQURSLEVBRUdMLElBRkgsQ0FFUTtBQUFBLFdBQUtNLFFBQVFwQixJQUFSLENBQWEsMkJBQWIsQ0FBTDtBQUFBLEdBRlI7QUFHRCxDQU5EOztBQVFBZTtBQUNBLGtCQUFZLFdBQVosRUFBeUJBLGFBQXpCLEVBQXdDLElBQXhDLEVBQThDLElBQTlDLEVBQW9ELGVBQXBEIiwiZmlsZSI6ImJvb2tib3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZG90ZW52IGZyb20gJ2RvdGVudidcbmRvdGVudi5jb25maWcoKVxuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5pbXBvcnQgbm9kZW1haWxlciBmcm9tICdub2RlbWFpbGVyJ1xuaW1wb3J0IG5pZ2h0bWFyZSBmcm9tICduaWdodG1hcmUnXG5pbXBvcnQgbmlnaHRtYXJlRG93bmxvYWRNYW5hZ2VyIGZyb20gJ25pZ2h0bWFyZS1kb3dubG9hZC1tYW5hZ2VyJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBkZWJ1ZyBmcm9tICdkZWJ1ZydcbmltcG9ydCB3aGVuIGZyb20gJ3doZW4nXG5pbXBvcnQge0Nyb25Kb2J9IGZyb20gJ2Nyb24nXG5cbmNvbnN0IGxvZyA9IGRlYnVnKCdib29rYm90JylcblxubmlnaHRtYXJlRG93bmxvYWRNYW5hZ2VyKG5pZ2h0bWFyZSlcblxuY2xhc3MgQm9va2JvdCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubWFpbGVyID0gbm9kZW1haWxlci5jcmVhdGVUcmFuc3BvcnQoe1xuICAgICAgaG9zdDogcHJvY2Vzcy5lbnZbJ1NNVFBfU0VSVkVSJ10sXG4gICAgICBwb3J0OiA1ODcsXG4gICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgYXV0aDoge1xuICAgICAgICB1c2VyOiBwcm9jZXNzLmVudlsnRU1BSUwnXSxcbiAgICAgICAgcGFzczogcHJvY2Vzcy5lbnZbJ1NNVFBfUEFTU1dPUkQnXVxuICAgICAgfVxuICAgIH0pXG4gICAgdGhpcy5icm93c2VyID0gbmV3IG5pZ2h0bWFyZSh7c2hvdzogdHJ1ZX0pO1xuXG4gIH1cblxuICBzZW5kQXR0YWNobWVudChmaWxlcGF0aCkge1xuICAgIGxvZyhgc2VuZCBhdHRhY2htZW50ICR7ZmlsZXBhdGh9YClcbiAgICBjb25zdCBtc2cgPSB7XG4gICAgICBzZW5kZXI6IHByb2Nlc3MuZW52WydFTUFJTCddLFxuICAgICAgZnJvbTogYEFrY2phIEJvdCA8JHtwcm9jZXNzLmVudlsnRU1BSUwnXX0+YCxcbiAgICAgIHRvOiBwcm9jZXNzLmVudlsnVE8nXSxcbiAgICAgIHN1YmplY3Q6ICdEemlzaWVqc3phIGdhemV0YScsXG4gICAgICBodG1sOiAnVyB6YcWCxIVjem5rdSBkemlzaWVqc3phIGdhemV0YSAmbHQ7MycsXG4gICAgICBhdHRhY2htZW50czoge1xuICAgICAgICBmaWxlbmFtZTogcGF0aC5iYXNlbmFtZShmaWxlcGF0aCksXG4gICAgICAgIHBhdGg6IGZpbGVwYXRoXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB3aGVuLnByb21pc2UoKG9rLCBmYWlsKSA9PiB7XG4gICAgICB0aGlzLm1haWxlci5zZW5kTWFpbChtc2csIChlcnIsIGluZm8pID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGxvZyhlcnIpXG4gICAgICAgICAgcmV0dXJuIGZhaWwoZXJyKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvaygpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBnZXRHYXpldGEoKSB7XG4gICAgY29uc3QgZmlsZW5hbWUgPSBgLi9nYXpldGEtJHttb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKX0ubW9iaWBcbiAgICB0aGlzLmJyb3dzZXIub25jZSgnZG93bmxvYWQnLCAoc3RhdGUsIGRvd25sb2FkSXRlbSkgPT4ge1xuICAgICAgaWYoc3RhdGUgPT0gJ3N0YXJ0ZWQnKXtcbiAgICAgICAgbG9nKGBkb3dubG9hZCBzdGFydGVkIHRvICR7ZmlsZW5hbWV9YClcbiAgICAgICAgdGhpcy5icm93c2VyLmVtaXQoJ2Rvd25sb2FkJywgZmlsZW5hbWUsIGRvd25sb2FkSXRlbSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuYnJvd3Nlci5kb3dubG9hZE1hbmFnZXIoKVxuICAgICAgLmdvdG8oJ2h0dHBzOi8vd3d3LnB1Ymxpby5wbC9rbGllbnQvbG9nb3dhbmllLmh0bWwnKVxuICAgICAgLnZpZXdwb3J0KDIwMTQsIDc2OClcbiAgICAgIC50eXBlKCcjal91c2VybmFtZScsIHByb2Nlc3MuZW52WydMT0dJTiddKVxuICAgICAgLnR5cGUoJyNqX3Bhc3N3b3JkJywgcHJvY2Vzcy5lbnZbJ1BBU1NXT1JEJ10pXG4gICAgICAuY2xpY2soJy5idG4tbG9naW4nKVxuICAgICAgLndhaXQoMTAwMClcbiAgICAgIC53YWl0KCdhLnVzZXJuYW1lJylcbiAgICAgIC5nb3RvKFwiaHR0cHM6Ly93d3cucHVibGlvLnBsL2tsaWVudC9wdWJsaWthY2plLmh0bWw/cHJlc3NUaXRsZT05MTQxN1wiKVxuICAgICAgLndhaXQoJy5kb3dubG9hZFN0YXR1cycpXG4gICAgICAuY2xpY2soJy5kb3dubG9hZFN0YXR1cyAuYnRuLXNpbXBsZScpXG4gICAgICAud2FpdCgnLnByb2R1Y3REb3dubG9hZEluZm8nKVxuICAgICAgLmNsaWNrKFwiaW5wdXRbbmFtZV49J2Rvd25sb2FkUGFja2FnZSddW3ZhbHVlPSc2J11cIilcbiAgICAgIC5jbGljaygnLmJ0bi1zaW1wbGUubVIxMCcpXG4gICAgICAud2FpdERvd25sb2Fkc0NvbXBsZXRlKClcbiAgICAgIC5lbmQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgICAgfSlcbiAgfVxufVxuXG5jb25zdCBtb3JuaW5nR2F6ZXRhID0gKCkgPT4ge1xuICBsb2coJ21vcm5pbmdHYXpldGEgam9iIHN0YXJ0ZWQnKVxuICBjb25zdCBib3QgPSBuZXcgQm9va2JvdCgpXG4gIGJvdC5nZXRHYXpldGEoKVxuICAgIC50aGVuKGZuID0+IGJvdC5zZW5kQXR0YWNobWVudChmbikpXG4gICAgLnRoZW4oeCA9PiBjb25zb2xlLmluZm8oJ01vcm5pbmcgR2F6ZXRhIGRlbGl2ZXJlZCEnKSlcbn1cblxubW9ybmluZ0dhemV0YSgpXG5uZXcgQ3JvbkpvYignMCAwIDcgKiAqJywgbW9ybmluZ0dhemV0YSwgbnVsbCwgdHJ1ZSwgJ0V1cm9wZS9XYXJzYXcnKVxuIl19