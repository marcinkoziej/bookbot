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
  var port = 3000;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zdGF0cy5qcyJdLCJuYW1lcyI6WyJzZXJ2ZSIsImxvZyIsImhvc3RuYW1lIiwicG9ydCIsInNlcnZlciIsImNyZWF0ZVNlcnZlciIsInJlcSIsInJlcyIsInN0YXR1c0NvZGUiLCJzZXRIZWFkZXIiLCJlbmQiLCJsaXN0ZW4iXSwibWFwcGluZ3MiOiI7Ozs7O1FBSWdCQSxLLEdBQUFBLEs7O0FBSmhCOzs7O0FBQ0E7Ozs7OztBQUNBLElBQU1DLE1BQU0scUJBQU0sTUFBTixDQUFaOztBQUVPLFNBQVNELEtBQVQsR0FBaUI7QUFDdEIsTUFBTUUsV0FBVyxTQUFqQjtBQUNBLE1BQU1DLE9BQU8sSUFBYjs7QUFFQSxNQUFNQyxTQUFTLGVBQUtDLFlBQUwsQ0FBa0IsVUFBQ0MsR0FBRCxFQUFNQyxHQUFOLEVBQWM7QUFDN0NBLFFBQUlDLFVBQUosR0FBaUIsR0FBakI7QUFDQUQsUUFBSUUsU0FBSixDQUFjLGNBQWQsRUFBOEIsWUFBOUI7QUFDQUYsUUFBSUcsR0FBSixDQUFRLE9BQVI7QUFDRCxHQUpjLENBQWY7O0FBTUFOLFNBQU9PLE1BQVAsQ0FBY1IsSUFBZCxFQUFvQkQsUUFBcEIsRUFBOEIsWUFBTTtBQUNsQ0Qsc0NBQWdDQyxRQUFoQyxTQUE0Q0MsSUFBNUM7QUFDRCxHQUZEOztBQUlBLFNBQU9DLE1BQVA7QUFFRCIsImZpbGUiOiJzdGF0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBodHRwIGZyb20gJ2h0dHAnXG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnXG5jb25zdCBsb2cgPSBkZWJ1ZygnaHR0cCcpXG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJ2ZSgpIHtcbiAgY29uc3QgaG9zdG5hbWUgPSAnMC4wLjAuMCc7XG4gIGNvbnN0IHBvcnQgPSAzMDAwO1xuXG4gIGNvbnN0IHNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKChyZXEsIHJlcykgPT4ge1xuICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwXG4gICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ3RleHQvcGxhaW4nKVxuICAgIHJlcy5lbmQoJ09rLlxcbicpXG4gIH0pO1xuXG4gIHNlcnZlci5saXN0ZW4ocG9ydCwgaG9zdG5hbWUsICgpID0+IHtcbiAgICBsb2coYFNlcnZlciBydW5uaW5nIGF0IGh0dHA6Ly8ke2hvc3RuYW1lfToke3BvcnR9L2ApXG4gIH0pXG5cbiAgcmV0dXJuIHNlcnZlclxuXG59XG5cbiJdfQ==