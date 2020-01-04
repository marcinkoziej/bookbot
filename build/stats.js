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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zdGF0cy5qcyJdLCJuYW1lcyI6WyJzZXJ2ZSIsImxvZyIsImhvc3RuYW1lIiwicG9ydCIsInByb2Nlc3MiLCJlbnYiLCJQT1JUIiwic2VydmVyIiwiY3JlYXRlU2VydmVyIiwicmVxIiwicmVzIiwic3RhdHVzQ29kZSIsInNldEhlYWRlciIsImVuZCIsImxpc3RlbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7UUFJZ0JBLEssR0FBQUEsSzs7QUFKaEI7Ozs7QUFDQTs7Ozs7O0FBQ0EsSUFBTUMsTUFBTSxxQkFBTSxNQUFOLENBQVo7O0FBRU8sU0FBU0QsS0FBVCxHQUFpQjtBQUN0QixNQUFNRSxXQUFXLFNBQWpCO0FBQ0EsTUFBTUMsT0FBT0MsUUFBUUMsR0FBUixDQUFZQyxJQUF6Qjs7QUFFQSxNQUFNQyxTQUFTLGVBQUtDLFlBQUwsQ0FBa0IsVUFBQ0MsR0FBRCxFQUFNQyxHQUFOLEVBQWM7QUFDN0NBLFFBQUlDLFVBQUosR0FBaUIsR0FBakI7QUFDQUQsUUFBSUUsU0FBSixDQUFjLGNBQWQsRUFBOEIsWUFBOUI7QUFDQUYsUUFBSUcsR0FBSixDQUFRLE9BQVI7QUFDRCxHQUpjLENBQWY7O0FBTUFOLFNBQU9PLE1BQVAsQ0FBY1gsSUFBZCxFQUFvQkQsUUFBcEIsRUFBOEIsWUFBTTtBQUNsQ0Qsc0NBQWdDQyxRQUFoQyxTQUE0Q0MsSUFBNUM7QUFDRCxHQUZEOztBQUlBLFNBQU9JLE1BQVA7QUFFRCIsImZpbGUiOiJzdGF0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBodHRwIGZyb20gJ2h0dHAnXG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnXG5jb25zdCBsb2cgPSBkZWJ1ZygnaHR0cCcpXG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJ2ZSgpIHtcbiAgY29uc3QgaG9zdG5hbWUgPSAnMC4wLjAuMCdcbiAgY29uc3QgcG9ydCA9IHByb2Nlc3MuZW52LlBPUlRcblxuICBjb25zdCBzZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcigocmVxLCByZXMpID0+IHtcbiAgICByZXMuc3RhdHVzQ29kZSA9IDIwMFxuICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICd0ZXh0L3BsYWluJylcbiAgICByZXMuZW5kKCdPay5cXG4nKVxuICB9KTtcblxuICBzZXJ2ZXIubGlzdGVuKHBvcnQsIGhvc3RuYW1lLCAoKSA9PiB7XG4gICAgbG9nKGBTZXJ2ZXIgcnVubmluZyBhdCBodHRwOi8vJHtob3N0bmFtZX06JHtwb3J0fS9gKVxuICB9KVxuXG4gIHJldHVybiBzZXJ2ZXJcblxufVxuXG4iXX0=