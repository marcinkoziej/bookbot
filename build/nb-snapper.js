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
  new _cron.CronJob(crontab, createSnapshot, null, true, 'Europe/Warsaw');
  new _cron.CronJob(crontab2, fetchSnapshot, null, true, 'Europe/Warsaw');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9uYi1zbmFwcGVyLmpzIl0sIm5hbWVzIjpbImNvbmZpZyIsImxvZyIsImFyZ3MiLCJjcmVhdGUiLCJiaW5kSGVscCIsInBhcnNlU3lzdGVtIiwiTkJTbmFwcGVyIiwibWFpbGVyIiwiY3JlYXRlVHJhbnNwb3J0IiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJwb3J0Iiwic2VjdXJlIiwiYXV0aCIsInVzZXIiLCJwYXNzIiwibmIiLCJ1cmwiLCJkYXRhYmFzZV91cmwiLCJicm93c2VyIiwic2hvdyIsImZpbGVwYXRoIiwibXNnIiwic2VuZGVyIiwiZnJvbSIsImJjYyIsInN1YmplY3QiLCJodG1sIiwiYXR0YWNobWVudHMiLCJmaWxlbmFtZSIsImJhc2VuYW1lIiwicGF0aCIsInByb21pc2UiLCJvayIsImZhaWwiLCJzZW5kTWFpbCIsImVyciIsImluZm8iLCJleGlzdHNTeW5jIiwic3Rkb3V0Iiwic3RkZXJyIiwidW5saW5rIiwibmFtZSIsImxvZ2luIiwid2FpdCIsImdvdG8iLCJ0eXBlIiwiY2xpY2siLCJlbmQiLCJyZW1vdmUiLCJvbmNlIiwic3RhdGUiLCJkb3dubG9hZEl0ZW0iLCJlbWl0IiwiZXZhbHVhdGUiLCJ3aW5kb3ciLCJjb25maXJtIiwicm93cyIsImRvY3VtZW50IiwicXVlcnlTZWxlY3RvciIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJ0ciIsInRkIiwiaW5uZXJIVE1MIiwiaW5jbHVkZXMiLCJkb3dubG9hZExpbmsiLCJyZW1vdmVMaW5rIiwiY2xhc3NMaXN0IiwiYWRkIiwidGhlbiIsImRvd25sb2FkaW5nIiwiYiIsIndhaXREb3dubG9hZHNDb21wbGV0ZSIsImRvd25sb2FkTWFuYWdlciIsInZpZXdwb3J0IiwibmFtZUZvclRvZGF5IiwiZCIsIkRhdGUiLCJkcyIsImZvcm1hdCIsImNyZWF0ZVNuYXBzaG90IiwibiIsImJvdCIsInN0YXJ0U25hcHNob3QiLCJyIiwiZmV0Y2hTbmFwc2hvdCIsIm9wdGlvbnMiLCJEIiwiUiIsInJl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QyxJQUFyQyxFQUEyQyxJQUEzQyxFQUFpRCxlQUFqRDtBQUNBLG9CQUFZYSxRQUFaLEVBQXNCUixhQUF0QixFQUFxQyxJQUFyQyxFQUEyQyxJQUEzQyxFQUFpRCxlQUFqRDtBQUNEOztBQUVELElBQUlwRixLQUFLcUYsT0FBTCxDQUFhUyxDQUFqQixFQUFvQjtBQUNsQmYsaUJBQWUvRSxLQUFLcUYsT0FBTCxDQUFhTCxDQUE1QjtBQUNEOztBQUdELElBQUloRixLQUFLcUYsT0FBTCxDQUFhVSxDQUFqQixFQUFvQjtBQUNsQlgsZ0JBQWNwRixLQUFLcUYsT0FBTCxDQUFhTCxDQUEzQixFQUE4QmhGLEtBQUtxRixPQUFMLENBQWFXLENBQTNDO0FBQ0Q7O0FBR0QsSUFBSWhHLEtBQUtxRixPQUFMLENBQWFGLENBQWpCLEVBQW9CO0FBQ2xCLE1BQU1GLE1BQU0sSUFBSTdFLFNBQUosRUFBWjtBQUNBNkUsTUFBSU8sZUFBSixDQUFvQnhGLEtBQUtxRixPQUFMLENBQWFXLENBQWpDO0FBQ0QiLCJmaWxlIjoibmItc25hcHBlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBkb3RlbnYgZnJvbSAnZG90ZW52J1xuZG90ZW52LmNvbmZpZygpXG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCdcbmltcG9ydCBub2RlbWFpbGVyIGZyb20gJ25vZGVtYWlsZXInXG5pbXBvcnQgbmlnaHRtYXJlIGZyb20gJ25pZ2h0bWFyZSdcbmltcG9ydCBuaWdodG1hcmVEb3dubG9hZE1hbmFnZXIgZnJvbSAnbmlnaHRtYXJlLWRvd25sb2FkLW1hbmFnZXInXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IGZzIGZyb20gJ2ZzJ1xuaW1wb3J0IGRlYnVnIGZyb20gJ2RlYnVnJ1xuaW1wb3J0IHdoZW4gZnJvbSAnd2hlbidcbmltcG9ydCB7Q3JvbkpvYn0gZnJvbSAnY3JvbidcbmltcG9ydCBnZXRvcHQgZnJvbSAnbm9kZS1nZXRvcHQnXG5pbXBvcnQge2V4ZWN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5cbmNvbnN0IGxvZyA9IGRlYnVnKCdib29rYm90JylcbmNvbnN0IGFyZ3MgPSBnZXRvcHQuY3JlYXRlKFtcbiAgWydjJywgJycsICdydW4gY3JvbiddLFxuICBbJ3MnLCAnJywgJ21vZGU6IHN0YXJ0IHNuYXBzaG90J10sXG4gIFsnZicsICcnLCAnbW9kZTogZmV0Y2ggc25hcHNob3QnXSxcbiAgWydyJywgJycsICdtb2RlOiByZXN0b3JlIHNuYXBzaG90IHRvIGRiJ10sXG4gIFsnUicsICcnLCAncmVzdG9yZSBpbW1lZGlhdGVseSBhZnRlciBmZXRjaCddLFxuICBbJ0QnLCAnJywgJ2RlbGV0ZSBzbmFwc2hvdCBmcm9tIHNlcnZlciBpbW1lZGF0ZWx5IGFmdGVyIGRvd25sb2FkJ10sXG4gIFsnUycsICc9JywgJ2Nyb24gc2NoZWR1bGUgZm9yIHN0YXJ0aW5nIHNuYXBzaG90J10sXG4gIFsnRicsICc9JywgJ2Nyb24gc2NoZWR1bGUgZm9yIGZldGNoaW5nIHNuYXBzaG90J10sXG4gIFsnbicsICc9JywgJ3NuYXBzaG90IG5hbWUgKGRlZmF1bHQgYmFzZWQgb24gY3VycmVudCBkYXRlKSddLFxuICBbJ04nLCAnPScsICdzbmFwc2hvdCBmaWxlbmFtZSAoZGVmYXVsdCBiYXNlZCBvbiBjdXJyZW50IGRhdGUpJ10sXG5dKS5iaW5kSGVscCgpLnBhcnNlU3lzdGVtKClcblxubmlnaHRtYXJlRG93bmxvYWRNYW5hZ2VyKG5pZ2h0bWFyZSlcblxuZXhwb3J0IGNsYXNzIE5CU25hcHBlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubWFpbGVyID0gbm9kZW1haWxlci5jcmVhdGVUcmFuc3BvcnQoe1xuICAgICAgaG9zdDogcHJvY2Vzcy5lbnZbJ1NNVFBfU0VSVkVSJ10sXG4gICAgICBwb3J0OiA1ODcsXG4gICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgYXV0aDoge1xuICAgICAgICB1c2VyOiBwcm9jZXNzLmVudlsnRU1BSUwnXSxcbiAgICAgICAgcGFzczogcHJvY2Vzcy5lbnZbJ1NNVFBfUEFTU1dPUkQnXVxuICAgICAgfVxuICAgIH0pXG4gICAgdGhpcy5uYiA9IHtcbiAgICAgIHVybDogcHJvY2Vzcy5lbnZbJ05BVElPTkJVSUxERVJfVVJMJ11cbiAgICB9XG4gICAgdGhpcy5kYXRhYmFzZV91cmwgPSBwcm9jZXNzLmVudlsnREFUQUJBU0VfVVJMJ11cbiAgICB0aGlzLmJyb3dzZXIgPSBuZXcgbmlnaHRtYXJlKHtzaG93OiAhKHByb2Nlc3MuZW52WydESVNQTEFZJ109PT1udWxsKX0pO1xuICAgIC8vIHRoaXMuYnJvd3Nlci5vbigncGFnZScsIGZ1bmN0aW9uKGV2ZW50LCBtc2csIHJlc3ApIHtcbiAgICAvLyAgIGxvZyhgJHtldmVudH06ICR7bXNnfSAtPiAke3Jlc3B9YClcbiAgICAvLyAgIHJldHVybiB0cnVlO1xuICAgIC8vIH0pXG5cbiAgfVxuXG4gIHNlbmRBdHRhY2htZW50KGZpbGVwYXRoKSB7XG4gICAgbG9nKGBzZW5kIGF0dGFjaG1lbnQgJHtmaWxlcGF0aH1gKVxuICAgIGNvbnN0IG1zZyA9IHtcbiAgICAgIHNlbmRlcjogcHJvY2Vzcy5lbnZbJ0VNQUlMJ10sXG4gICAgICBmcm9tOiBgQWtjamEgQm90IDwke3Byb2Nlc3MuZW52WydFTUFJTCddfT5gLFxuICAgICAgYmNjOiBwcm9jZXNzLmVudlsnVE8nXSxcbiAgICAgIHN1YmplY3Q6ICdEemlzaWVqc3phIGdhemV0YScsXG4gICAgICBodG1sOiAnVyB6YcWCxIVjem5rdSBkemlzaWVqc3phIGdhemV0YSAmbHQ7MycsXG4gICAgICBhdHRhY2htZW50czoge1xuICAgICAgICBmaWxlbmFtZTogcGF0aC5iYXNlbmFtZShmaWxlcGF0aCksXG4gICAgICAgIHBhdGg6IGZpbGVwYXRoXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB3aGVuLnByb21pc2UoKG9rLCBmYWlsKSA9PiB7XG4gICAgICB0aGlzLm1haWxlci5zZW5kTWFpbChtc2csIChlcnIsIGluZm8pID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGxvZyhlcnIpXG4gICAgICAgICAgcmV0dXJuIGZhaWwoZXJyKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvaygpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICByZXN0b3JlU25hcHNob3QoZmlsZW5hbWUpIHtcbiAgICBpZiAoIXRoaXMuZGF0YWJhc2VfdXJsKSB7XG4gICAgICBsb2coJ25vIERBVEFCQVNFX1VSTCBzZXQnKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghZnMuZXhpc3RzU3luYyhmaWxlbmFtZSkpIHtcbiAgICAgIGxvZyhgJHtmaWxlbmFtZX0gZG9lcyBub3QgZXhpc3RgKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGxvZyhgcGdfcmVzdG9yZSAtRmMgLWMgLWYgXCIke2ZpbGVuYW1lfVwiIHVybC4uLmApXG4gICAgZXhlYyhgcGdfcmVzdG9yZSAtRmMgLWMgLWQgJHt0aGlzLmRhdGFiYXNlX3VybH0gXCIke2ZpbGVuYW1lfVwiYCwge30sIChlcnIsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XG4gICAgICBpZiAoc3Rkb3V0KSB7XG4gICAgICAgIGxvZyhzdGRvdXQpXG4gICAgICB9XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGxvZyhzdGRlcnIpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgZnMudW5saW5rKGZpbGVuYW1lLCAoZXJyKSA9PiB7IGlmIChlcnIpIHsgbG9nKGBlcnJvciByZW1vdmluZyAke2ZpbGVuYW1lfTogJHtlcnJ9YCkgfSB9KVxuICAgIH0pXG5cbiAgfVxuXG4gIHN0YXJ0U25hcHNob3QobmFtZT0nRGFpbHkgc25hcHNob3QnKSB7XG4gICAgcmV0dXJuIHRoaXMubG9naW4oKVxuICAgICAgLndhaXQoMTAwMClcbiAgICAgIC5nb3RvKHRoaXMubmIudXJsICsgJy9hZG1pbi9iYWNrdXBzJylcbiAgICAgIC50eXBlKCcjbmF0aW9uX2JhY2t1cF9jb21tZW50JywgbmFtZSlcbiAgICAgIC5jbGljaygnW25hbWU9XCJjb21taXRcIl0nKVxuICAgICAgLmVuZCgpXG4gIH1cblxuICBmZXRjaFNuYXBzaG90KG5hbWU9J0RhaWx5IHNuYXBzaG90JywgZmlsZW5hbWU9J3NuYXBzaG90LnNuYXAnLCByZW1vdmU9dHJ1ZSkge1xuICAgIHRoaXMuYnJvd3Nlci5vbmNlKCdkb3dubG9hZCcsIChzdGF0ZSwgZG93bmxvYWRJdGVtKSA9PiB7XG4gICAgICBpZihzdGF0ZSA9PSAnc3RhcnRlZCcpe1xuICAgICAgICBsb2coYGRvd25sb2FkIHN0YXJ0ZWQgdG8gJHtmaWxlbmFtZX1gKVxuICAgICAgICB0aGlzLmJyb3dzZXIuZW1pdCgnZG93bmxvYWQnLCBmaWxlbmFtZSwgZG93bmxvYWRJdGVtKTtcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgcmV0dXJuIHRoaXMubG9naW4oKVxuICAgICAgLndhaXQoMTAwMClcbiAgICAgIC5nb3RvKHRoaXMubmIudXJsICsgJy9hZG1pbi9iYWNrdXBzJylcbiAgICAgIC5ldmFsdWF0ZSgobmFtZSkgPT4ge1xuICAgICAgICAvLyBoaWphY2sgY29uZmlybVxuICAgICAgICB3aW5kb3cuY29uZmlybSA9IGZ1bmN0aW9uKG1zZykgeyByZXR1cm4gdHJ1ZTsgfVxuICAgICAgICAvLyBGaW5kIHNuYXBzaG90IHRhYmxlXG4gICAgICAgIGNvbnN0IHJvd3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd0YWJsZS50YWJsZScpLnF1ZXJ5U2VsZWN0b3JBbGwoJ3RyJylcblxuICAgICAgICAvLyBsb29rIGZvciBzbmFwc2hvdCBieSBuYW1lXG4gICAgICAgIGZvciAoY29uc3QgdHIgb2Ygcm93cykge1xuICAgICAgICAgIGNvbnN0IHRkID0gdHIucXVlcnlTZWxlY3RvcigndGQ6bnRoLWNoaWxkKDQpJylcbiAgICAgICAgICBpZiAodGQgJiYgdGQuaW5uZXJIVE1MLmluY2x1ZGVzKG5hbWUpKSB7XG4gICAgICAgICAgICAvLyBmaW5kIGRvd25sb2FkIGxpbmsgYW5kIHJlbW92ZSBsaW5rXG4gICAgICAgICAgICBjb25zdCBkb3dubG9hZExpbmsgPSB0ci5xdWVyeVNlbGVjdG9yKCd0ZDpudGgtY2hpbGQoMykgYScpXG4gICAgICAgICAgICBjb25zdCByZW1vdmVMaW5rID0gdHIucXVlcnlTZWxlY3RvcignW2RhdGEtbWV0aG9kPVwiZGVsZXRlXCJdJylcblxuICAgICAgICAgICAgaWYgKHJlbW92ZUxpbmspIHtcbiAgICAgICAgICAgICAgLy8gbWFyayB0aGUgcmVtb3ZlIGxpbmsgZm9yIGxhdGVyIHdpdGggYSBjbGFzc1xuICAgICAgICAgICAgICByZW1vdmVMaW5rLmNsYXNzTGlzdC5hZGQoJ3gtcmVtb3ZlLXNuYXBzaG90JylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkb3dubG9hZExpbmspIHtcbiAgICAgICAgICAgICAgZG93bmxvYWRMaW5rLmNsaWNrKClcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgbmFtZSlcbiAgICAgIC50aGVuKChkb3dubG9hZGluZykgPT4ge1xuICAgICAgICBpZiAoZG93bmxvYWRpbmcpIHtcbiAgICAgICAgICBsZXQgYiA9IHRoaXMuYnJvd3Nlci53YWl0RG93bmxvYWRzQ29tcGxldGUoKVxuICAgICAgICAgIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgIGIgPSBiLmNsaWNrKCcueC1yZW1vdmUtc25hcHNob3QnKS53YWl0KDEwMDApXG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBiLmVuZCgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nKGBTbmFwc2hvdCAke25hbWV9IG5vdCByZWFkeSB5ZXRgKVxuICAgICAgICAgIHJldHVybiB0aGlzLmJyb3dzZXIuZW5kKClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgfVxuXG4gIGxvZ2luKCkge1xuICAgIHJldHVybiB0aGlzLmJyb3dzZXIuZG93bmxvYWRNYW5hZ2VyKClcbiAgICAgIC5nb3RvKHRoaXMubmIudXJsICsgJy9hZG1pbicpXG4gICAgICAudmlld3BvcnQoMjAxNCwgNzY4KVxuICAgICAgLnR5cGUoJyN1c2VyX3Nlc3Npb25fZW1haWwnLCBwcm9jZXNzLmVudlsnTE9HSU4nXSlcbiAgICAgIC50eXBlKCcjdXNlcl9zZXNzaW9uX3Bhc3N3b3JkJywgcHJvY2Vzcy5lbnZbJ1BBU1NXT1JEJ10pXG4gICAgICAuY2xpY2soJy5zdWJtaXQtYnV0dG9uJylcbiAgfVxuXG59XG5cbmNvbnN0IG5hbWVGb3JUb2RheSA9ICgpID0+IHtcbiAgY29uc3QgZCA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IGRzID0gbW9tZW50KCkuZm9ybWF0KCdZWVlZLU1NLUREJylcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBgRGFpbHkgc25hcHNob3QgJHtkc31gLFxuICAgIGZpbGVuYW1lOiBgbmItc25hcHNob3QtJHtkc30uZGJgXG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVNuYXBzaG90ID0gKG5hbWUpID0+IHtcbiAgY29uc3QgbiA9IG5hbWVGb3JUb2RheSgpXG4gIGlmICghbmFtZSkge1xuICAgIG5hbWUgPSBuLm5hbWVcbiAgfVxuICBsb2coYFN0YXIgdCBzbmFwc2hvdCBuYW1lZCAke25hbWV9YClcbiAgY29uc3QgYm90ID0gbmV3IE5CU25hcHBlcigpXG4gIGJvdC5zdGFydFNuYXBzaG90KG5hbWUpLnRoZW4ociA9PiBsb2coYG9rICR7cn1gKSlcbn1cblxuZXhwb3J0IGNvbnN0IGZldGNoU25hcHNob3QgPSAobmFtZSwgZmlsZW5hbWUpID0+IHtcbiAgY29uc3QgbiA9IG5hbWVGb3JUb2RheSgpXG4gIGlmICghbmFtZSkge1xuICAgIG5hbWUgPSBuLm5hbWVcbiAgfVxuICBpZiAoIWZpbGVuYW1lKSB7XG4gICAgZmlsZW5hbWUgPSBuLmZpbGVuYW1lXG4gIH1cblxuICBsb2coYEZldGNoIHNuYXBzaG90IG5hbWVkICR7bmFtZX0gdG8gJHtmaWxlbmFtZX1gKVxuICBjb25zdCBib3QgPSBuZXcgTkJTbmFwcGVyKClcbiAgYm90LmZldGNoU25hcHNob3QobmFtZSwgZmlsZW5hbWUsICEhYXJncy5vcHRpb25zLkQpLnRoZW4oKCkgPT4ge1xuXG4gICAgaWYgKGFyZ3Mub3B0aW9ucy5SKSB7XG4gICAgICByZXR1cm4gYm90LnJlc3RvcmVTbmFwc2hvdChmaWxlbmFtZSlcbiAgICB9XG4gIH0pXG59XG5cblxuaWYgKGFyZ3Mub3B0aW9ucy5jKSB7XG4gIGxldCBjcm9udGFiID0gYXJncy5vcHRpb25zLlMgfHwgJzAgMCA1ICogKiAqJ1xuICBsZXQgY3JvbnRhYjIgPSBhcmdzLm9wdGlvbnMuRiB8fCAnMCAwIDcgKiAqIConXG4gIG5ldyBDcm9uSm9iKGNyb250YWIsIGNyZWF0ZVNuYXBzaG90LCBudWxsLCB0cnVlLCAnRXVyb3BlL1dhcnNhdycpXG4gIG5ldyBDcm9uSm9iKGNyb250YWIyLCBmZXRjaFNuYXBzaG90LCBudWxsLCB0cnVlLCAnRXVyb3BlL1dhcnNhdycpXG59XG5cbmlmIChhcmdzLm9wdGlvbnMucykge1xuICBjcmVhdGVTbmFwc2hvdChhcmdzLm9wdGlvbnMubilcbn1cblxuXG5pZiAoYXJncy5vcHRpb25zLmYpIHtcbiAgZmV0Y2hTbmFwc2hvdChhcmdzLm9wdGlvbnMubiwgYXJncy5vcHRpb25zLk4pXG59XG5cblxuaWYgKGFyZ3Mub3B0aW9ucy5yKSB7XG4gIGNvbnN0IGJvdCA9IG5ldyBOQlNuYXBwZXIoKVxuICBib3QucmVzdG9yZVNuYXBzaG90KGFyZ3Mub3B0aW9ucy5OKVxufVxuIl19