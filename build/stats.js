'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.serve = serve;

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var log = (0, _debug2.default)('http');

function serve() {
  var hostname = '0.0.0.0';
  var port = process.env.PORT;

  var server = _http2.default.createServer(function (req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Ok.\n');
  });

  server.listen(port, hostname, function () {
    log('Server running at http://' + hostname + ':' + port + '/');
  });

  return server;
}