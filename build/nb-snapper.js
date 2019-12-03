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

var _stats = require('./stats');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

_dotenv2.default.config();


var log = (0, _debug2.default)('nb-snapper');
var args = _nodeGetopt2.default.create([['c', '', 'run cron'], ['s', '', 'mode: start snapshot'], ['f', '', 'mode: fetch snapshot'], ['r', '', 'mode: restore snapshot to db'], ['R', '', 'restore immediately after fetch'], ['D', '', 'delete snapshot from server immedately after download'], ['S', '=', 'cron schedule for starting snapshot'], ['F', '=', 'cron schedule for fetching snapshot'], ['n', '=', 'snapshot name (default based on current date)'], ['N', '=', 'snapshot filename (default based on current date)']]).bindHelp().parseSystem();

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
    // this.browser.on('page', function(event, msg, resp) {
    //   log(`${event}: ${msg} -> ${resp}`)
    //   return true;
    // })
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
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Daily snapshot';

      var _this2 = this;

      var filename = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'snapshot.snap';
      var remove = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

      this.browser.once('download', function (state, downloadItem) {
        if (state == 'started') {
          log('download started to ' + filename);
          _this2.browser.emit('download', filename, downloadItem);
        }
      });

      return this.login().wait(1000).goto(this.nb.url + '/admin/backups').evaluate(function (name) {
        // hijack confirm
        window.confirm = function (msg) {
          return true;
        };
        // Find snapshot table
        var rows = document.querySelector('table.table').querySelectorAll('tr');

        // look for snapshot by name
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = rows[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var tr = _step.value;

            var td = tr.querySelector('td:nth-child(4)');
            if (td && td.innerHTML.includes(name)) {
              // find download link and remove link
              var downloadLink = tr.querySelector('td:nth-child(3) a');
              var removeLink = tr.querySelector('[data-method="delete"]');

              if (removeLink) {
                // mark the remove link for later with a class
                removeLink.classList.add('x-remove-snapshot');
              }
              if (downloadLink) {
                downloadLink.click();
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
          var b = _this2.browser.waitDownloadsComplete();
          if (remove) {
            b = b.click('.x-remove-snapshot').wait(1000);
          }
          return b.end();
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
  var ds = (0, _moment2.default)().format('YYYY-MM-DD');
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
  bot.fetchSnapshot(name, filename, !!args.options.D).then(function () {

    if (args.options.R) {
      return bot.restoreSnapshot(filename);
    }
  });
};

if (args.options.c) {
  var crontab = args.options.S || '0 0 5 * * *';
  var crontab2 = args.options.F || '0 0 7 * * *';
  log('Creating snapshot in schedule: ' + crontab);
  log('Fetching snapshot in schedule: ' + crontab2);
  new _cron.CronJob(crontab, createSnapshot, null, true, 'Europe/Warsaw');
  new _cron.CronJob(crontab2, fetchSnapshot, null, true, 'Europe/Warsaw');
  (0, _stats.serve)();
}

if (args.options.s) {
  createSnapshot(args.options.n);
}

if (args.options.f) {
  fetchSnapshot(args.options.n, args.options.N);
}

if (args.options.r) {
  var bot = new NBSnapper();
  bot.restoreSnapshot(args.options.N);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9uYi1zbmFwcGVyLmpzIl0sIm5hbWVzIjpbImNvbmZpZyIsImxvZyIsImFyZ3MiLCJjcmVhdGUiLCJiaW5kSGVscCIsInBhcnNlU3lzdGVtIiwiTkJTbmFwcGVyIiwibWFpbGVyIiwiY3JlYXRlVHJhbnNwb3J0IiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJwb3J0Iiwic2VjdXJlIiwiYXV0aCIsInVzZXIiLCJwYXNzIiwibmIiLCJ1cmwiLCJkYXRhYmFzZV91cmwiLCJicm93c2VyIiwic2hvdyIsImZpbGVwYXRoIiwibXNnIiwic2VuZGVyIiwiZnJvbSIsImJjYyIsInN1YmplY3QiLCJodG1sIiwiYXR0YWNobWVudHMiLCJmaWxlbmFtZSIsImJhc2VuYW1lIiwicGF0aCIsInByb21pc2UiLCJvayIsImZhaWwiLCJzZW5kTWFpbCIsImVyciIsImluZm8iLCJleGlzdHNTeW5jIiwic3Rkb3V0Iiwic3RkZXJyIiwidW5saW5rIiwibmFtZSIsImxvZ2luIiwid2FpdCIsImdvdG8iLCJ0eXBlIiwiY2xpY2siLCJlbmQiLCJyZW1vdmUiLCJvbmNlIiwic3RhdGUiLCJkb3dubG9hZEl0ZW0iLCJlbWl0IiwiZXZhbHVhdGUiLCJ3aW5kb3ciLCJjb25maXJtIiwicm93cyIsImRvY3VtZW50IiwicXVlcnlTZWxlY3RvciIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJ0ciIsInRkIiwiaW5uZXJIVE1MIiwiaW5jbHVkZXMiLCJkb3dubG9hZExpbmsiLCJyZW1vdmVMaW5rIiwiY2xhc3NMaXN0IiwiYWRkIiwidGhlbiIsImRvd25sb2FkaW5nIiwiYiIsIndhaXREb3dubG9hZHNDb21wbGV0ZSIsImRvd25sb2FkTWFuYWdlciIsInZpZXdwb3J0IiwibmFtZUZvclRvZGF5IiwiZCIsIkRhdGUiLCJkcyIsImZvcm1hdCIsImNyZWF0ZVNuYXBzaG90IiwibiIsImJvdCIsInN0YXJ0U25hcHNob3QiLCJyIiwiZmV0Y2hTbmFwc2hvdCIsIm9wdGlvbnMiLCJEIiwiUiIsInJl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LDBDQUFzQzZGLFFBQXRDO0FBQ0Esb0JBQVlGLE9BQVosRUFBcUJYLGNBQXJCLEVBQXFDLElBQXJDLEVBQTJDLElBQTNDLEVBQWlELGVBQWpEO0FBQ0Esb0JBQVlhLFFBQVosRUFBc0JSLGFBQXRCLEVBQXFDLElBQXJDLEVBQTJDLElBQTNDLEVBQWlELGVBQWpEO0FBQ0E7QUFDRDs7QUFFRCxJQUFJcEYsS0FBS3FGLE9BQUwsQ0FBYVMsQ0FBakIsRUFBb0I7QUFDbEJmLGlCQUFlL0UsS0FBS3FGLE9BQUwsQ0FBYUwsQ0FBNUI7QUFDRDs7QUFHRCxJQUFJaEYsS0FBS3FGLE9BQUwsQ0FBYVUsQ0FBakIsRUFBb0I7QUFDbEJYLGdCQUFjcEYsS0FBS3FGLE9BQUwsQ0FBYUwsQ0FBM0IsRUFBOEJoRixLQUFLcUYsT0FBTCxDQUFhVyxDQUEzQztBQUNEOztBQUdELElBQUloRyxLQUFLcUYsT0FBTCxDQUFhRixDQUFqQixFQUFvQjtBQUNsQixNQUFNRixNQUFNLElBQUk3RSxTQUFKLEVBQVo7QUFDQTZFLE1BQUlPLGVBQUosQ0FBb0J4RixLQUFLcUYsT0FBTCxDQUFhVyxDQUFqQztBQUNEIiwiZmlsZSI6Im5iLXNuYXBwZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZG90ZW52IGZyb20gJ2RvdGVudidcbmRvdGVudi5jb25maWcoKVxuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5pbXBvcnQgbm9kZW1haWxlciBmcm9tICdub2RlbWFpbGVyJ1xuaW1wb3J0IG5pZ2h0bWFyZSBmcm9tICduaWdodG1hcmUnXG5pbXBvcnQgbmlnaHRtYXJlRG93bmxvYWRNYW5hZ2VyIGZyb20gJ25pZ2h0bWFyZS1kb3dubG9hZC1tYW5hZ2VyJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBmcyBmcm9tICdmcydcbmltcG9ydCBkZWJ1ZyBmcm9tICdkZWJ1ZydcbmltcG9ydCB3aGVuIGZyb20gJ3doZW4nXG5pbXBvcnQge0Nyb25Kb2J9IGZyb20gJ2Nyb24nXG5pbXBvcnQgZ2V0b3B0IGZyb20gJ25vZGUtZ2V0b3B0J1xuaW1wb3J0IHtleGVjfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0IHtzZXJ2ZX0gZnJvbSAnLi9zdGF0cydcblxuY29uc3QgbG9nID0gZGVidWcoJ25iLXNuYXBwZXInKVxuY29uc3QgYXJncyA9IGdldG9wdC5jcmVhdGUoW1xuICBbJ2MnLCAnJywgJ3J1biBjcm9uJ10sXG4gIFsncycsICcnLCAnbW9kZTogc3RhcnQgc25hcHNob3QnXSxcbiAgWydmJywgJycsICdtb2RlOiBmZXRjaCBzbmFwc2hvdCddLFxuICBbJ3InLCAnJywgJ21vZGU6IHJlc3RvcmUgc25hcHNob3QgdG8gZGInXSxcbiAgWydSJywgJycsICdyZXN0b3JlIGltbWVkaWF0ZWx5IGFmdGVyIGZldGNoJ10sXG4gIFsnRCcsICcnLCAnZGVsZXRlIHNuYXBzaG90IGZyb20gc2VydmVyIGltbWVkYXRlbHkgYWZ0ZXIgZG93bmxvYWQnXSxcbiAgWydTJywgJz0nLCAnY3JvbiBzY2hlZHVsZSBmb3Igc3RhcnRpbmcgc25hcHNob3QnXSxcbiAgWydGJywgJz0nLCAnY3JvbiBzY2hlZHVsZSBmb3IgZmV0Y2hpbmcgc25hcHNob3QnXSxcbiAgWyduJywgJz0nLCAnc25hcHNob3QgbmFtZSAoZGVmYXVsdCBiYXNlZCBvbiBjdXJyZW50IGRhdGUpJ10sXG4gIFsnTicsICc9JywgJ3NuYXBzaG90IGZpbGVuYW1lIChkZWZhdWx0IGJhc2VkIG9uIGN1cnJlbnQgZGF0ZSknXSxcbl0pLmJpbmRIZWxwKCkucGFyc2VTeXN0ZW0oKVxuXG5uaWdodG1hcmVEb3dubG9hZE1hbmFnZXIobmlnaHRtYXJlKVxuXG5leHBvcnQgY2xhc3MgTkJTbmFwcGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5tYWlsZXIgPSBub2RlbWFpbGVyLmNyZWF0ZVRyYW5zcG9ydCh7XG4gICAgICBob3N0OiBwcm9jZXNzLmVudlsnU01UUF9TRVJWRVInXSxcbiAgICAgIHBvcnQ6IDU4NyxcbiAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICBhdXRoOiB7XG4gICAgICAgIHVzZXI6IHByb2Nlc3MuZW52WydFTUFJTCddLFxuICAgICAgICBwYXNzOiBwcm9jZXNzLmVudlsnU01UUF9QQVNTV09SRCddXG4gICAgICB9XG4gICAgfSlcbiAgICB0aGlzLm5iID0ge1xuICAgICAgdXJsOiBwcm9jZXNzLmVudlsnTkFUSU9OQlVJTERFUl9VUkwnXVxuICAgIH1cbiAgICB0aGlzLmRhdGFiYXNlX3VybCA9IHByb2Nlc3MuZW52WydEQVRBQkFTRV9VUkwnXVxuICAgIHRoaXMuYnJvd3NlciA9IG5ldyBuaWdodG1hcmUoe3Nob3c6ICEocHJvY2Vzcy5lbnZbJ0RJU1BMQVknXT09PW51bGwpfSk7XG4gICAgLy8gdGhpcy5icm93c2VyLm9uKCdwYWdlJywgZnVuY3Rpb24oZXZlbnQsIG1zZywgcmVzcCkge1xuICAgIC8vICAgbG9nKGAke2V2ZW50fTogJHttc2d9IC0+ICR7cmVzcH1gKVxuICAgIC8vICAgcmV0dXJuIHRydWU7XG4gICAgLy8gfSlcblxuICB9XG5cbiAgc2VuZEF0dGFjaG1lbnQoZmlsZXBhdGgpIHtcbiAgICBsb2coYHNlbmQgYXR0YWNobWVudCAke2ZpbGVwYXRofWApXG4gICAgY29uc3QgbXNnID0ge1xuICAgICAgc2VuZGVyOiBwcm9jZXNzLmVudlsnRU1BSUwnXSxcbiAgICAgIGZyb206IGBBa2NqYSBCb3QgPCR7cHJvY2Vzcy5lbnZbJ0VNQUlMJ119PmAsXG4gICAgICBiY2M6IHByb2Nlc3MuZW52WydUTyddLFxuICAgICAgc3ViamVjdDogJ0R6aXNpZWpzemEgZ2F6ZXRhJyxcbiAgICAgIGh0bWw6ICdXIHphxYLEhWN6bmt1IGR6aXNpZWpzemEgZ2F6ZXRhICZsdDszJyxcbiAgICAgIGF0dGFjaG1lbnRzOiB7XG4gICAgICAgIGZpbGVuYW1lOiBwYXRoLmJhc2VuYW1lKGZpbGVwYXRoKSxcbiAgICAgICAgcGF0aDogZmlsZXBhdGhcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHdoZW4ucHJvbWlzZSgob2ssIGZhaWwpID0+IHtcbiAgICAgIHRoaXMubWFpbGVyLnNlbmRNYWlsKG1zZywgKGVyciwgaW5mbykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgbG9nKGVycilcbiAgICAgICAgICByZXR1cm4gZmFpbChlcnIpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9rKClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIHJlc3RvcmVTbmFwc2hvdChmaWxlbmFtZSkge1xuICAgIGlmICghdGhpcy5kYXRhYmFzZV91cmwpIHtcbiAgICAgIGxvZygnbm8gREFUQUJBU0VfVVJMIHNldCcpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGZpbGVuYW1lKSkge1xuICAgICAgbG9nKGAke2ZpbGVuYW1lfSBkb2VzIG5vdCBleGlzdGApXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgbG9nKGBwZ19yZXN0b3JlIC1GYyAtYyAtZiBcIiR7ZmlsZW5hbWV9XCIgdXJsLi4uYClcbiAgICBleGVjKGBwZ19yZXN0b3JlIC1GYyAtYyAtZCAke3RoaXMuZGF0YWJhc2VfdXJsfSBcIiR7ZmlsZW5hbWV9XCJgLCB7fSwgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcbiAgICAgIGlmIChzdGRvdXQpIHtcbiAgICAgICAgbG9nKHN0ZG91dClcbiAgICAgIH1cbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgbG9nKHN0ZGVycilcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBmcy51bmxpbmsoZmlsZW5hbWUsIChlcnIpID0+IHsgaWYgKGVycikgeyBsb2coYGVycm9yIHJlbW92aW5nICR7ZmlsZW5hbWV9OiAke2Vycn1gKSB9IH0pXG4gICAgfSlcblxuICB9XG5cbiAgc3RhcnRTbmFwc2hvdChuYW1lPSdEYWlseSBzbmFwc2hvdCcpIHtcbiAgICByZXR1cm4gdGhpcy5sb2dpbigpXG4gICAgICAud2FpdCgxMDAwKVxuICAgICAgLmdvdG8odGhpcy5uYi51cmwgKyAnL2FkbWluL2JhY2t1cHMnKVxuICAgICAgLnR5cGUoJyNuYXRpb25fYmFja3VwX2NvbW1lbnQnLCBuYW1lKVxuICAgICAgLmNsaWNrKCdbbmFtZT1cImNvbW1pdFwiXScpXG4gICAgICAuZW5kKClcbiAgfVxuXG4gIGZldGNoU25hcHNob3QobmFtZT0nRGFpbHkgc25hcHNob3QnLCBmaWxlbmFtZT0nc25hcHNob3Quc25hcCcsIHJlbW92ZT10cnVlKSB7XG4gICAgdGhpcy5icm93c2VyLm9uY2UoJ2Rvd25sb2FkJywgKHN0YXRlLCBkb3dubG9hZEl0ZW0pID0+IHtcbiAgICAgIGlmKHN0YXRlID09ICdzdGFydGVkJyl7XG4gICAgICAgIGxvZyhgZG93bmxvYWQgc3RhcnRlZCB0byAke2ZpbGVuYW1lfWApXG4gICAgICAgIHRoaXMuYnJvd3Nlci5lbWl0KCdkb3dubG9hZCcsIGZpbGVuYW1lLCBkb3dubG9hZEl0ZW0pO1xuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICByZXR1cm4gdGhpcy5sb2dpbigpXG4gICAgICAud2FpdCgxMDAwKVxuICAgICAgLmdvdG8odGhpcy5uYi51cmwgKyAnL2FkbWluL2JhY2t1cHMnKVxuICAgICAgLmV2YWx1YXRlKChuYW1lKSA9PiB7XG4gICAgICAgIC8vIGhpamFjayBjb25maXJtXG4gICAgICAgIHdpbmRvdy5jb25maXJtID0gZnVuY3Rpb24obXNnKSB7IHJldHVybiB0cnVlOyB9XG4gICAgICAgIC8vIEZpbmQgc25hcHNob3QgdGFibGVcbiAgICAgICAgY29uc3Qgcm93cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3RhYmxlLnRhYmxlJykucXVlcnlTZWxlY3RvckFsbCgndHInKVxuXG4gICAgICAgIC8vIGxvb2sgZm9yIHNuYXBzaG90IGJ5IG5hbWVcbiAgICAgICAgZm9yIChjb25zdCB0ciBvZiByb3dzKSB7XG4gICAgICAgICAgY29uc3QgdGQgPSB0ci5xdWVyeVNlbGVjdG9yKCd0ZDpudGgtY2hpbGQoNCknKVxuICAgICAgICAgIGlmICh0ZCAmJiB0ZC5pbm5lckhUTUwuaW5jbHVkZXMobmFtZSkpIHtcbiAgICAgICAgICAgIC8vIGZpbmQgZG93bmxvYWQgbGluayBhbmQgcmVtb3ZlIGxpbmtcbiAgICAgICAgICAgIGNvbnN0IGRvd25sb2FkTGluayA9IHRyLnF1ZXJ5U2VsZWN0b3IoJ3RkOm50aC1jaGlsZCgzKSBhJylcbiAgICAgICAgICAgIGNvbnN0IHJlbW92ZUxpbmsgPSB0ci5xdWVyeVNlbGVjdG9yKCdbZGF0YS1tZXRob2Q9XCJkZWxldGVcIl0nKVxuXG4gICAgICAgICAgICBpZiAocmVtb3ZlTGluaykge1xuICAgICAgICAgICAgICAvLyBtYXJrIHRoZSByZW1vdmUgbGluayBmb3IgbGF0ZXIgd2l0aCBhIGNsYXNzXG4gICAgICAgICAgICAgIHJlbW92ZUxpbmsuY2xhc3NMaXN0LmFkZCgneC1yZW1vdmUtc25hcHNob3QnKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRvd25sb2FkTGluaykge1xuICAgICAgICAgICAgICBkb3dubG9hZExpbmsuY2xpY2soKVxuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCBuYW1lKVxuICAgICAgLnRoZW4oKGRvd25sb2FkaW5nKSA9PiB7XG4gICAgICAgIGlmIChkb3dubG9hZGluZykge1xuICAgICAgICAgIGxldCBiID0gdGhpcy5icm93c2VyLndhaXREb3dubG9hZHNDb21wbGV0ZSgpXG4gICAgICAgICAgaWYgKHJlbW92ZSkge1xuICAgICAgICAgICAgYiA9IGIuY2xpY2soJy54LXJlbW92ZS1zbmFwc2hvdCcpLndhaXQoMTAwMClcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGIuZW5kKClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2coYFNuYXBzaG90ICR7bmFtZX0gbm90IHJlYWR5IHlldGApXG4gICAgICAgICAgcmV0dXJuIHRoaXMuYnJvd3Nlci5lbmQoKVxuICAgICAgICB9XG4gICAgICB9KVxuICB9XG5cbiAgbG9naW4oKSB7XG4gICAgcmV0dXJuIHRoaXMuYnJvd3Nlci5kb3dubG9hZE1hbmFnZXIoKVxuICAgICAgLmdvdG8odGhpcy5uYi51cmwgKyAnL2FkbWluJylcbiAgICAgIC52aWV3cG9ydCgyMDE0LCA3NjgpXG4gICAgICAudHlwZSgnI3VzZXJfc2Vzc2lvbl9lbWFpbCcsIHByb2Nlc3MuZW52WydMT0dJTiddKVxuICAgICAgLnR5cGUoJyN1c2VyX3Nlc3Npb25fcGFzc3dvcmQnLCBwcm9jZXNzLmVudlsnUEFTU1dPUkQnXSlcbiAgICAgIC5jbGljaygnLnN1Ym1pdC1idXR0b24nKVxuICB9XG5cbn1cblxuY29uc3QgbmFtZUZvclRvZGF5ID0gKCkgPT4ge1xuICBjb25zdCBkID0gbmV3IERhdGUoKTtcbiAgY29uc3QgZHMgPSBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKVxuICByZXR1cm4ge1xuICAgIG5hbWU6IGBEYWlseSBzbmFwc2hvdCAke2RzfWAsXG4gICAgZmlsZW5hbWU6IGBuYi1zbmFwc2hvdC0ke2RzfS5kYmBcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgY3JlYXRlU25hcHNob3QgPSAobmFtZSkgPT4ge1xuICBjb25zdCBuID0gbmFtZUZvclRvZGF5KClcbiAgaWYgKCFuYW1lKSB7XG4gICAgbmFtZSA9IG4ubmFtZVxuICB9XG4gIGxvZyhgU3RhciB0IHNuYXBzaG90IG5hbWVkICR7bmFtZX1gKVxuICBjb25zdCBib3QgPSBuZXcgTkJTbmFwcGVyKClcbiAgYm90LnN0YXJ0U25hcHNob3QobmFtZSkudGhlbihyID0+IGxvZyhgb2sgJHtyfWApKVxufVxuXG5leHBvcnQgY29uc3QgZmV0Y2hTbmFwc2hvdCA9IChuYW1lLCBmaWxlbmFtZSkgPT4ge1xuICBjb25zdCBuID0gbmFtZUZvclRvZGF5KClcbiAgaWYgKCFuYW1lKSB7XG4gICAgbmFtZSA9IG4ubmFtZVxuICB9XG4gIGlmICghZmlsZW5hbWUpIHtcbiAgICBmaWxlbmFtZSA9IG4uZmlsZW5hbWVcbiAgfVxuXG4gIGxvZyhgRmV0Y2ggc25hcHNob3QgbmFtZWQgJHtuYW1lfSB0byAke2ZpbGVuYW1lfWApXG4gIGNvbnN0IGJvdCA9IG5ldyBOQlNuYXBwZXIoKVxuICBib3QuZmV0Y2hTbmFwc2hvdChuYW1lLCBmaWxlbmFtZSwgISFhcmdzLm9wdGlvbnMuRCkudGhlbigoKSA9PiB7XG5cbiAgICBpZiAoYXJncy5vcHRpb25zLlIpIHtcbiAgICAgIHJldHVybiBib3QucmVzdG9yZVNuYXBzaG90KGZpbGVuYW1lKVxuICAgIH1cbiAgfSlcbn1cblxuXG5pZiAoYXJncy5vcHRpb25zLmMpIHtcbiAgbGV0IGNyb250YWIgPSBhcmdzLm9wdGlvbnMuUyB8fCAnMCAwIDUgKiAqIConXG4gIGxldCBjcm9udGFiMiA9IGFyZ3Mub3B0aW9ucy5GIHx8ICcwIDAgNyAqICogKidcbiAgbG9nKGBDcmVhdGluZyBzbmFwc2hvdCBpbiBzY2hlZHVsZTogJHtjcm9udGFifWApXG4gIGxvZyhgRmV0Y2hpbmcgc25hcHNob3QgaW4gc2NoZWR1bGU6ICR7Y3JvbnRhYjJ9YClcbiAgbmV3IENyb25Kb2IoY3JvbnRhYiwgY3JlYXRlU25hcHNob3QsIG51bGwsIHRydWUsICdFdXJvcGUvV2Fyc2F3JylcbiAgbmV3IENyb25Kb2IoY3JvbnRhYjIsIGZldGNoU25hcHNob3QsIG51bGwsIHRydWUsICdFdXJvcGUvV2Fyc2F3JylcbiAgc2VydmUoKVxufVxuXG5pZiAoYXJncy5vcHRpb25zLnMpIHtcbiAgY3JlYXRlU25hcHNob3QoYXJncy5vcHRpb25zLm4pXG59XG5cblxuaWYgKGFyZ3Mub3B0aW9ucy5mKSB7XG4gIGZldGNoU25hcHNob3QoYXJncy5vcHRpb25zLm4sIGFyZ3Mub3B0aW9ucy5OKVxufVxuXG5cbmlmIChhcmdzLm9wdGlvbnMucikge1xuICBjb25zdCBib3QgPSBuZXcgTkJTbmFwcGVyKClcbiAgYm90LnJlc3RvcmVTbmFwc2hvdChhcmdzLm9wdGlvbnMuTilcbn1cbiJdfQ==