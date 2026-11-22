const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

test('localhost tooling serves the built game and isolated fixtures safely', { timeout: 15000 }, async t => {
  const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  await new Promise((resolve, reject) => {
    child.stdout.once('data', resolve);
    child.once('error', reject);
    child.once('exit', code => reject(new Error('Test server exited before readiness: ' + code)));
  });
  const base = 'http://127.0.0.1:8781';
  const health = await fetch(base + '/__health');
  assert.equal(health.status, 200);
  const production = await (await fetch(base + '/index.html')).text();
  assert.match(production, /https:\/\/cdnjs\.cloudflare\.com/);
  const fixture = await (await fetch(base + '/index.html?visual_test=1')).text();
  assert.match(fixture, /src="\/__sql.js"/);
  assert.doesNotMatch(fixture, /src="https:\/\/cdnjs\.cloudflare\.com/);
  assert.match(await (await fetch(base + '/__visual')).text(), /Preparing visual test/);
  assert.equal((await fetch(base + '/__sql.js')).status, 200);
  assert.equal((await fetch(base + '/%2e%2e%2fpackage.json')).status, 403);
  assert.equal((await fetch(base + '/not-a-game-file')).status, 404);
});
