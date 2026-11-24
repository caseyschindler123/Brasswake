const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { selection } = require('./select-tests');
const deferUI = process.argv.includes('--defer-ui');
if (deferUI && process.argv.includes('--ui')) throw new Error('Cannot defer an explicit --ui request');
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
  ['Character skills, attributes and professional actions', ['--test', 'test/progression.test.js', 'test/skill-actions.test.js', 'test/backstab.test.js', 'test/npc-appearance.test.js']],
  ['Arrival, first-day teaching and companion routing', ['--test', 'test/first-day.test.js', 'test/prologue.test.js']],
  ['Narrative continuity', ['test/narrative_test.js']],
  ['World geography, construction and migration', ['--test', 'test/geography.test.js', 'test/buildings.test.js', 'test/building-cache.test.js', 'test/world-progress.test.js', 'test/world-services.test.js', 'test/cartography.test.js', 'test/navigation.test.js', 'test/water-depth.test.js', 'test/interiors.test.js']],
  ['Poker', ['test/pk_test.js']],
  ['Casino', ['test/house_test.js']],
  ['Sound and magic', ['--test', 'test/effects.test.js']],
  ['Dungeon layouts and progression', ['--test', 'test/dungeons.test.js', 'test/dungeon-progress.test.js', 'test/dungeon-play.test.js']],
  ['Music routing, assets and playback lifecycle', ['--test', 'test/music.test.js']],
  ['World ownership, continuous motion and presentation', ['--test', 'test/worlds_test.js', 'test/movement.test.js', 'test/actor-rig.test.js', 'test/living-places.test.js']],
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
if (selected.ui && deferUI) {
  console.log('UI coverage selected; required CI browser-profile jobs execute it before deployment.');
} else if (selected.ui) {
  if (process.env.CI) run('Install required browsers', ['test/install-browsers.js']);
  run('Browser interactions and scenes', [require.resolve('@playwright/test/cli'), 'test']);
}
