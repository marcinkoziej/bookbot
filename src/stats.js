import http from 'http'
import debug from 'debug'
const log = debug('http')

export function serve() {
  const hostname = '0.0.0.0'
  const port = process.env.PORT

  const server = http.createServer((req, res) => {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain')
    res.end('Ok.\n')
  });

  server.listen(port, hostname, () => {
    log(`Server running at http://${hostname}:${port}/`)
  })

  return server

}

