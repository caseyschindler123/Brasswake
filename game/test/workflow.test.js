const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chooseUI, runtimePackages } = require('./select-tests');

for (const file of ['AGENTS.md', 'game/docs/05_CODING_WORKFLOW.md', '.github/workflows/pages.yml',
  'game/package-lock.json']) {
  test('tooling-only change skips UI: ' + file, () => assert.equal(chooseUI({ files: [file] }).ui, false));
}
for (const file of ['game/src/game.js', 'game/src/style.css', 'game/src/shell.html', 'game/art/i/bag.webp']) {
  test('game change requires UI: ' + file, () => assert.equal(chooseUI({ files: [file] }).ui, true));
}
for (const file of ['game/test/browser/ui.spec.js', 'game/test/browser/dungeons.js', 'game/test/browser/flow.js']) {
  test('browser regression repair requires UI: ' + file, () => assert.equal(chooseUI({ files: [file] }).ui, true));
}
test('runtime dependency changes require UI', () => assert.equal(chooseUI({ files: ['game/package.json'], runtimeChanged: true }).ui, true));
test('metadata-only build changes skip UI when HTML matches', () => assert.equal(chooseUI({ files: ['game/build.js'], buildChanged: false }).ui, false));
test('changed build output requires UI', () => assert.equal(chooseUI({ files: ['game/build.js'], buildChanged: true }).ui, true));
test('missing comparison fails toward UI coverage', () => assert.equal(chooseUI({ files: [], baselineAvailable: false }).ui, true));

test('deferred CI execution cannot suppress explicitly requested UI coverage', () => {
  const {spawnSync}=require('node:child_process'),path=require('node:path');
  const result=spawnSync(process.execPath,[path.join(__dirname,'verify.js'),'--defer-ui','--ui'],{encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Cannot defer an explicit --ui request/);
  assert.doesNotMatch(result.stdout,/Packed art/);
});

test('CI covers every configured browser profile and gates deployment on their result', () => {
  const fs=require('node:fs'),path=require('node:path'),config=require('../playwright.config');
  const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/pages.yml'),'utf8').replace(/\r/g,'');
  const browser=workflow.split('\n  browser:\n')[1]?.split('\n  deploy:\n')[0];
  assert.ok(browser,'required browser job exists');
  const profiles=[...browser.matchAll(/- project: ([\w-]+)\n\s+browser: ([\w-]+)/g)].map(m=>[m[1],m[2]]).sort();
  assert.deepEqual(profiles,config.projects.map(p=>[p.name,p.use.browserName]).sort());
  assert.equal(config.retries,0);
  assert.match(browser,/fail-fast: false/);
  const aggregate=workflow.split('\n  build:\n')[1]?.split('\n  deploy:\n')[0];
  assert.match(aggregate,/needs: \[core, browser\]/);
  assert.match(aggregate,/always\(\) && !cancelled\(\)/);
  assert.match(aggregate,/node game\/test\/release-gate\.js/);
  const deploy=workflow.split('\n  deploy:\n')[1];
  assert.match(deploy,/needs: \[core, build\]/);
  assert.match(deploy,/needs\.build\.result == 'success'/);
  assert.match(deploy,/!cancelled\(\)/);
  assert.doesNotMatch(workflow,/continue-on-error: true/);
});

test('release gate rejects missing selection, failed core and incomplete selected browser jobs', () => {
  const {releaseGate}=require('./release-gate');
  assert.equal(releaseGate({core:'success',ui:'true',browser:'success'}),true);
  assert.equal(releaseGate({core:'success',ui:'false',browser:'skipped'}),true);
  for(const ui of ['true','false',undefined,'invalid'])for(const browser of ['success','failure','cancelled','skipped',undefined]) {
    const approved=ui==='true'&&browser==='success'||ui==='false'&&browser==='skipped';
    assert.equal(releaseGate({core:'success',ui,browser}),approved);
    assert.equal(releaseGate({core:'failure',ui,browser}),false);
    assert.equal(releaseGate({core:'cancelled',ui,browser}),false);
  }
});

test('aggregate CLI reads the same result environment used by Actions', () => {
  const {spawnSync}=require('node:child_process'),path=require('node:path');
  for(const [ui,browser,approved] of [['true','success',true],['false','skipped',true],['','skipped',false],['true','failure',false],['true','skipped',false]]) {
    const result=spawnSync(process.execPath,[path.join(__dirname,'release-gate.js')],{
      encoding:'utf8',env:{...process.env,BW_CORE_RESULT:'success',BW_UI_SELECTED:ui,BW_BROWSER_RESULT:browser},
    });
    assert.equal(result.status===0,approved,JSON.stringify({ui,browser}));
  }
});
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
