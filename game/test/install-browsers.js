require('./browser-path');
const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'install',
  ...(process.platform === 'linux' ? ['--with-deps'] : []), 'chromium', 'webkit'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
