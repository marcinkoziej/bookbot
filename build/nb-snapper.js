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
var args = _nodeGetopt2.default.create([['c', '', 'run cron'], ['r', '', 'restore snapshot to db'], ['R', '', ''], ['S', '=', 'cron string'], ['F', '=', 'cron string'], ['n', '=', 'snapshot name'], ['s', '', 'start snapshot'], ['f', '', 'fetch snapshot'], ['N', '=', 'snapshot filename']]).bindHelp().parseSystem();

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

if (args.options.R) {
  var bot = new NBSnapper();
  bot.restoreSnapshot(args.options.N);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9uYi1zbmFwcGVyLmpzIl0sIm5hbWVzIjpbImNvbmZpZyIsImxvZyIsImFyZ3MiLCJjcmVhdGUiLCJiaW5kSGVscCIsInBhcnNlU3lzdGVtIiwiTkJTbmFwcGVyIiwibWFpbGVyIiwiY3JlYXRlVHJhbnNwb3J0IiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJwb3J0Iiwic2VjdXJlIiwiYXV0aCIsInVzZXIiLCJwYXNzIiwibmIiLCJ1cmwiLCJkYXRhYmFzZV91cmwiLCJicm93c2VyIiwic2hvdyIsImZpbGVwYXRoIiwibXNnIiwic2VuZGVyIiwiZnJvbSIsImJjYyIsInN1YmplY3QiLCJodG1sIiwiYXR0YWNobWVudHMiLCJmaWxlbmFtZSIsImJhc2VuYW1lIiwicGF0aCIsInByb21pc2UiLCJvayIsImZhaWwiLCJzZW5kTWFpbCIsImVyciIsImluZm8iLCJleGlzdHNTeW5jIiwic3Rkb3V0Iiwic3RkZXJyIiwidW5saW5rIiwibmFtZSIsImxvZ2luIiwid2FpdCIsImdvdG8iLCJ0eXBlIiwiY2xpY2siLCJlbmQiLCJvbmNlIiwic3RhdGUiLCJkb3dubG9hZEl0ZW0iLCJlbWl0IiwiZXZhbHVhdGUiLCJyb3dzIiwiZG9jdW1lbnQiLCJxdWVyeVNlbGVjdG9yIiwicXVlcnlTZWxlY3RvckFsbCIsInRyIiwidGQiLCJpbm5lckhUTUwiLCJpbmNsdWRlcyIsImRsaW5rIiwidGhlbiIsImRvd25sb2FkaW5nIiwid2FpdERvd25sb2Fkc0NvbXBsZXRlIiwiZG93bmxvYWRNYW5hZ2VyIiwidmlld3BvcnQiLCJuYW1lRm9yVG9kYXkiLCJkIiwiRGF0ZSIsImRzIiwiZ2V0RnVsbFllYXIiLCJnZXRNb250aCIsImdldERheSIsImNyZWF0ZVNuYXBzaG90IiwibiIsImJvdCIsInN0YXJ0U25hcHNob3QiLCJyIiwiZmV0Y2hTbmFwc2hvdCIsIm9wdGlvbnMiLCJyZXN0b3JlU25hcHNob3QiLCJjIiwiY3JvbnRhYiIsIlMiLCJjcm9udGFiMiIsIkYiLCJzIiwi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ZnJvbSAnZG90ZW52J1xuZG90ZW52LmNvbmZpZygpXG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCdcbmltcG9ydCBub2RlbWFpbGVyIGZyb20gJ25vZGVtYWlsZXInXG5pbXBvcnQgbmlnaHRtYXJlIGZyb20gJ25pZ2h0bWFyZSdcbmltcG9ydCBuaWdodG1hcmVEb3dubG9hZE1hbmFnZXIgZnJvbSAnbmlnaHRtYXJlLWRvd25sb2FkLW1hbmFnZXInXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IGZzIGZyb20gJ2ZzJ1xuaW1wb3J0IGRlYnVnIGZyb20gJ2RlYnVnJ1xuaW1wb3J0IHdoZW4gZnJvbSAnd2hlbidcbmltcG9ydCB7Q3JvbkpvYn0gZnJvbSAnY3JvbidcbmltcG9ydCBnZXRvcHQgZnJvbSAnbm9kZS1nZXRvcHQnXG5pbXBvcnQge2V4ZWN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5cbmNvbnN0IGxvZyA9IGRlYnVnKCdib29rYm90JylcbmNvbnN0IGFyZ3MgPSBnZXRvcHQuY3JlYXRlKFtcbiAgWydjJywgJycsICdydW4gY3JvbiddLFxuICBbJ3InLCAnJywgJ3Jlc3RvcmUgc25hcHNob3QgdG8gZGInXSxcbiAgWydSJywgJycsICcnXSxcbiAgWydTJywgJz0nLCAnY3JvbiBzdHJpbmcnXSxcbiAgWydGJywgJz0nLCAnY3JvbiBzdHJpbmcnXSxcbiAgWyduJywgJz0nLCAnc25hcHNob3QgbmFtZSddLFxuICBbJ3MnLCAnJywgJ3N0YXJ0IHNuYXBzaG90J10sXG4gIFsnZicsICcnLCAnZmV0Y2ggc25hcHNob3QnXSxcbiAgWydOJywgJz0nLCAnc25hcHNob3QgZmlsZW5hbWUnXSxcbl0pLmJpbmRIZWxwKCkucGFyc2VTeXN0ZW0oKVxuXG5uaWdodG1hcmVEb3dubG9hZE1hbmFnZXIobmlnaHRtYXJlKVxuXG5leHBvcnQgY2xhc3MgTkJTbmFwcGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5tYWlsZXIgPSBub2RlbWFpbGVyLmNyZWF0ZVRyYW5zcG9ydCh7XG4gICAgICBob3N0OiBwcm9jZXNzLmVudlsnU01UUF9TRVJWRVInXSxcbiAgICAgIHBvcnQ6IDU4NyxcbiAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICBhdXRoOiB7XG4gICAgICAgIHVzZXI6IHByb2Nlc3MuZW52WydFTUFJTCddLFxuICAgICAgICBwYXNzOiBwcm9jZXNzLmVudlsnU01UUF9QQVNTV09SRCddXG4gICAgICB9XG4gICAgfSlcbiAgICB0aGlzLm5iID0ge1xuICAgICAgdXJsOiBwcm9jZXNzLmVudlsnTkFUSU9OQlVJTERFUl9VUkwnXVxuICAgIH1cbiAgICB0aGlzLmRhdGFiYXNlX3VybCA9IHByb2Nlc3MuZW52WydEQVRBQkFTRV9VUkwnXVxuICAgIHRoaXMuYnJvd3NlciA9IG5ldyBuaWdodG1hcmUoe3Nob3c6ICEocHJvY2Vzcy5lbnZbJ0RJU1BMQVknXT09PW51bGwpfSk7XG5cbiAgfVxuXG4gIHNlbmRBdHRhY2htZW50KGZpbGVwYXRoKSB7XG4gICAgbG9nKGBzZW5kIGF0dGFjaG1lbnQgJHtmaWxlcGF0aH1gKVxuICAgIGNvbnN0IG1zZyA9IHtcbiAgICAgIHNlbmRlcjogcHJvY2Vzcy5lbnZbJ0VNQUlMJ10sXG4gICAgICBmcm9tOiBgQWtjamEgQm90IDwke3Byb2Nlc3MuZW52WydFTUFJTCddfT5gLFxuICAgICAgYmNjOiBwcm9jZXNzLmVudlsnVE8nXSxcbiAgICAgIHN1YmplY3Q6ICdEemlzaWVqc3phIGdhemV0YScsXG4gICAgICBodG1sOiAnVyB6YcWCxIVjem5rdSBkemlzaWVqc3phIGdhemV0YSAmbHQ7MycsXG4gICAgICBhdHRhY2htZW50czoge1xuICAgICAgICBmaWxlbmFtZTogcGF0aC5iYXNlbmFtZShmaWxlcGF0aCksXG4gICAgICAgIHBhdGg6IGZpbGVwYXRoXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB3aGVuLnByb21pc2UoKG9rLCBmYWlsKSA9PiB7XG4gICAgICB0aGlzLm1haWxlci5zZW5kTWFpbChtc2csIChlcnIsIGluZm8pID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGxvZyhlcnIpXG4gICAgICAgICAgcmV0dXJuIGZhaWwoZXJyKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvaygpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICByZXN0b3JlU25hcHNob3QoZmlsZW5hbWUpIHtcbiAgICBpZiAoIXRoaXMuZGF0YWJhc2VfdXJsKSB7XG4gICAgICBsb2coJ25vIERBVEFCQVNFX1VSTCBzZXQnKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghZnMuZXhpc3RzU3luYyhmaWxlbmFtZSkpIHtcbiAgICAgIGxvZyhgJHtmaWxlbmFtZX0gZG9lcyBub3QgZXhpc3RgKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGxvZyhgcGdfcmVzdG9yZSAtRmMgLWMgLWYgXCIke2ZpbGVuYW1lfVwiIHVybC4uLmApXG4gICAgZXhlYyhgcGdfcmVzdG9yZSAtRmMgLWMgLWQgJHt0aGlzLmRhdGFiYXNlX3VybH0gXCIke2ZpbGVuYW1lfVwiYCwge30sIChlcnIsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XG4gICAgICBpZiAoc3Rkb3V0KSB7XG4gICAgICAgIGxvZyhzdGRvdXQpXG4gICAgICB9XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGxvZyhzdGRlcnIpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgZnMudW5saW5rKGZpbGVuYW1lLCAoZXJyKSA9PiB7IGlmIChlcnIpIHsgbG9nKGBlcnJvciByZW1vdmluZyAke2ZpbGVuYW1lfTogJHtlcnJ9YCkgfSB9KVxuICAgIH0pXG5cbiAgfVxuXG4gIHN0YXJ0U25hcHNob3QobmFtZT0nRGFpbHkgc25hcHNob3QnKSB7XG4gICAgcmV0dXJuIHRoaXMubG9naW4oKVxuICAgICAgLndhaXQoMTAwMClcbiAgICAgIC5nb3RvKHRoaXMubmIudXJsICsgJy9hZG1pbi9iYWNrdXBzJylcbiAgICAgIC50eXBlKCcjbmF0aW9uX2JhY2t1cF9jb21tZW50JywgbmFtZSlcbiAgICAgIC5jbGljaygnW25hbWU9XCJjb21taXRcIl0nKVxuICAgICAgLmVuZCgpXG4gIH1cblxuICBmZXRjaFNuYXBzaG90KG5hbWU9J0RhaWx5IHNuYXBzaG90JywgZmlsZW5hbWU9J3NuYXBzaG90LnNuYXAnKSB7XG4gICAgdGhpcy5icm93c2VyLm9uY2UoJ2Rvd25sb2FkJywgKHN0YXRlLCBkb3dubG9hZEl0ZW0pID0+IHtcbiAgICAgIGlmKHN0YXRlID09ICdzdGFydGVkJyl7XG4gICAgICAgIGxvZyhgZG93bmxvYWQgc3RhcnRlZCB0byAke2ZpbGVuYW1lfWApXG4gICAgICAgIHRoaXMuYnJvd3Nlci5lbWl0KCdkb3dubG9hZCcsIGZpbGVuYW1lLCBkb3dubG9hZEl0ZW0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXMubG9naW4oKVxuICAgICAgLndhaXQoMTAwMClcbiAgICAgIC5nb3RvKHRoaXMubmIudXJsICsgJy9hZG1pbi9iYWNrdXBzJylcbiAgICAgIC5ldmFsdWF0ZSgobmFtZSkgPT4ge1xuICAgICAgICBjb25zdCByb3dzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcigndGFibGUudGFibGUnKS5xdWVyeVNlbGVjdG9yQWxsKCd0cicpXG5cbiAgICAgICAgZm9yIChjb25zdCB0ciBvZiByb3dzKSB7XG4gICAgICAgICAgY29uc3QgdGQgPSB0ci5xdWVyeVNlbGVjdG9yKCd0ZDpudGgtY2hpbGQoNCknKVxuICAgICAgICAgIGlmICh0ZCAmJiB0ZC5pbm5lckhUTUwuaW5jbHVkZXMobmFtZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRsaW5rID0gdHIucXVlcnlTZWxlY3RvcigndGQ6bnRoLWNoaWxkKDMpIGEnKVxuICAgICAgICAgICAgaWYgKGRsaW5rKSB7XG4gICAgICAgICAgICAgIGRsaW5rLmNsaWNrKClcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgbmFtZSlcbiAgICAgIC50aGVuKChkb3dubG9hZGluZykgPT4ge1xuICAgICAgICBpZiAoZG93bmxvYWRpbmcpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5icm93c2VyLndhaXREb3dubG9hZHNDb21wbGV0ZSgpLmVuZCgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nKGBTbmFwc2hvdCAke25hbWV9IG5vdCByZWFkeSB5ZXRgKVxuICAgICAgICAgIHJldHVybiB0aGlzLmJyb3dzZXIuZW5kKClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgfVxuXG4gIGxvZ2luKCkge1xuICAgIHJldHVybiB0aGlzLmJyb3dzZXIuZG93bmxvYWRNYW5hZ2VyKClcbiAgICAgIC5nb3RvKHRoaXMubmIudXJsICsgJy9hZG1pbicpXG4gICAgICAudmlld3BvcnQoMjAxNCwgNzY4KVxuICAgICAgLnR5cGUoJyN1c2VyX3Nlc3Npb25fZW1haWwnLCBwcm9jZXNzLmVudlsnTE9HSU4nXSlcbiAgICAgIC50eXBlKCcjdXNlcl9zZXNzaW9uX3Bhc3N3b3JkJywgcHJvY2Vzcy5lbnZbJ1BBU1NXT1JEJ10pXG4gICAgICAuY2xpY2soJy5zdWJtaXQtYnV0dG9uJylcbiAgfVxuXG59XG5cbmNvbnN0IG5hbWVGb3JUb2RheSA9ICgpID0+IHtcbiAgY29uc3QgZCA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IGRzID0gYCR7ZC5nZXRGdWxsWWVhcigpfS0ke2QuZ2V0TW9udGgoKX0tJHtkLmdldERheSgpfWBcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBgRGFpbHkgc25hcHNob3QgJHtkc31gLFxuICAgIGZpbGVuYW1lOiBgbmItc25hcHNob3QtJHtkc30uZGJgXG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVNuYXBzaG90ID0gKG5hbWUpID0+IHtcbiAgY29uc3QgbiA9IG5hbWVGb3JUb2RheSgpXG4gIGlmICghbmFtZSkge1xuICAgIG5hbWUgPSBuLm5hbWVcbiAgfVxuICBsb2coYFN0YXIgdCBzbmFwc2hvdCBuYW1lZCAke25hbWV9YClcbiAgY29uc3QgYm90ID0gbmV3IE5CU25hcHBlcigpXG4gIGJvdC5zdGFydFNuYXBzaG90KG5hbWUpLnRoZW4ociA9PiBsb2coYG9rICR7cn1gKSlcbn1cblxuZXhwb3J0IGNvbnN0IGZldGNoU25hcHNob3QgPSAobmFtZSwgZmlsZW5hbWUpID0+IHtcbiAgY29uc3QgbiA9IG5hbWVGb3JUb2RheSgpXG4gIGlmICghbmFtZSkge1xuICAgIG5hbWUgPSBuLm5hbWVcbiAgfVxuICBpZiAoIWZpbGVuYW1lKSB7XG4gICAgZmlsZW5hbWUgPSBuLmZpbGVuYW1lXG4gIH1cblxuICBsb2coYEZldGNoIHNuYXBzaG90IG5hbWVkICR7bmFtZX0gdG8gJHtmaWxlbmFtZX1gKVxuICBjb25zdCBib3QgPSBuZXcgTkJTbmFwcGVyKClcbiAgYm90LmZldGNoU25hcHNob3QobmFtZSwgZmlsZW5hbWUpLnRoZW4oKCkgPT4ge1xuICAgIGlmIChhcmdzLm9wdGlvbnMucikge1xuICAgICAgYm90LnJlc3RvcmVTbmFwc2hvdChmaWxlbmFtZSlcbiAgICB9XG4gIH0pXG59XG5cblxuaWYgKGFyZ3Mub3B0aW9ucy5jKSB7XG4gIGxldCBjcm9udGFiID0gYXJncy5vcHRpb25zLlMgfHwgJzAgMCA1ICogKiAqJ1xuICBsZXQgY3JvbnRhYjIgPSBhcmdzLm9wdGlvbnMuRiB8fCAnMCAwIDcgKiAqIConXG4gIG5ldyBDcm9uSm9iKGNyb250YWIsIGNyZWF0ZVNuYXBzaG90LCBudWxsLCB0cnVlLCAnRXVyb3BlL1dhcnNhdycpXG4gIG5ldyBDcm9uSm9iKGNyb250YWIyLCBmZXRjaFNuYXBzaG90LCBudWxsLCB0cnVlLCAnRXVyb3BlL1dhcnNhdycpXG59XG5cbmlmIChhcmdzLm9wdGlvbnMucykge1xuICBjcmVhdGVTbmFwc2hvdChhcmdzLm9wdGlvbnMubilcbn1cblxuXG5pZiAoYXJncy5vcHRpb25zLmYpIHtcbiAgZmV0Y2hTbmFwc2hvdChhcmdzLm9wdGlvbnMubiwgYXJncy5vcHRpb25zLk4pXG59XG5cblxuaWYgKGFyZ3Mub3B0aW9ucy5SKSB7XG4gIGNvbnN0IGJvdCA9IG5ldyBOQlNuYXBwZXIoKVxuICBib3QucmVzdG9yZVNuYXBzaG90KGFyZ3Mub3B0aW9ucy5OKVxufVxuIl19