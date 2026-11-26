const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { verifyRelease } = require('./verify-release');
const { liveSuites } = require('./live-suites');
const { decodeSelection } = require('./selection-transport');
const baseURL = process.env.BW_BASE_URL;
const commit = process.env.BW_EXPECT_COMMIT;
if (!baseURL || !/^https?:\/\//.test(baseURL) || !/^[a-f0-9]{40}$/.test(commit || '')) {
  console.error('Set BW_BASE_URL to the site URL and BW_EXPECT_COMMIT to its full 40-character commit.');
  process.exit(1);
}
async function main() {
  process.chdir(path.resolve(__dirname, '..'));
  // CI passes its validated exact-commit plan. Standalone checks default to all
  // hosted flows, so an absent plan can never silently narrow verification.
  const suites = process.env.BW_SELECTION === undefined ? undefined
    : liveSuites(decodeSelection(process.env.BW_SELECTION));
  const receipt = await verifyRelease({ baseURL, expectedCommit: commit });
  fs.mkdirSync('../work', { recursive: true });
  fs.writeFileSync('../work/live-release.json', JSON.stringify(receipt, null, 2) + '\n');
  console.log('Verified live commit and HTML hash: ' + receipt.commit);
  if (!['1', 'true'].includes(process.env.BW_LIVE_UI)) {
    console.log('Live UI testing not required for this release.');
    return;
  }
  const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test'], {
    stdio: 'inherit', env: { ...process.env, BW_LIVE: '1', BW_BASE_URL: baseURL.replace(/\/?$/, '/'),
      ...(suites ? { BW_LIVE_SUITES: JSON.stringify(suites) } : {}) },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
