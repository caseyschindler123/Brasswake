const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runtimePackages } = require('./select-tests');

test('development-only lockfile additions do not select game UI tests', () => {
  const packages = { 'node_modules/sql.js': { version: '1.17.0', integrity: 'runtime-hash' } };
  assert.deepEqual(runtimePackages({ packages }), runtimePackages({ packages: { ...packages,
    'node_modules/playwright': { version: '1.65.1', dev: true } } }));
});
test('resolved runtime updates remain visible even when package.json ranges do not change', () => {
  assert.notDeepEqual(runtimePackages({ packages: { 'node_modules/sql.js': { version: '1.17.0' } } }),
    runtimePackages({ packages: { 'node_modules/sql.js': { version: '1.18.0' } } }));
});

test('browser configuration and specifications parse without launching a browser', () => {
  const fs = require('node:fs'), path = require('node:path'), { Script } = require('node:vm');
  for (const file of ['ui.spec.js', 'live.spec.js', 'flow.js']) {
    const filename = path.join(__dirname, 'browser', file);
    new Script(fs.readFileSync(filename, 'utf8'), { filename });
  }
  const config = require('../playwright.config');
  assert.deepEqual(config.projects.map(project => project.name), ['phone-chromium', 'phone-webkit', 'desktop-chromium']);
});

const { verifyRelease } = require('./verify-release');
const { createHash } = require('node:crypto');
const commit = 'a'.repeat(40), html = '<html>Brasswake</html>';
const hash = createHash('sha256').update(html).digest('hex');
function responses(release, body = html) {
  return async url => String(url).includes('release.json')
    ? new Response(JSON.stringify(release)) : new Response(body);
}
test('live verification accepts the exact commit and HTML', async () => {
  const receipt = await verifyRelease({ baseURL: 'https://example.com/game/', expectedCommit: commit,
    timeoutMs: 0, fetchImpl: responses({ commit, htmlSha256: hash }) });
  assert.equal(receipt.commit, commit);
});
test('live verification rejects stale commits', async () => {
  await assert.rejects(verifyRelease({ baseURL: 'https://example.com/', expectedCommit: commit,
    timeoutMs: 0, fetchImpl: responses({ commit: 'b'.repeat(40), htmlSha256: hash }) }), /Expected commit/);
});
test('live verification rejects changed HTML', async () => {
  await assert.rejects(verifyRelease({ baseURL: 'https://example.com/', expectedCommit: commit,
    timeoutMs: 0, fetchImpl: responses({ commit, htmlSha256: hash }, 'wrong release') }), /HTML hash/);
});
test('live verification rejects missing files', async () => {
  await assert.rejects(verifyRelease({ baseURL: 'https://example.com/', expectedCommit: commit,
    timeoutMs: 0, fetchImpl: async () => new Response('', { status: 404 }) }), /HTTP 404/);
});
