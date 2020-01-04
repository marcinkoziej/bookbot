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