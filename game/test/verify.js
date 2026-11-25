const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { selection, saveSelection } = require('./select-tests');
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
  ['Character skills, attributes and professional actions', ['--test', 'test/progression.test.js', 'test/battle-rules.test.js', 'test/skill-actions.test.js', 'test/backstab.test.js', 'test/npc-appearance.test.js']],
  ['Arrival, first-day teaching and companion routing', ['--test', 'test/first-day.test.js', 'test/prologue.test.js']],
  ['Narrative continuity', ['test/narrative_test.js']],
  ['World geography, construction and migration', ['--test', 'test/geography.test.js', 'test/buildings.test.js', 'test/building-cache.test.js', 'test/world-progress.test.js', 'test/world-services.test.js', 'test/cartography.test.js', 'test/navigation.test.js', 'test/water-depth.test.js', 'test/interiors.test.js', 'test/home-restoration.test.js']],
  ['Poker', ['test/pk_test.js']],
  ['Casino', ['test/house_test.js']],
  ['Sound and magic', ['--test', 'test/effects.test.js']],
  ['Dungeon layouts and progression', ['--test', 'test/dungeons.test.js', 'test/dungeon-progress.test.js', 'test/dungeon-play.test.js']],
  ['Music routing, assets and playback lifecycle', ['--test', 'test/music.test.js']],
  ['World ownership, continuous motion and presentation', ['--test', 'test/worlds_test.js', 'test/movement.test.js', 'test/actor-rig.test.js', 'test/living-places.test.js', 'test/respawn.test.js']],
  ['Build', ['build.js']],
  ['Workflow tooling and offline storage', ['--test', 'test/workflow.test.js', 'test/protocol.test.js', 'test/server.test.js', 'test/offline.test.js']],
]) {
  run(label, args);
}
const selected = selection({ forceFull: process.argv.includes('--ui') });
console.log('\nVerification tier: ' + selected.tier + '. ' + selected.reason);
saveSelection(selected);
if (selected.ui && deferUI) {
  console.log('Selected browser suites are deferred to the authoritative CI release gate.');
} else if (selected.ui) {
  process.env.BW_UI_SUITES = JSON.stringify(selected.suites);
  if (process.env.CI) run('Install required browsers', ['test/install-browsers.js']);
  run('Selected browser interactions', ['test/run-ui.js']);
}
