const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT || 8000
const PUBLIC_DIR = path.resolve(__dirname)

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
}

http.createServer((req, res) => {
  const requestedPath = req.url === '/' ? '/index.html' : req.url
  const filePath = path.join(PUBLIC_DIR, requestedPath)

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      return res.end('404 Not Found')
    }

    const ext = path.extname(filePath)
    const contentType = mimeTypes[ext] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
}).listen(PORT, () => {
  console.log(`Presentation site running at http://localhost:${PORT}`)
})
