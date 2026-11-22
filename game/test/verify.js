const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { selection } = require('./select-tests');
process.chdir(path.resolve(__dirname, '..'));
delete process.env.BW_LIVE;

function run(label, args) {
  console.log('\n' + label);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
for (const [label, args] of [
  ['Packed art', ['../arttools/check_packed_art.js']],
  ['Engine and content', ['test/test.js']],
  ['Poker', ['test/pk_test.js']],
  ['Casino', ['test/house_test.js']],
  ['Sound and magic', ['--test', 'test/effects.test.js']],
  ['Dungeon layouts and progression', ['--test', 'test/dungeons.test.js', 'test/dungeon-progress.test.js', 'test/dungeon-play.test.js']],
  ['Music routing, assets and playback lifecycle', ['--test', 'test/music.test.js']],
  ['Build', ['build.js']],
  ['Workflow tooling', ['--test', 'test/workflow.test.js', 'test/server.test.js']],
]) {
  run(label, args);
}
const selected = selection();
if (process.argv.includes('--ui')) { selected.ui = true; selected.reason = 'UI verification explicitly requested.'; }
console.log('\nUI selection: ' + selected.ui + '. ' + selected.reason);
fs.mkdirSync('../work', { recursive: true });
fs.writeFileSync('../work/test-selection.json', JSON.stringify(selected, null, 2) + '\n');
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'ui=' + selected.ui + '\n');
if (selected.ui) {
  if (process.env.CI) run('Install required browsers', ['test/install-browsers.js']);
  run('Browser interactions and scenes', [require.resolve('@playwright/test/cli'), 'test']);
}
