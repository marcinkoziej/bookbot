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
    firstname: 'Marcin', lastname: 'Komar', postcode: '00-123', email: 'marcin@aaaaaaa.xyz',
    address1: 'Kwiatowa 123', town: 'Warszawa', body: 'Jestem niezadowolony'
  };
  var bot = new KrritBot(p, m);
  bot.complaint();
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9rcnJpdC5qcyJdLCJuYW1lcyI6WyJjb25maWciLCJsb2ciLCJhcmdzIiwiY3JlYXRlIiwiYmluZEhlbHAiLCJwYXJzZVN5c3RlbSIsIktycml0Qm90IiwicHJvZ3JhbSIsInJtYWlsIiwibWFnaWNOdW1iZXIiLCJtYWlsZXIiLCJjcmVhdGVUcmFuc3BvcnQiLCJob3N0IiwicHJvY2VzcyIsImVudiIsInBvcnQiLCJzZWN1cmUiLCJhdXRoIiwidXNlciIsInBhc3MiLCJicm93c2VyIiwic2hvdyIsImxhYmVsIiwidmFsdWUiLCJpbnB1dElkIiwiJCIsImF0dHIiLCJpbnB1dCIsImxlbmd0aCIsInZhbCIsImdvdG8iLCJ2aWV3cG9ydCIsIndhaXQiLCJ0aGVuIiwiY2FwdGNoYSIsImV2YWx1YXRlIiwiZnJhbWUiLCJkb2N1bWVudCIsImdldEVsZW1lbnRzQnlOYW1lIiwiY29udGVudFdpbmRvdyIsInF1ZXJ5U2VsZWN0b3IiLCJjaGlsZE5vZGVzIiwibm9kZVZhbHVlIiwicHV6emxlIiwiY29uc29sZSIsInJlcGxhY2UiLCJldmFsIiwiZmlsbE91dEZpZWxkcyIsImZpZWxkcyIsImZpcnN0bmFtZSIsImxhc3RuYW1lIiwiYWRkcmVzczEiLCJwb3N0Y29kZSIsInRvd24iLCJlbWFpbCIsInRpdGxlIiwiZXBpc29kZSIsImRhdGVfdGltZSIsInN1YmplY3QiLCJib2R5IiwiT2JqZWN0Iiwia2V5cyIsInJlZHVjZSIsInAiLCJmaWVsZCIsInJlc3VsdHMiLCJmaWxsT3V0IiwiaXNGaWxsZWQiLCJwdXNoIiwicmVzb2x2ZSIsImNoZWNrIiwib3B0aW9ucyIsImMiLCJnYXpldGFTdHIiLCJHIiwidHlnb2RuaWtTdHIiLCJUIiwibW9ybmluZ0dhemV0YSIsInN1bmRheVR5Z29kbmlrIiwibSIsImJvdCIsImNvbXBsYWludCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FB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LENBQWIsSUFBa0IsY0FBcEM7QUFDQWhDLFVBQVEzQyxHQUFSLHNCQUErQndFLFNBQS9CO0FBQ0Esb0JBQVlBLFNBQVosRUFBdUJJLGFBQXZCLEVBQXNDLElBQXRDLEVBQTRDLElBQTVDLEVBQWtELGVBQWxEO0FBQ0FqQyxVQUFRM0MsR0FBUix3QkFBaUMwRSxXQUFqQztBQUNBLG9CQUFZQSxXQUFaLEVBQXlCRyxjQUF6QixFQUF5QyxJQUF6QyxFQUErQyxJQUEvQyxFQUFxRCxlQUFyRDtBQUNELENBUEQsTUFPTztBQUNMLE1BQU1mLElBQUk7QUFDUlIsV0FBTyxTQURDLEVBQ1VDLFNBQVMsZUFEbkIsRUFDb0NDLFdBQVc7QUFEL0MsR0FBVjtBQUdBLE1BQU1zQixJQUFJO0FBQ1I5QixlQUFXLFFBREgsRUFDYUMsVUFBVSxPQUR2QixFQUNnQ0UsVUFBVSxRQUQxQyxFQUNvREUsT0FBTyxvQkFEM0Q7QUFFUkgsY0FBVSxjQUZGLEVBRWtCRSxNQUFNLFVBRnhCLEVBRW9DTSxNQUFNO0FBRjFDLEdBQVY7QUFJQSxNQUFNcUIsTUFBTSxJQUFJMUUsUUFBSixDQUFheUQsQ0FBYixFQUFnQmdCLENBQWhCLENBQVo7QUFDQUMsTUFBSUMsU0FBSjtBQUNEIiwiZmlsZSI6Imtycml0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGRvdGVudiBmcm9tICdkb3RlbnYnXG5kb3RlbnYuY29uZmlnKClcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50J1xuaW1wb3J0IG5vZGVtYWlsZXIgZnJvbSAnbm9kZW1haWxlcidcbmltcG9ydCBuaWdodG1hcmUgZnJvbSAnbmlnaHRtYXJlJ1xuaW1wb3J0IG5pZ2h0bWFyZURvd25sb2FkTWFuYWdlciBmcm9tICduaWdodG1hcmUtZG93bmxvYWQtbWFuYWdlcidcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnXG5pbXBvcnQgd2hlbiBmcm9tICd3aGVuJ1xuaW1wb3J0IHtDcm9uSm9ifSBmcm9tICdjcm9uJ1xuaW1wb3J0IGdldG9wdCBmcm9tICdub2RlLWdldG9wdCdcblxuY29uc3QgbG9nID0gZGVidWcoJ2tycml0Ym90JylcbmNvbnN0IGFyZ3MgPSBnZXRvcHQuY3JlYXRlKFtcbiAgWydjJywgJycsICdydW4gY3JvbiddXG5dKS5iaW5kSGVscCgpLnBhcnNlU3lzdGVtKClcblxubmlnaHRtYXJlRG93bmxvYWRNYW5hZ2VyKG5pZ2h0bWFyZSlcblxuZXhwb3J0IGNsYXNzIEtycml0Qm90IHtcbiAgY29uc3RydWN0b3IocHJvZ3JhbSwgcm1haWwpIHtcbiAgICB0aGlzLnByb2dyYW0gPSBwcm9ncmFtXG4gICAgdGhpcy5ybWFpbCA9IHJtYWlsXG4gICAgdGhpcy5tYWdpY051bWJlciA9IG51bGxcbiAgICB0aGlzLm1haWxlciA9IG5vZGVtYWlsZXIuY3JlYXRlVHJhbnNwb3J0KHtcbiAgICAgIGhvc3Q6IHByb2Nlc3MuZW52WydTTVRQX1NFUlZFUiddLFxuICAgICAgcG9ydDogNTg3LFxuICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIGF1dGg6IHtcbiAgICAgICAgdXNlcjogcHJvY2Vzcy5lbnZbJ0VNQUlMJ10sXG4gICAgICAgIHBhc3M6IHByb2Nlc3MuZW52WydTTVRQX1BBU1NXT1JEJ11cbiAgICAgIH1cbiAgICB9KVxuICAgIHRoaXMuYnJvd3NlciA9IG5ldyBuaWdodG1hcmUoe3Nob3c6ICEocHJvY2Vzcy5lbnZbJ0RJU1BMQVknXT09PW51bGwpfSk7XG5cbiAgfVxuXG4gIC8vIHRoaXMgZnVuY3Rpb24gaXMgc2VudCB0byB0aGUgYnJvd3NlclxuICBmaWxsT3V0KGxhYmVsLCB2YWx1ZSkge1xuICAgIGNvbnN0IGlucHV0SWQgPSAkKGBsYWJlbDpjb250YWlucygnJHtsYWJlbH0nKWApLmF0dHIoJ2ZvcicpXG4gICAgY29uc3QgaW5wdXQgPSAkKGAjJHtpbnB1dElkfWApXG5cbiAgICBpZiAoaW5wdXQubGVuZ3RoID09IDEpIHtcbiAgICAgIGlucHV0LnZhbCh2YWx1ZSlcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSAgZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cblxuICBjb21wbGFpbnQoKSB7XG4gICAgcmV0dXJuIHRoaXMuYnJvd3NlclxuICAgICAgLmdvdG8oJ2h0dHBzOi8vd3d3Lmtycml0Lmdvdi5wbC9kbGEtYWJvbmVudG93LWkta29uc3VtZW50b3cva29udGFrdC1pLWZvcm11bGFyemUvc2thcmdpLWktd25pb3NraS8nKVxuICAgICAgLnZpZXdwb3J0KDEwMjQsIDk2OClcbiAgICAgIC53YWl0KDEwMDApLnRoZW4oKCkgPT4gdGhpcy5jYXB0Y2hhKCkpXG4gIH1cblxuICBjYXB0Y2hhKCkge1xuICAgIHJldHVybiB0aGlzLmJyb3dzZXIuZXZhbHVhdGUoKCkgPT4ge1xuICAgICAgICBjb25zdCBmcmFtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdjYXB0Y2hhJylbMF1cbiAgICAgICAgcmV0dXJuIGZyYW1lLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmNhcHRjaGEgcCcpLmNoaWxkTm9kZXNbMF0ubm9kZVZhbHVlXG4gICAgICB9KS50aGVuKChwdXp6bGUpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYG15c3RlcmlvdXMgcHV6emxlIGlzICR7cHV6emxlfWApXG4gICAgICAgIHB1enpsZSA9IHB1enpsZS5yZXBsYWNlKCd4JywgJyonKVxuICAgICAgICB0aGlzLm1hZ2ljTnVtYmVyID0gZXZhbChwdXp6bGUpXG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZmlsbE91dEZpZWxkcygpXG4gICAgICB9KVxuICB9XG5cbiAgZmlsbE91dEZpZWxkcygpXG4gIHtcbiAgICBjb25zdCBmaWVsZHMgPSB7XG4gICAgICAnSW1pxJkgaSBuYXp3aXNrbyc6IGAke3RoaXMucm1haWwuZmlyc3RuYW1lfSAke3RoaXMucm1haWwubGFzdG5hbWV9YCxcbiAgICAgICd1bGljYSc6IGAke3RoaXMucm1haWwuYWRkcmVzczF9LCAke3RoaXMucm1haWwucG9zdGNvZGV9LCAke3RoaXMucm1haWwudG93bn1gLFxuICAgICAgJ0FkcmVzIGUtbWFpbCc6IGAke3RoaXMucm1haWwuZW1haWx9YCxcbiAgICAgICdOYXp3YSBwcm9ncmFtdSc6IHRoaXMucHJvZ3JhbS50aXRsZSxcbiAgICAgICdUeXR1xYIgYXVkeWNqaSc6IHRoaXMucHJvZ3JhbS5lcGlzb2RlLFxuICAgICAgJ0RhdGEgaSBnb2R6aW5hJzogdGhpcy5wcm9ncmFtLmRhdGVfdGltZSxcbiAgICAgICdUcmXFm8SHIHNrYXJnaSc6ICh0aGlzLnJtYWlsLnN1YmplY3QgPyBgJHt0aGlzLnJtYWlsLnN1YmplY3R9XFxuJHt0aGlzLnJtYWlsLmJvZHl9YCA6IHRoaXMucm1haWwuYm9keSksXG4gICAgICAnS29kIG9icmF6a293eSc6IHRoaXMubWFnaWNOdW1iZXIsXG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMoZmllbGRzKS5yZWR1Y2UoKHAsIGZpZWxkKSA9PiB7XG4gICAgICByZXR1cm4gcC50aGVuKChyZXN1bHRzKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLmJyb3dzZXIuZXZhbHVhdGUodGhpcy5maWxsT3V0LCBmaWVsZCwgZmllbGRzW2ZpZWxkXSkuXG4gICAgICAgICAgdGhlbihpc0ZpbGxlZCA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgRmlsbGVkICR7ZmllbGR9PyAke2lzRmlsbGVkfWApXG4gICAgICAgICAgICByZXN1bHRzLnB1c2goaXNGaWxsZWQpXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0c1xuICAgICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0sIHdoZW4ucmVzb2x2ZShbXSkpLnRoZW4oKHJlc3VsdHMpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKGByZXN1bHRzOiAke3Jlc3VsdHN9YClcbiAgICAgIHJldHVybiB0aGlzLmJyb3dzZXIuY2hlY2soJ1tuYW1lPUZpZWxkXzAwMDE5XScpIC8vLmVuZCgpXG4gICAgfSlcbiAgfVxuXG59XG5cblxuaWYgKGFyZ3Mub3B0aW9ucy5jKSB7XG4gIGxldCBnYXpldGFTdHIgPSBhcmdzLm9wdGlvbnMuRyB8fCAnMCAwIDcgKiAqIConXG4gIGxldCB0eWdvZG5pa1N0ciA9IGFyZ3Mub3B0aW9ucy5UIHx8ICcwIDMwIDcgKiAqIDAnXG4gIGNvbnNvbGUubG9nKGBnYXpldGEgc2NoZWR1bGUgJHtnYXpldGFTdHJ9YClcbiAgbmV3IENyb25Kb2IoZ2F6ZXRhU3RyLCBtb3JuaW5nR2F6ZXRhLCBudWxsLCB0cnVlLCAnRXVyb3BlL1dhcnNhdycpXG4gIGNvbnNvbGUubG9nKGB0eWdvZG5payBzY2hlZHVsZSAke3R5Z29kbmlrU3RyfWApXG4gIG5ldyBDcm9uSm9iKHR5Z29kbmlrU3RyLCBzdW5kYXlUeWdvZG5paywgbnVsbCwgdHJ1ZSwgJ0V1cm9wZS9XYXJzYXcnKVxufSBlbHNlIHtcbiAgY29uc3QgcCA9IHtcbiAgICB0aXRsZTogJ0d1bWlzaWUnLCBlcGlzb2RlOiAnQXRhayB0cnptaWVsaScsIGRhdGVfdGltZTogJzEgbWFyY2EgMjAxNydcbiAgfVxuICBjb25zdCBtID0ge1xuICAgIGZpcnN0bmFtZTogJ01hcmNpbicsIGxhc3RuYW1lOiAnS29tYXInLCBwb3N0Y29kZTogJzAwLTEyMycsIGVtYWlsOiAnbWFyY2luQGFhYWFhYWEueHl6JyxcbiAgICBhZGRyZXNzMTogJ0t3aWF0b3dhIDEyMycsIHRvd246ICdXYXJzemF3YScsIGJvZHk6ICdKZXN0ZW0gbmllemFkb3dvbG9ueSdcbiAgfVxuICBjb25zdCBib3QgPSBuZXcgS3JyaXRCb3QocCwgbSlcbiAgYm90LmNvbXBsYWludCgpXG59XG4iXX0=