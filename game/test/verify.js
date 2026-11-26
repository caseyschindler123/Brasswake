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
const selected = selection({ forceFull: process.argv.includes('--ui') });
const groups=new Set(selected.coreGroups);
const entries=[
  ['Packed art', ['../arttools/check_packed_art.js']],
  ['Engine and content', ['test/test.js']],
  ['Character skills, attributes and professional actions', ['--test', 'test/progression.test.js', 'test/battle-rules.test.js', 'test/skill-actions.test.js', 'test/backstab.test.js', 'test/npc-appearance.test.js','test/equipment-rules.test.js','test/equipment-view.test.js','test/resource-equipment.test.js']],
  ['Arrival, first-day teaching and companion routing', ['--test', 'test/first-day.test.js', 'test/prologue.test.js']],
  ['Narrative continuity', ['test/narrative_test.js']],
  ['World geography, construction and migration', ['--test', 'test/geography.test.js', 'test/buildings.test.js', 'test/building-cache.test.js', 'test/world-progress.test.js', 'test/world-services.test.js', 'test/cartography.test.js', 'test/navigation.test.js', 'test/water-depth.test.js', 'test/interiors.test.js', 'test/home-restoration.test.js','test/settlements.test.js']],
  ['Poker', ['test/pk_test.js']],
  ['Casino', ['test/house_test.js']],
  ['Sound and magic', ['--test', 'test/effects.test.js']],
  ['Dungeon layouts and progression', ['--test', 'test/dungeons.test.js', 'test/dungeon-progress.test.js', 'test/dungeon-play.test.js', 'test/architecture-dungeon.test.js', 'test/architecture-art.test.js']],
  ['Music routing, assets and playback lifecycle', ['--test', 'test/music.test.js']],
  ['World ownership, continuous motion and presentation', ['--test', 'test/worlds_test.js', 'test/movement.test.js', 'test/actor-rig.test.js', 'test/human-locomotion.test.js', 'test/human-costume.test.js', 'test/human-sprites.test.js', 'test/living-places.test.js', 'test/landscape.test.js', 'test/respawn.test.js','test/attachment-fit.test.js','test/head-portraits.test.js','test/deletion-rules.test.js','test/mounts.test.js']],
  ['Build', ['build.js']],
  ['Workflow tooling', ['--test', 'test/workflow.test.js', 'test/protocol.test.js', 'test/scope.test.js']],
  ['Offline storage and server', ['--test','test/server.test.js','test/offline.test.js']],
];
const names=['assets','engine','actors','world','engine','world','cards','cards','effects','world','audio','actors','build','protocol','packaging'];
for(let i=0;i<entries.length;i++)if(groups.has('all')||groups.has(names[i]))run(...entries[i]);
if(selected.ui&&!deferUI&&!groups.has('all')&&!groups.has('build'))run('Build for selected local browser checks',['build.js']);
console.log('\nVerification tier: ' + selected.tier + '. ' + selected.reason);
saveSelection(selected);
if (selected.ui && deferUI) {
  console.log('Selected browser suites are deferred to the authoritative CI release gate.');
} else if (selected.ui) {
  process.env.BW_UI_SUITES = JSON.stringify(selected.suites);
  process.env.BW_SCENES=JSON.stringify(selected.scenes);process.env.BW_SCENE_PROFILES=JSON.stringify(selected.sceneProfiles);
  if (process.env.CI) run('Install required browsers', ['test/install-browsers.js']);
  run('Selected browser interactions', ['test/run-ui.js']);
}
