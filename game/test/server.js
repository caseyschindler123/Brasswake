// Dedicated localhost test server. None of these routes enter the build.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const game = path.resolve(__dirname, '..');
const dist = path.resolve(game, process.env.BW_DIST || 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.css': 'text/css' };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname=url.pathname.startsWith('/Brasswake/')?url.pathname.slice('/Brasswake'.length):url.pathname;
    let file;
    if (url.pathname === '/__health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('Brasswake browser tests');
    }
    if (url.pathname === '/__dev') file = path.join(__dirname, 'dev.html');
    else if (url.pathname === '/__dev/storage.js') file = path.join(__dirname, 'dev-storage.js');
    else if (url.pathname === '/__dev/commands.js') file = path.join(__dirname, 'dev-mode.js');
    else if (url.pathname === '/__dev/game') {
      const raw=await fs.readFile(path.join(dist,'index.html'),'utf8');
      const body=raw.replace('<head>','<head><base href="/"><script src="/__dev/storage.js"></script>')
        .replace('</body>','<script src="/__dev/commands.js"></script></body>');
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(body);
    }
    else if (url.pathname === '/__visual') file = path.join(__dirname, 'visual_art.html');
    else if (url.pathname === '/__sql.js') file = path.join(game, 'node_modules/sql.js/dist/sql-asm.js');
    else {
      file = path.resolve(dist, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(dist + path.sep)) {
        res.writeHead(403);
        return res.end('Forbidden');
      }
    }
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'Content-Length': body.length });
    res.end(body);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end(error.code === 'ENOENT' ? 'Not found' : String(error));
  }
});
const port=Number(process.env.BW_TEST_PORT || 8781);
if(!Number.isInteger(port)||(port!==0&&port<1024)||port>65535)throw new Error('Invalid local test port');
server.listen(port, '127.0.0.1', () => console.log('Browser fixture: http://localhost:'+server.address().port));
