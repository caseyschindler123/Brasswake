const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

test('localhost tooling serves the built game and isolated fixtures safely', { timeout: 15000 }, async t => {
  const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, BW_TEST_PORT: '0' } });
  t.after(() => child.kill());
  const ready = await new Promise((resolve, reject) => {
    child.stdout.once('data', data => resolve(data.toString()));
    child.once('error', reject);
    child.once('exit', code => reject(new Error('Test server exited before readiness: ' + code)));
  });
  const port = ready.match(/http:\/\/localhost:(\d+)/)?.[1];
  assert.ok(port, 'The fixture reports its selected port');
  const base = 'http://127.0.0.1:' + port;
  const health = await fetch(base + '/__health');
  assert.equal(health.status, 200);
  const production = await (await fetch(base + '/index.html')).text();
  assert.match(production, /src="vendor\/sql-asm.js"/);
  assert.doesNotMatch(production, /https:\/\/(cdnjs|fonts\.googleapis)/);
  const fixture = await (await fetch(base + '/index.html?visual_test=1')).text();
  assert.equal(fixture, production, 'Fixtures use the same bundled SQL engine as production');
  assert.doesNotMatch(fixture, /src="https:\/\/cdnjs\.cloudflare\.com/);
  assert.match(await (await fetch(base + '/__visual')).text(), /Preparing visual test/);
  assert.equal((await fetch(base + '/__sql.js')).status, 200);
  assert.equal((await fetch(base + '/vendor/sql-asm.js')).status, 200);
  assert.equal((await fetch(base + '/service-worker.js')).status, 200);
  assert.equal((await fetch(base + '/%2e%2e%2fpackage.json')).status, 403);
  assert.equal((await fetch(base + '/not-a-game-file')).status, 404);
});
