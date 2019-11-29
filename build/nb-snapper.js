'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchSnapshot = exports.createSnapshot = exports.NBSnapper = undefined;

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

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _when = require('when');

var _when2 = _interopRequireDefault(_when);

var _cron = require('cron');

var _nodeGetopt = require('node-getopt');

var _nodeGetopt2 = _interopRequireDefault(_nodeGetopt);

var _child_process = require('child_process');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

_dotenv2.default.config();


var log = (0, _debug2.default)('bookbot');
var args = _nodeGetopt2.default.create([['c', '', 'run cron'], ['r', '', 'restore snapshot to db'], ['R', '', ''], ['C', '=', 'cron string'], ['n', '=', 'snapshot name'], ['s', '', 'start snapshot'], ['f', '', 'fetch snapshot'], ['N', '=', 'snapshot filename']]).bindHelp().parseSystem();

(0, _nightmareDownloadManager2.default)(_nightmare2.default);

var NBSnapper = exports.NBSnapper = function () {
  function NBSnapper() {
    _classCallCheck(this, NBSnapper);

    this.mailer = _nodemailer2.default.createTransport({
      host: process.env['SMTP_SERVER'],
      port: 587,
      secure: false,
      auth: {
        user: process.env['EMAIL'],
        pass: process.env['SMTP_PASSWORD']
      }
    });
    this.nb = {
      url: process.env['NATIONBUILDER_URL']
    };
    this.database_url = process.env['DATABASE_URL'];
    this.browser = new _nightmare2.default({ show: !(process.env['DISPLAY'] === null) });
  }

  _createClass(NBSnapper, [{
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
    key: 'restoreSnapshot',
    value: function restoreSnapshot(filename) {
      if (!this.database_url) {
        log('no DATABASE_URL set');
        return;
      }
      if (!_fs2.default.existsSync(filename)) {
        log(filename + ' does not exist');
        return;
      }
      log('pg_restore -Fc -c -f "' + filename + '" url...');
      (0, _child_process.exec)('pg_restore -Fc -c -d ' + this.database_url + ' "' + filename + '"', {}, function (err, stdout, stderr) {
        if (stdout) {
          log(stdout);
        }
        if (err) {
          log(stderr);
          return;
        }
        _fs2.default.unlink(filename, function (err) {
          if (err) {
            log('error removing ' + filename + ': ' + err);
          }
        });
      });
    }
  }, {
    key: 'startSnapshot',
    value: function startSnapshot() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Daily snapshot';

      return this.login().wait(1000).goto(this.nb.url + '/admin/backups').type('#nation_backup_comment', name).click('[name="commit"]').end();
    }
  }, {
    key: 'fetchSnapshot',
    value: function fetchSnapshot() {
      var _this2 = this;

      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Daily snapshot';
      var filename = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'snapshot.snap';

      this.browser.once('download', function (state, downloadItem) {
        if (state == 'started') {
          log('download started to ' + filename);
          _this2.browser.emit('download', filename, downloadItem);
        }
      });

      return this.login().wait(1000).goto(this.nb.url + '/admin/backups').evaluate(function (name) {
        var rows = document.querySelector('table.table').querySelectorAll('tr');

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = rows[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var tr = _step.value;

            var td = tr.querySelector('td:nth-child(4)');
            if (td && td.innerHTML.includes(name)) {
              var dlink = tr.querySelector('td:nth-child(3) a');
              if (dlink) {
                dlink.click();
                return true;
              }
              return false;
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }, name).then(function (downloading) {
        if (downloading) {
          return _this2.browser.waitDownloadsComplete().end();
        } else {
          log('Snapshot ' + name + ' not ready yet');
          return _this2.browser.end();
        }
      });
    }
  }, {
    key: 'login',
    value: function login() {
      return this.browser.downloadManager().goto(this.nb.url + '/admin').viewport(2014, 768).type('#user_session_email', process.env['LOGIN']).type('#user_session_password', process.env['PASSWORD']).click('.submit-button');
    }
  }]);

  return NBSnapper;
}();

var nameForToday = function nameForToday() {
  var d = new Date();
  var ds = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDay();
  return {
    name: 'Daily snapshot ' + ds,
    filename: 'nb-snapshot-' + ds + '.db'
  };
};

var createSnapshot = exports.createSnapshot = function createSnapshot(name) {
  var n = nameForToday();
  if (!name) {
    name = n.name;
  }
  log('Star t snapshot named ' + name);
  var bot = new NBSnapper();
  bot.startSnapshot(name).then(function (r) {
    return log('ok ' + r);
  });
};

var fetchSnapshot = exports.fetchSnapshot = function fetchSnapshot(name, filename) {
  var n = nameForToday();
  if (!name) {
    name = n.name;
  }
  if (!filename) {
    filename = n.filename;
  }

  log('Fetch snapshot named ' + name + ' to ' + filename);
  var bot = new NBSnapper();
  bot.fetchSnapshot(name, filename).then(function () {
    if (args.options.r) {
      bot.restoreSnapshot(filename);
    }
  });
};

if (args.options.c) {
  var crontab = args.options.C || '0 0 7 * * *';
  new _cron.CronJob(crontab, createSnapshot, null, true, 'Europe/Warsaw');
}

if (args.options.s) {
  createSnapshot(args.options.n);
}

if (args.options.f) {
  fetchSnapshot(args.options.n, args.options.N);
}

if (args.options.R) {
  var bot = new NBSnapper();
  bot.restoreSnapshot(args.options.N);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9uYi1zbmFwcGVyLmpzIl0sIm5hbWVzIjpbImNvbmZpZyIsImxvZyIsImFyZ3MiLCJjcmVhdGUiLCJiaW5kSGVscCIsInBhcnNlU3lzdGVtIiwiTkJTbmFwcGVyIiwibWFpbGVyIiwiY3JlYXRlVHJhbnNwb3J0IiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJwb3J0Iiwic2VjdXJlIiwiYXV0aCIsInVzZXIiLCJwYXNzIiwibmIiLCJ1cmwiLCJkYXRhYmFzZV91cmwiLCJicm93c2VyIiwic2hvdyIsImZpbGVwYXRoIiwibXNnIiwic2VuZGVyIiwiZnJvbSIsImJjYyIsInN1YmplY3QiLCJodG1sIiwiYXR0YWNobWVudHMiLCJmaWxlbmFtZSIsImJhc2VuYW1lIiwicGF0aCIsInByb21pc2UiLCJvayIsImZhaWwiLCJzZW5kTWFpbCIsImVyciIsImluZm8iLCJleGlzdHNTeW5jIiwic3Rkb3V0Iiwic3RkZXJyIiwidW5saW5rIiwibmFtZSIsImxvZ2luIiwid2FpdCIsImdvdG8iLCJ0eXBlIiwiY2xpY2siLCJlbmQiLCJvbmNlIiwic3RhdGUiLCJkb3dubG9hZEl0ZW0iLCJlbWl0IiwiZXZhbHVhdGUiLCJyb3dzIiwiZG9jdW1lbnQiLCJxdWVyeVNlbGVjdG9yIiwicXVlcnlTZWxlY3RvckFsbCIsInRyIiwidGQiLCJpbm5lckhUTUwiLCJpbmNsdWRlcyIsImRsaW5rIiwidGhlbiIsImRvd25sb2FkaW5nIiwid2FpdERvd25sb2Fkc0NvbXBsZXRlIiwiZG93bmxvYWRNYW5hZ2VyIiwidmlld3BvcnQiLCJuYW1lRm9yVG9kYXkiLCJkIiwiRGF0ZSIsImRzIiwiZ2V0RnVsbFllYXIiLCJnZXRNb250aCIsImdldERheSIsImNyZWF0ZVNuYXBzaG90IiwibiIsImJvdCIsInN0YXJ0U25hcHNob3QiLCJyIiwiZmV0Y2hTbmFwc2hvdCIsIm9wdGlvbnMiLCJyZXN0b3JlU25hcHNob3QiLCJjIiwiY3JvbnRhYiIsIkMiLCJzIiwiZiIsIk4iLCJSIl0sIm1h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RyxhQUFKLENBQWtCdEMsSUFBbEIsRUFBd0JiLFFBQXhCLEVBQWtDa0MsSUFBbEMsQ0FBdUMsWUFBTTtBQUMzQyxRQUFJOUQsS0FBS2dGLE9BQUwsQ0FBYUYsQ0FBakIsRUFBb0I7QUFDbEJGLFVBQUlLLGVBQUosQ0FBb0JyRCxRQUFwQjtBQUNEO0FBQ0YsR0FKRDtBQUtELENBaEJNOztBQW1CUCxJQUFJNUIsS0FBS2dGLE9BQUwsQ0FBYUUsQ0FBakIsRUFBb0I7QUFDbEIsTUFBSUMsVUFBVW5GLEtBQUtnRixPQUFMLENBQWFJLENBQWIsSUFBa0IsYUFBaEM7QUFDQSxvQkFBWUQsT0FBWixFQUFxQlQsY0FBckIsRUFBcUMsSUFBckMsRUFBMkMsSUFBM0MsRUFBaUQsZUFBakQ7QUFDRDs7QUFFRCxJQUFJMUUsS0FBS2dGLE9BQUwsQ0FBYUssQ0FBakIsRUFBb0I7QUFDbEJYLGlCQUFlMUUsS0FBS2dGLE9BQUwsQ0FBYUwsQ0FBNUI7QUFDRDs7QUFHRCxJQUFJM0UsS0FBS2dGLE9BQUwsQ0FBYU0sQ0FBakIsRUFBb0I7QUFDbEJQLGdCQUFjL0UsS0FBS2dGLE9BQUwsQ0FBYUwsQ0FBM0IsRUFBOEIzRSxLQUFLZ0YsT0FBTCxDQUFhTyxDQUEzQztBQUNEOztBQUdELElBQUl2RixLQUFLZ0YsT0FBTCxDQUFhUSxDQUFqQixFQUFvQjtBQUNsQixNQUFNWixNQUFNLElBQUl4RSxTQUFKLEVBQVo7QUFDQXdFLE1BQUlLLGVBQUosQ0FBb0JqRixLQUFLZ0YsT0FBTCxDQUFhTyxDQUFqQztBQUNEIiwiZmlsZSI6Im5iLXNuYXBwZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZG90ZW52IGZyb20gJ2RvdGVudidcbmRvdGVudi5jb25maWcoKVxuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5pbXBvcnQgbm9kZW1haWxlciBmcm9tICdub2RlbWFpbGVyJ1xuaW1wb3J0IG5pZ2h0bWFyZSBmcm9tICduaWdodG1hcmUnXG5pbXBvcnQgbmlnaHRtYXJlRG93bmxvYWRNYW5hZ2VyIGZyb20gJ25pZ2h0bWFyZS1kb3dubG9hZC1tYW5hZ2VyJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBmcyBmcm9tICdmcydcbmltcG9ydCBkZWJ1ZyBmcm9tICdkZWJ1ZydcbmltcG9ydCB3aGVuIGZyb20gJ3doZW4nXG5pbXBvcnQge0Nyb25Kb2J9IGZyb20gJ2Nyb24nXG5pbXBvcnQgZ2V0b3B0IGZyb20gJ25vZGUtZ2V0b3B0J1xuaW1wb3J0IHtleGVjfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuXG5jb25zdCBsb2cgPSBkZWJ1ZygnYm9va2JvdCcpXG5jb25zdCBhcmdzID0gZ2V0b3B0LmNyZWF0ZShbXG4gIFsnYycsICcnLCAncnVuIGNyb24nXSxcbiAgWydyJywgJycsICdyZXN0b3JlIHNuYXBzaG90IHRvIGRiJ10sXG4gIFsnUicsICcnLCAnJ10sXG4gIFsnQycsICc9JywgJ2Nyb24gc3RyaW5nJ10sXG4gIFsnbicsICc9JywgJ3NuYXBzaG90IG5hbWUnXSxcbiAgWydzJywgJycsICdzdGFydCBzbmFwc2hvdCddLFxuICBbJ2YnLCAnJywgJ2ZldGNoIHNuYXBzaG90J10sXG4gIFsnTicsICc9JywgJ3NuYXBzaG90IGZpbGVuYW1lJ10sXG5dKS5iaW5kSGVscCgpLnBhcnNlU3lzdGVtKClcblxubmlnaHRtYXJlRG93bmxvYWRNYW5hZ2VyKG5pZ2h0bWFyZSlcblxuZXhwb3J0IGNsYXNzIE5CU25hcHBlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubWFpbGVyID0gbm9kZW1haWxlci5jcmVhdGVUcmFuc3BvcnQoe1xuICAgICAgaG9zdDogcHJvY2Vzcy5lbnZbJ1NNVFBfU0VSVkVSJ10sXG4gICAgICBwb3J0OiA1ODcsXG4gICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgYXV0aDoge1xuICAgICAgICB1c2VyOiBwcm9jZXNzLmVudlsnRU1BSUwnXSxcbiAgICAgICAgcGFzczogcHJvY2Vzcy5lbnZbJ1NNVFBfUEFTU1dPUkQnXVxuICAgICAgfVxuICAgIH0pXG4gICAgdGhpcy5uYiA9IHtcbiAgICAgIHVybDogcHJvY2Vzcy5lbnZbJ05BVElPTkJVSUxERVJfVVJMJ11cbiAgICB9XG4gICAgdGhpcy5kYXRhYmFzZV91cmwgPSBwcm9jZXNzLmVudlsnREFUQUJBU0VfVVJMJ11cbiAgICB0aGlzLmJyb3dzZXIgPSBuZXcgbmlnaHRtYXJlKHtzaG93OiAhKHByb2Nlc3MuZW52WydESVNQTEFZJ109PT1udWxsKX0pO1xuXG4gIH1cblxuICBzZW5kQXR0YWNobWVudChmaWxlcGF0aCkge1xuICAgIGxvZyhgc2VuZCBhdHRhY2htZW50ICR7ZmlsZXBhdGh9YClcbiAgICBjb25zdCBtc2cgPSB7XG4gICAgICBzZW5kZXI6IHByb2Nlc3MuZW52WydFTUFJTCddLFxuICAgICAgZnJvbTogYEFrY2phIEJvdCA8JHtwcm9jZXNzLmVudlsnRU1BSUwnXX0+YCxcbiAgICAgIGJjYzogcHJvY2Vzcy5lbnZbJ1RPJ10sXG4gICAgICBzdWJqZWN0OiAnRHppc2llanN6YSBnYXpldGEnLFxuICAgICAgaHRtbDogJ1cgemHFgsSFY3pua3UgZHppc2llanN6YSBnYXpldGEgJmx0OzMnLFxuICAgICAgYXR0YWNobWVudHM6IHtcbiAgICAgICAgZmlsZW5hbWU6IHBhdGguYmFzZW5hbWUoZmlsZXBhdGgpLFxuICAgICAgICBwYXRoOiBmaWxlcGF0aFxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gd2hlbi5wcm9taXNlKChvaywgZmFpbCkgPT4ge1xuICAgICAgdGhpcy5tYWlsZXIuc2VuZE1haWwobXNnLCAoZXJyLCBpbmZvKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBsb2coZXJyKVxuICAgICAgICAgIHJldHVybiBmYWlsKGVycilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2soKVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgcmVzdG9yZVNuYXBzaG90KGZpbGVuYW1lKSB7XG4gICAgaWYgKCF0aGlzLmRhdGFiYXNlX3VybCkge1xuICAgICAgbG9nKCdubyBEQVRBQkFTRV9VUkwgc2V0JylcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZW5hbWUpKSB7XG4gICAgICBsb2coYCR7ZmlsZW5hbWV9IGRvZXMgbm90IGV4aXN0YClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBsb2coYHBnX3Jlc3RvcmUgLUZjIC1jIC1mIFwiJHtmaWxlbmFtZX1cIiB1cmwuLi5gKVxuICAgIGV4ZWMoYHBnX3Jlc3RvcmUgLUZjIC1jIC1kICR7dGhpcy5kYXRhYmFzZV91cmx9IFwiJHtmaWxlbmFtZX1cImAsIHt9LCAoZXJyLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xuICAgICAgaWYgKHN0ZG91dCkge1xuICAgICAgICBsb2coc3Rkb3V0KVxuICAgICAgfVxuICAgICAgaWYgKGVycikge1xuICAgICAgICBsb2coc3RkZXJyKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGZzLnVubGluayhmaWxlbmFtZSwgKGVycikgPT4geyBpZiAoZXJyKSB7IGxvZyhgZXJyb3IgcmVtb3ZpbmcgJHtmaWxlbmFtZX06ICR7ZXJyfWApIH0gfSlcbiAgICB9KVxuXG4gIH1cblxuICBzdGFydFNuYXBzaG90KG5hbWU9J0RhaWx5IHNuYXBzaG90Jykge1xuICAgIHJldHVybiB0aGlzLmxvZ2luKClcbiAgICAgIC53YWl0KDEwMDApXG4gICAgICAuZ290byh0aGlzLm5iLnVybCArICcvYWRtaW4vYmFja3VwcycpXG4gICAgICAudHlwZSgnI25hdGlvbl9iYWNrdXBfY29tbWVudCcsIG5hbWUpXG4gICAgICAuY2xpY2soJ1tuYW1lPVwiY29tbWl0XCJdJylcbiAgICAgIC5lbmQoKVxuICB9XG5cbiAgZmV0Y2hTbmFwc2hvdChuYW1lPSdEYWlseSBzbmFwc2hvdCcsIGZpbGVuYW1lPSdzbmFwc2hvdC5zbmFwJykge1xuICAgIHRoaXMuYnJvd3Nlci5vbmNlKCdkb3dubG9hZCcsIChzdGF0ZSwgZG93bmxvYWRJdGVtKSA9PiB7XG4gICAgICBpZihzdGF0ZSA9PSAnc3RhcnRlZCcpe1xuICAgICAgICBsb2coYGRvd25sb2FkIHN0YXJ0ZWQgdG8gJHtmaWxlbmFtZX1gKVxuICAgICAgICB0aGlzLmJyb3dzZXIuZW1pdCgnZG93bmxvYWQnLCBmaWxlbmFtZSwgZG93bmxvYWRJdGVtKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzLmxvZ2luKClcbiAgICAgIC53YWl0KDEwMDApXG4gICAgICAuZ290byh0aGlzLm5iLnVybCArICcvYWRtaW4vYmFja3VwcycpXG4gICAgICAuZXZhbHVhdGUoKG5hbWUpID0+IHtcbiAgICAgICAgY29uc3Qgcm93cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3RhYmxlLnRhYmxlJykucXVlcnlTZWxlY3RvckFsbCgndHInKVxuXG4gICAgICAgIGZvciAoY29uc3QgdHIgb2Ygcm93cykge1xuICAgICAgICAgIGNvbnN0IHRkID0gdHIucXVlcnlTZWxlY3RvcigndGQ6bnRoLWNoaWxkKDQpJylcbiAgICAgICAgICBpZiAodGQgJiYgdGQuaW5uZXJIVE1MLmluY2x1ZGVzKG5hbWUpKSB7XG4gICAgICAgICAgICBjb25zdCBkbGluayA9IHRyLnF1ZXJ5U2VsZWN0b3IoJ3RkOm50aC1jaGlsZCgzKSBhJylcbiAgICAgICAgICAgIGlmIChkbGluaykge1xuICAgICAgICAgICAgICBkbGluay5jbGljaygpXG4gICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIG5hbWUpXG4gICAgICAudGhlbigoZG93bmxvYWRpbmcpID0+IHtcbiAgICAgICAgaWYgKGRvd25sb2FkaW5nKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYnJvd3Nlci53YWl0RG93bmxvYWRzQ29tcGxldGUoKS5lbmQoKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZyhgU25hcHNob3QgJHtuYW1lfSBub3QgcmVhZHkgeWV0YClcbiAgICAgICAgICByZXR1cm4gdGhpcy5icm93c2VyLmVuZCgpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gIH1cblxuICBsb2dpbigpIHtcbiAgICByZXR1cm4gdGhpcy5icm93c2VyLmRvd25sb2FkTWFuYWdlcigpXG4gICAgICAuZ290byh0aGlzLm5iLnVybCArICcvYWRtaW4nKVxuICAgICAgLnZpZXdwb3J0KDIwMTQsIDc2OClcbiAgICAgIC50eXBlKCcjdXNlcl9zZXNzaW9uX2VtYWlsJywgcHJvY2Vzcy5lbnZbJ0xPR0lOJ10pXG4gICAgICAudHlwZSgnI3VzZXJfc2Vzc2lvbl9wYXNzd29yZCcsIHByb2Nlc3MuZW52WydQQVNTV09SRCddKVxuICAgICAgLmNsaWNrKCcuc3VibWl0LWJ1dHRvbicpXG4gIH1cblxufVxuXG5jb25zdCBuYW1lRm9yVG9kYXkgPSAoKSA9PiB7XG4gIGNvbnN0IGQgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBkcyA9IGAke2QuZ2V0RnVsbFllYXIoKX0tJHtkLmdldE1vbnRoKCl9LSR7ZC5nZXREYXkoKX1gXG4gIHJldHVybiB7XG4gICAgbmFtZTogYERhaWx5IHNuYXBzaG90ICR7ZHN9YCxcbiAgICBmaWxlbmFtZTogYG5iLXNuYXBzaG90LSR7ZHN9LmRiYFxuICB9XG59XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVTbmFwc2hvdCA9IChuYW1lKSA9PiB7XG4gIGNvbnN0IG4gPSBuYW1lRm9yVG9kYXkoKVxuICBpZiAoIW5hbWUpIHtcbiAgICBuYW1lID0gbi5uYW1lXG4gIH1cbiAgbG9nKGBTdGFyIHQgc25hcHNob3QgbmFtZWQgJHtuYW1lfWApXG4gIGNvbnN0IGJvdCA9IG5ldyBOQlNuYXBwZXIoKVxuICBib3Quc3RhcnRTbmFwc2hvdChuYW1lKS50aGVuKHIgPT4gbG9nKGBvayAke3J9YCkpXG59XG5cbmV4cG9ydCBjb25zdCBmZXRjaFNuYXBzaG90ID0gKG5hbWUsIGZpbGVuYW1lKSA9PiB7XG4gIGNvbnN0IG4gPSBuYW1lRm9yVG9kYXkoKVxuICBpZiAoIW5hbWUpIHtcbiAgICBuYW1lID0gbi5uYW1lXG4gIH1cbiAgaWYgKCFmaWxlbmFtZSkge1xuICAgIGZpbGVuYW1lID0gbi5maWxlbmFtZVxuICB9XG5cbiAgbG9nKGBGZXRjaCBzbmFwc2hvdCBuYW1lZCAke25hbWV9IHRvICR7ZmlsZW5hbWV9YClcbiAgY29uc3QgYm90ID0gbmV3IE5CU25hcHBlcigpXG4gIGJvdC5mZXRjaFNuYXBzaG90KG5hbWUsIGZpbGVuYW1lKS50aGVuKCgpID0+IHtcbiAgICBpZiAoYXJncy5vcHRpb25zLnIpIHtcbiAgICAgIGJvdC5yZXN0b3JlU25hcHNob3QoZmlsZW5hbWUpXG4gICAgfVxuICB9KVxufVxuXG5cbmlmIChhcmdzLm9wdGlvbnMuYykge1xuICBsZXQgY3JvbnRhYiA9IGFyZ3Mub3B0aW9ucy5DIHx8ICcwIDAgNyAqICogKidcbiAgbmV3IENyb25Kb2IoY3JvbnRhYiwgY3JlYXRlU25hcHNob3QsIG51bGwsIHRydWUsICdFdXJvcGUvV2Fyc2F3Jylcbn1cblxuaWYgKGFyZ3Mub3B0aW9ucy5zKSB7XG4gIGNyZWF0ZVNuYXBzaG90KGFyZ3Mub3B0aW9ucy5uKVxufVxuXG5cbmlmIChhcmdzLm9wdGlvbnMuZikge1xuICBmZXRjaFNuYXBzaG90KGFyZ3Mub3B0aW9ucy5uLCBhcmdzLm9wdGlvbnMuTilcbn1cblxuXG5pZiAoYXJncy5vcHRpb25zLlIpIHtcbiAgY29uc3QgYm90ID0gbmV3IE5CU25hcHBlcigpXG4gIGJvdC5yZXN0b3JlU25hcHNob3QoYXJncy5vcHRpb25zLk4pXG59XG4iXX0=