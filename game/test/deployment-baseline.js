const fs = require('node:fs');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const { verifyRelease } = require('./verify-release');
const root = path.resolve(__dirname, '../..');
const site = 'https://caseyschindler123.github.io/Brasswake/';
const isSHA = value => /^[a-f0-9]{40}$/.test(value || '');

async function publishedSource({ fetchImpl = fetch, verify = verifyRelease } = {}) {
  const response = await fetchImpl(new URL('release.json?t=' + Date.now(), site), { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error('Cannot establish published coverage baseline: HTTP ' + response.status);
  const metadata = await response.json();
  if (!isSHA(metadata.commit)) throw Error('Invalid published source identity.');
  return verify({ baseURL: site, expectedCommit: metadata.commit, fetchImpl, timeoutMs: 20000 });
}
function isAncestor(older, newer) {
  const result = spawnSync('git', ['merge-base', '--is-ancestor', older, newer], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0 && result.status !== 1) throw Error('Cannot establish release ancestry.');
  return result.status === 0;
}
function assertDeploymentOrder(live, candidate, ancestor = isAncestor) {
  if (!isSHA(live) || !isSHA(candidate)) throw Error('A verified live and candidate source are required.');
  if (!ancestor(live, candidate)) throw Error('Candidate predates or diverges from the published game; refusing rollback.');
}
function publicationDecision(live, candidate, verified, ancestor = isAncestor) {
  assertDeploymentOrder(live, candidate, ancestor);
  if (!isSHA(verified)) throw Error('The core verification baseline is required.');
  if (live === candidate) return false;
  if (live !== verified) throw Error('Published source changed since verification; rerun all checks.');
  return true;
}
if (require.main === module) (async () => {
  const receipt = await publishedSource();
  const candidate = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== candidate) throw Error('Checkout does not match the requested candidate.');
  if (process.argv.includes('--guard')) {
    const publish = publicationDecision(receipt.commit,candidate,process.env.BW_VERIFIED_BASE);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,'publish='+publish+'\n');
    console.log(publish ? 'Forward publication matches the verified baseline.' : 'Candidate already published; verify it without republishing.');
  } else if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, 'BW_RELEASE_BASE=' + receipt.commit + '\nBW_RELEASE_VERIFIED=true\n');
  }
  console.log('Verified published baseline: ' + receipt.commit);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { publishedSource, assertDeploymentOrder, publicationDecision, isSHA };
