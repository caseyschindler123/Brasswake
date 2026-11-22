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
    let file;
    if (url.pathname === '/__health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('Brasswake browser tests');
    }
    if (url.pathname === '/__visual') file = path.join(__dirname, 'visual_art.html');
    else if (url.pathname === '/__sql.js') file = path.join(game, 'node_modules/sql.js/dist/sql-asm.js');
    else {
      file = path.resolve(dist, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!file.startsWith(dist + path.sep)) {
        res.writeHead(403);
        return res.end('Forbidden');
      }
    }
    let body = await fs.readFile(file);
    if (url.pathname === '/index.html' && url.searchParams.get('visual_test') === '1') {
      const html = body.toString('utf8');
      const dependency = /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/sql\.js\/[^"\s]+\/sql-asm\.js/g;
      if ([...html.matchAll(dependency)].length !== 1) throw new Error('Expected one SQL dependency');
      body = Buffer.from(html.replace(dependency, '/__sql.js'));
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'Content-Length': body.length });
    res.end(body);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end(error.code === 'ENOENT' ? 'Not found' : String(error));
  }
});
const port=Number(process.env.BW_TEST_PORT || 8781);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid local test port');
server.listen(port, '127.0.0.1', () => console.log('Browser fixture: http://localhost:'+port));
