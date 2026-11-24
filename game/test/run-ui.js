const { spawnSync } = require('node:child_process');
const { ALL_SUITES, normalizeSuites, suitesFromEnvironment } = require('./ui-suites');
const args = process.argv.slice(2), requested = args.find(a => a.startsWith('--suites='));
if (requested && args.includes('--full')) throw Error('Choose --full or --suites, not both.');
const suites = args.includes('--full') ? ALL_SUITES : requested
  ? normalizeSuites(['smoke', ...requested.slice(9).split(',')]) : suitesFromEnvironment();
const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test',
  ...args.filter(a => a !== '--full' && a !== requested)], {
  stdio: 'inherit', env: { ...process.env, BW_UI_SUITES: JSON.stringify(suites) },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
