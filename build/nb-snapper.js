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
var args = _nodeGetopt2.default.create([['c', '', 'run cron'], ['r', '', 'restore snapshot to db'], ['R', '', 'restore snapshot'], ['S', '=', 'cron string'], ['F', '=', 'cron string'], ['n', '=', 'snapshot name'], ['s', '', 'start snapshot'], ['f', '', 'fetch snapshot'], ['D', '', 'delete snapshot after download'], ['N', '=', 'snapshot filename']]).bindHelp().parseSystem();

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
  bot.fetchSnapshot(name, filename, !!args.options.D).then(function () {

    if (args.options.r) {
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

if (args.options.R) {
  var bot = new NBSnapper();
  bot.restoreSnapshot(args.options.N);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9uYi1zbmFwcGVyLmpzIl0sIm5hbWVzIjpbImNvbmZpZyIsImxvZyIsImFyZ3MiLCJjcmVhdGUiLCJiaW5kSGVscCIsInBhcnNlU3lzdGVtIiwiTkJTbmFwcGVyIiwibWFpbGVyIiwiY3JlYXRlVHJhbnNwb3J0IiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJwb3J0Iiwic2VjdXJlIiwiYXV0aCIsInVzZXIiLCJwYXNzIiwibmIiLCJ1cmwiLCJkYXRhYmFzZV91cmwiLCJicm93c2VyIiwic2hvdyIsImZpbGVwYXRoIiwibXNnIiwic2VuZGVyIiwiZnJvbSIsImJjYyIsInN1YmplY3QiLCJodG1sIiwiYXR0YWNobWVudHMiLCJmaWxlbmFtZSIsImJhc2VuYW1lIiwicGF0aCIsInByb21pc2UiLCJvayIsImZhaWwiLCJzZW5kTWFpbCIsImVyciIsImluZm8iLCJleGlzdHNTeW5jIiwic3Rkb3V0Iiwic3RkZXJyIiwidW5saW5rIiwibmFtZSIsImxvZ2luIiwid2FpdCIsImdvdG8iLCJ0eXBlIiwiY2xpY2siLCJlbmQiLCJyZW1vdmUiLCJvbmNlIiwic3RhdGUiLCJkb3dubG9hZEl0ZW0iLCJlbWl0IiwiZXZhbHVhdGUiLCJ3aW5kb3ciLCJjb25maXJtIiwicm93cyIsImRvY3VtZW50IiwicXVlcnlTZWxlY3RvciIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJ0ciIsInRkIiwiaW5uZXJIVE1MIiwiaW5jbHVkZXMiLCJkb3dubG9hZExpbmsiLCJyZW1vdmVMaW5rIiwiY2xhc3NMaXN0IiwiYWRkIiwidGhlbiIsImRvd25sb2FkaW5nIiwiYiIsIndhaXREb3dubG9hZHNDb21wbGV0ZSIsImRvd25sb2FkTWFuYWdlciIsInZpZXdwb3J0IiwibmFtZUZvclRvZGF5IiwiZCIsIkRhdGUiLCJkcyIsImdldEZ1bGxZZWFyIiwiZ2V0TW9udGgiLCJnZXREYXkiLCJjcmVhdGVTbmFwc2hvdCIsIm4iLCJib3QiLCJzdGFydFNuYXBzaG90IiwiciIsImZldGNoU25hcHNob3QiLCJvcHRpb25zIiwiRCIsInJlc3RvcmVTbmFwc2hvdCIsImMiLCJjcm9udGFiIiwiUyIsImNyb250YWIyIiwiRiIsInMiLCJmIiwiTiIsIlIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7O0FBRUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7Ozs7OztBQVhBLGlCQUFPQSxNQUFQOzs7QUFhQSxJQUFNQyxNQUFNLHFCQUFNLFNBQU4sQ0FBWjtBQUNBLElBQU1DLE9BQU8scUJBQU9DLE1BQVAsQ0FBYyxDQUN6QixDQUFDLEdBQUQsRUFBTSxFQUFOLEVBQVUsVUFBVixDQUR5QixFQUV6QixDQUFDLEdBQUQsRUFBTSxFQUFOLEVBQVUsd0JBQVYsQ0FGeUIsRUFHekIsQ0FBQyxHQUFELEVBQU0sRUFBTixFQUFVLGtCQUFWLENBSHlCLEVBSXpCLENBQUMsR0FBRCxFQUFNLEdBQU4sRUFBVyxhQUFYLENBSnlCLEVBS3pCLENBQUMsR0FBRCxFQUFNLEdBQU4sRUFBVyxhQUFYLENBTHlCLEVBTXpCLENBQUMsR0FBRCxFQUFNLEdBQU4sRUFBVyxlQUFYLENBTnlCLEVBT3pCLENBQUMsR0FBRCxFQUFNLEVBQU4sRUFBVSxnQkFBVixDQVB5QixFQVF6QixDQUFDLEdBQUQsRUFBTSxFQUFOLEVBQVUsZ0JBQVYsQ0FSeUIsRUFTekIsQ0FBQyxHQUFELEVBQU0sRUFBTixFQUFVLGdDQUFWLENBVHlCLEVBVXpCLENBQUMsR0FBRCxFQUFNLEdBQU4sRUFBVyxtQkFBWCxDQVZ5QixDQUFkLEVBV1ZDLFFBWFUsR0FXQ0MsV0FYRCxFQUFiOztBQWFBOztJQUVhQyxTLFdBQUFBLFM7QUFDWCx1QkFBYztBQUFBOztBQUNaLFNBQUtDLE1BQUwsR0FBYyxxQkFBV0MsZUFBWCxDQUEyQjtBQUN2Q0MsWUFBTUMsUUFBUUMsR0FBUixDQUFZLGFBQVosQ0FEaUM7QUFFdkNDLFlBQU0sR0FGaUM7QUFHdkNDLGNBQVEsS0FIK0I7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LENBQWFPLENBQWIsSUFBa0IsYUFBakM7QUFDQSxvQkFBWUgsT0FBWixFQUFxQlYsY0FBckIsRUFBcUMsSUFBckMsRUFBMkMsSUFBM0MsRUFBaUQsZUFBakQ7QUFDQSxvQkFBWVksUUFBWixFQUFzQlAsYUFBdEIsRUFBcUMsSUFBckMsRUFBMkMsSUFBM0MsRUFBaUQsZUFBakQ7QUFDRDs7QUFFRCxJQUFJdEYsS0FBS3VGLE9BQUwsQ0FBYVEsQ0FBakIsRUFBb0I7QUFDbEJkLGlCQUFlakYsS0FBS3VGLE9BQUwsQ0FBYUwsQ0FBNUI7QUFDRDs7QUFHRCxJQUFJbEYsS0FBS3VGLE9BQUwsQ0FBYVMsQ0FBakIsRUFBb0I7QUFDbEJWLGdCQUFjdEYsS0FBS3VGLE9BQUwsQ0FBYUwsQ0FBM0IsRUFBOEJsRixLQUFLdUYsT0FBTCxDQUFhVSxDQUEzQztBQUNEOztBQUdELElBQUlqRyxLQUFLdUYsT0FBTCxDQUFhVyxDQUFqQixFQUFvQjtBQUNsQixNQUFNZixNQUFNLElBQUkvRSxTQUFKLEVBQVo7QUFDQStFLE1BQUlNLGVBQUosQ0FBb0J6RixLQUFLdUYsT0FBTCxDQUFhVSxDQUFqQztBQUNEIiwiZmlsZSI6Im5iLXNuYXBwZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZG90ZW52IGZyb20gJ2RvdGVudidcbmRvdGVudi5jb25maWcoKVxuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5pbXBvcnQgbm9kZW1haWxlciBmcm9tICdub2RlbWFpbGVyJ1xuaW1wb3J0IG5pZ2h0bWFyZSBmcm9tICduaWdodG1hcmUnXG5pbXBvcnQgbmlnaHRtYXJlRG93bmxvYWRNYW5hZ2VyIGZyb20gJ25pZ2h0bWFyZS1kb3dubG9hZC1tYW5hZ2VyJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBmcyBmcm9tICdmcydcbmltcG9ydCBkZWJ1ZyBmcm9tICdkZWJ1ZydcbmltcG9ydCB3aGVuIGZyb20gJ3doZW4nXG5pbXBvcnQge0Nyb25Kb2J9IGZyb20gJ2Nyb24nXG5pbXBvcnQgZ2V0b3B0IGZyb20gJ25vZGUtZ2V0b3B0J1xuaW1wb3J0IHtleGVjfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuXG5jb25zdCBsb2cgPSBkZWJ1ZygnYm9va2JvdCcpXG5jb25zdCBhcmdzID0gZ2V0b3B0LmNyZWF0ZShbXG4gIFsnYycsICcnLCAncnVuIGNyb24nXSxcbiAgWydyJywgJycsICdyZXN0b3JlIHNuYXBzaG90IHRvIGRiJ10sXG4gIFsnUicsICcnLCAncmVzdG9yZSBzbmFwc2hvdCddLFxuICBbJ1MnLCAnPScsICdjcm9uIHN0cmluZyddLFxuICBbJ0YnLCAnPScsICdjcm9uIHN0cmluZyddLFxuICBbJ24nLCAnPScsICdzbmFwc2hvdCBuYW1lJ10sXG4gIFsncycsICcnLCAnc3RhcnQgc25hcHNob3QnXSxcbiAgWydmJywgJycsICdmZXRjaCBzbmFwc2hvdCddLFxuICBbJ0QnLCAnJywgJ2RlbGV0ZSBzbmFwc2hvdCBhZnRlciBkb3dubG9hZCddLFxuICBbJ04nLCAnPScsICdzbmFwc2hvdCBmaWxlbmFtZSddLFxuXSkuYmluZEhlbHAoKS5wYXJzZVN5c3RlbSgpXG5cbm5pZ2h0bWFyZURvd25sb2FkTWFuYWdlcihuaWdodG1hcmUpXG5cbmV4cG9ydCBjbGFzcyBOQlNuYXBwZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm1haWxlciA9IG5vZGVtYWlsZXIuY3JlYXRlVHJhbnNwb3J0KHtcbiAgICAgIGhvc3Q6IHByb2Nlc3MuZW52WydTTVRQX1NFUlZFUiddLFxuICAgICAgcG9ydDogNTg3LFxuICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIGF1dGg6IHtcbiAgICAgICAgdXNlcjogcHJvY2Vzcy5lbnZbJ0VNQUlMJ10sXG4gICAgICAgIHBhc3M6IHByb2Nlc3MuZW52WydTTVRQX1BBU1NXT1JEJ11cbiAgICAgIH1cbiAgICB9KVxuICAgIHRoaXMubmIgPSB7XG4gICAgICB1cmw6IHByb2Nlc3MuZW52WydOQVRJT05CVUlMREVSX1VSTCddXG4gICAgfVxuICAgIHRoaXMuZGF0YWJhc2VfdXJsID0gcHJvY2Vzcy5lbnZbJ0RBVEFCQVNFX1VSTCddXG4gICAgdGhpcy5icm93c2VyID0gbmV3IG5pZ2h0bWFyZSh7c2hvdzogIShwcm9jZXNzLmVudlsnRElTUExBWSddPT09bnVsbCl9KTtcbiAgICAvLyB0aGlzLmJyb3dzZXIub24oJ3BhZ2UnLCBmdW5jdGlvbihldmVudCwgbXNnLCByZXNwKSB7XG4gICAgLy8gICBsb2coYCR7ZXZlbnR9OiAke21zZ30gLT4gJHtyZXNwfWApXG4gICAgLy8gICByZXR1cm4gdHJ1ZTtcbiAgICAvLyB9KVxuXG4gIH1cblxuICBzZW5kQXR0YWNobWVudChmaWxlcGF0aCkge1xuICAgIGxvZyhgc2VuZCBhdHRhY2htZW50ICR7ZmlsZXBhdGh9YClcbiAgICBjb25zdCBtc2cgPSB7XG4gICAgICBzZW5kZXI6IHByb2Nlc3MuZW52WydFTUFJTCddLFxuICAgICAgZnJvbTogYEFrY2phIEJvdCA8JHtwcm9jZXNzLmVudlsnRU1BSUwnXX0+YCxcbiAgICAgIGJjYzogcHJvY2Vzcy5lbnZbJ1RPJ10sXG4gICAgICBzdWJqZWN0OiAnRHppc2llanN6YSBnYXpldGEnLFxuICAgICAgaHRtbDogJ1cgemHFgsSFY3pua3UgZHppc2llanN6YSBnYXpldGEgJmx0OzMnLFxuICAgICAgYXR0YWNobWVudHM6IHtcbiAgICAgICAgZmlsZW5hbWU6IHBhdGguYmFzZW5hbWUoZmlsZXBhdGgpLFxuICAgICAgICBwYXRoOiBmaWxlcGF0aFxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gd2hlbi5wcm9taXNlKChvaywgZmFpbCkgPT4ge1xuICAgICAgdGhpcy5tYWlsZXIuc2VuZE1haWwobXNnLCAoZXJyLCBpbmZvKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBsb2coZXJyKVxuICAgICAgICAgIHJldHVybiBmYWlsKGVycilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2soKVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgcmVzdG9yZVNuYXBzaG90KGZpbGVuYW1lKSB7XG4gICAgaWYgKCF0aGlzLmRhdGFiYXNlX3VybCkge1xuICAgICAgbG9nKCdubyBEQVRBQkFTRV9VUkwgc2V0JylcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZW5hbWUpKSB7XG4gICAgICBsb2coYCR7ZmlsZW5hbWV9IGRvZXMgbm90IGV4aXN0YClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBsb2coYHBnX3Jlc3RvcmUgLUZjIC1jIC1mIFwiJHtmaWxlbmFtZX1cIiB1cmwuLi5gKVxuICAgIGV4ZWMoYHBnX3Jlc3RvcmUgLUZjIC1jIC1kICR7dGhpcy5kYXRhYmFzZV91cmx9IFwiJHtmaWxlbmFtZX1cImAsIHt9LCAoZXJyLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xuICAgICAgaWYgKHN0ZG91dCkge1xuICAgICAgICBsb2coc3Rkb3V0KVxuICAgICAgfVxuICAgICAgaWYgKGVycikge1xuICAgICAgICBsb2coc3RkZXJyKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGZzLnVubGluayhmaWxlbmFtZSwgKGVycikgPT4geyBpZiAoZXJyKSB7IGxvZyhgZXJyb3IgcmVtb3ZpbmcgJHtmaWxlbmFtZX06ICR7ZXJyfWApIH0gfSlcbiAgICB9KVxuXG4gIH1cblxuICBzdGFydFNuYXBzaG90KG5hbWU9J0RhaWx5IHNuYXBzaG90Jykge1xuICAgIHJldHVybiB0aGlzLmxvZ2luKClcbiAgICAgIC53YWl0KDEwMDApXG4gICAgICAuZ290byh0aGlzLm5iLnVybCArICcvYWRtaW4vYmFja3VwcycpXG4gICAgICAudHlwZSgnI25hdGlvbl9iYWNrdXBfY29tbWVudCcsIG5hbWUpXG4gICAgICAuY2xpY2soJ1tuYW1lPVwiY29tbWl0XCJdJylcbiAgICAgIC5lbmQoKVxuICB9XG5cbiAgZmV0Y2hTbmFwc2hvdChuYW1lPSdEYWlseSBzbmFwc2hvdCcsIGZpbGVuYW1lPSdzbmFwc2hvdC5zbmFwJywgcmVtb3ZlPXRydWUpIHtcbiAgICB0aGlzLmJyb3dzZXIub25jZSgnZG93bmxvYWQnLCAoc3RhdGUsIGRvd25sb2FkSXRlbSkgPT4ge1xuICAgICAgaWYoc3RhdGUgPT0gJ3N0YXJ0ZWQnKXtcbiAgICAgICAgbG9nKGBkb3dubG9hZCBzdGFydGVkIHRvICR7ZmlsZW5hbWV9YClcbiAgICAgICAgdGhpcy5icm93c2VyLmVtaXQoJ2Rvd25sb2FkJywgZmlsZW5hbWUsIGRvd25sb2FkSXRlbSk7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgIHJldHVybiB0aGlzLmxvZ2luKClcbiAgICAgIC53YWl0KDEwMDApXG4gICAgICAuZ290byh0aGlzLm5iLnVybCArICcvYWRtaW4vYmFja3VwcycpXG4gICAgICAuZXZhbHVhdGUoKG5hbWUpID0+IHtcbiAgICAgICAgLy8gaGlqYWNrIGNvbmZpcm1cbiAgICAgICAgd2luZG93LmNvbmZpcm0gPSBmdW5jdGlvbihtc2cpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgLy8gRmluZCBzbmFwc2hvdCB0YWJsZVxuICAgICAgICBjb25zdCByb3dzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcigndGFibGUudGFibGUnKS5xdWVyeVNlbGVjdG9yQWxsKCd0cicpXG5cbiAgICAgICAgLy8gbG9vayBmb3Igc25hcHNob3QgYnkgbmFtZVxuICAgICAgICBmb3IgKGNvbnN0IHRyIG9mIHJvd3MpIHtcbiAgICAgICAgICBjb25zdCB0ZCA9IHRyLnF1ZXJ5U2VsZWN0b3IoJ3RkOm50aC1jaGlsZCg0KScpXG4gICAgICAgICAgaWYgKHRkICYmIHRkLmlubmVySFRNTC5pbmNsdWRlcyhuYW1lKSkge1xuICAgICAgICAgICAgLy8gZmluZCBkb3dubG9hZCBsaW5rIGFuZCByZW1vdmUgbGlua1xuICAgICAgICAgICAgY29uc3QgZG93bmxvYWRMaW5rID0gdHIucXVlcnlTZWxlY3RvcigndGQ6bnRoLWNoaWxkKDMpIGEnKVxuICAgICAgICAgICAgY29uc3QgcmVtb3ZlTGluayA9IHRyLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLW1ldGhvZD1cImRlbGV0ZVwiXScpXG5cbiAgICAgICAgICAgIGlmIChyZW1vdmVMaW5rKSB7XG4gICAgICAgICAgICAgIC8vIG1hcmsgdGhlIHJlbW92ZSBsaW5rIGZvciBsYXRlciB3aXRoIGEgY2xhc3NcbiAgICAgICAgICAgICAgcmVtb3ZlTGluay5jbGFzc0xpc3QuYWRkKCd4LXJlbW92ZS1zbmFwc2hvdCcpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZG93bmxvYWRMaW5rKSB7XG4gICAgICAgICAgICAgIGRvd25sb2FkTGluay5jbGljaygpXG4gICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIG5hbWUpXG4gICAgICAudGhlbigoZG93bmxvYWRpbmcpID0+IHtcbiAgICAgICAgaWYgKGRvd25sb2FkaW5nKSB7XG4gICAgICAgICAgbGV0IGIgPSB0aGlzLmJyb3dzZXIud2FpdERvd25sb2Fkc0NvbXBsZXRlKClcbiAgICAgICAgICBpZiAocmVtb3ZlKSB7XG4gICAgICAgICAgICBiID0gYi5jbGljaygnLngtcmVtb3ZlLXNuYXBzaG90Jykud2FpdCgxMDAwKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYi5lbmQoKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZyhgU25hcHNob3QgJHtuYW1lfSBub3QgcmVhZHkgeWV0YClcbiAgICAgICAgICByZXR1cm4gdGhpcy5icm93c2VyLmVuZCgpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gIH1cblxuICBsb2dpbigpIHtcbiAgICByZXR1cm4gdGhpcy5icm93c2VyLmRvd25sb2FkTWFuYWdlcigpXG4gICAgICAuZ290byh0aGlzLm5iLnVybCArICcvYWRtaW4nKVxuICAgICAgLnZpZXdwb3J0KDIwMTQsIDc2OClcbiAgICAgIC50eXBlKCcjdXNlcl9zZXNzaW9uX2VtYWlsJywgcHJvY2Vzcy5lbnZbJ0xPR0lOJ10pXG4gICAgICAudHlwZSgnI3VzZXJfc2Vzc2lvbl9wYXNzd29yZCcsIHByb2Nlc3MuZW52WydQQVNTV09SRCddKVxuICAgICAgLmNsaWNrKCcuc3VibWl0LWJ1dHRvbicpXG4gIH1cblxufVxuXG5jb25zdCBuYW1lRm9yVG9kYXkgPSAoKSA9PiB7XG4gIGNvbnN0IGQgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBkcyA9IGAke2QuZ2V0RnVsbFllYXIoKX0tJHtkLmdldE1vbnRoKCl9LSR7ZC5nZXREYXkoKX1gXG4gIHJldHVybiB7XG4gICAgbmFtZTogYERhaWx5IHNuYXBzaG90ICR7ZHN9YCxcbiAgICBmaWxlbmFtZTogYG5iLXNuYXBzaG90LSR7ZHN9LmRiYFxuICB9XG59XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVTbmFwc2hvdCA9IChuYW1lKSA9PiB7XG4gIGNvbnN0IG4gPSBuYW1lRm9yVG9kYXkoKVxuICBpZiAoIW5hbWUpIHtcbiAgICBuYW1lID0gbi5uYW1lXG4gIH1cbiAgbG9nKGBTdGFyIHQgc25hcHNob3QgbmFtZWQgJHtuYW1lfWApXG4gIGNvbnN0IGJvdCA9IG5ldyBOQlNuYXBwZXIoKVxuICBib3Quc3RhcnRTbmFwc2hvdChuYW1lKS50aGVuKHIgPT4gbG9nKGBvayAke3J9YCkpXG59XG5cbmV4cG9ydCBjb25zdCBmZXRjaFNuYXBzaG90ID0gKG5hbWUsIGZpbGVuYW1lKSA9PiB7XG4gIGNvbnN0IG4gPSBuYW1lRm9yVG9kYXkoKVxuICBpZiAoIW5hbWUpIHtcbiAgICBuYW1lID0gbi5uYW1lXG4gIH1cbiAgaWYgKCFmaWxlbmFtZSkge1xuICAgIGZpbGVuYW1lID0gbi5maWxlbmFtZVxuICB9XG5cbiAgbG9nKGBGZXRjaCBzbmFwc2hvdCBuYW1lZCAke25hbWV9IHRvICR7ZmlsZW5hbWV9YClcbiAgY29uc3QgYm90ID0gbmV3IE5CU25hcHBlcigpXG4gIGJvdC5mZXRjaFNuYXBzaG90KG5hbWUsIGZpbGVuYW1lLCAhIWFyZ3Mub3B0aW9ucy5EKS50aGVuKCgpID0+IHtcblxuICAgIGlmIChhcmdzLm9wdGlvbnMucikge1xuICAgICAgcmV0dXJuIGJvdC5yZXN0b3JlU25hcHNob3QoZmlsZW5hbWUpXG4gICAgfVxuICB9KVxufVxuXG5cbmlmIChhcmdzLm9wdGlvbnMuYykge1xuICBsZXQgY3JvbnRhYiA9IGFyZ3Mub3B0aW9ucy5TIHx8ICcwIDAgNSAqICogKidcbiAgbGV0IGNyb250YWIyID0gYXJncy5vcHRpb25zLkYgfHwgJzAgMCA3ICogKiAqJ1xuICBuZXcgQ3JvbkpvYihjcm9udGFiLCBjcmVhdGVTbmFwc2hvdCwgbnVsbCwgdHJ1ZSwgJ0V1cm9wZS9XYXJzYXcnKVxuICBuZXcgQ3JvbkpvYihjcm9udGFiMiwgZmV0Y2hTbmFwc2hvdCwgbnVsbCwgdHJ1ZSwgJ0V1cm9wZS9XYXJzYXcnKVxufVxuXG5pZiAoYXJncy5vcHRpb25zLnMpIHtcbiAgY3JlYXRlU25hcHNob3QoYXJncy5vcHRpb25zLm4pXG59XG5cblxuaWYgKGFyZ3Mub3B0aW9ucy5mKSB7XG4gIGZldGNoU25hcHNob3QoYXJncy5vcHRpb25zLm4sIGFyZ3Mub3B0aW9ucy5OKVxufVxuXG5cbmlmIChhcmdzLm9wdGlvbnMuUikge1xuICBjb25zdCBib3QgPSBuZXcgTkJTbmFwcGVyKClcbiAgYm90LnJlc3RvcmVTbmFwc2hvdChhcmdzLm9wdGlvbnMuTilcbn1cbiJdfQ==