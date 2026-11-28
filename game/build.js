const fs = require('fs'); const DIST = process.env.BW_DIST || 'dist', r = f => fs.readFileSync(f === 'artdata.js' && process.env.BW_ART_JS ? process.env.BW_ART_JS : f === 'artworld.js' && process.env.BW_WORLD_ART_JS ? process.env.BW_WORLD_ART_JS : 'src/' + f, 'utf8');
const js = ['progression.js', 'techniques.js', 'live_combat.js', 'combat_controller.js', 'battle_rules.js', 'creature_loot.js', 'equipment_rules.js', 'equipment_view.js', 'equipment_screen.js', 'artheads.js', 'artpaintedheads.js', 'head_portraits.js', 'mounts.js', 'artmount.js', 'artvenues.js', 'mount_view.js', 'attachment_fit.js', 'deletion_rules.js', 'sneaking.js', 'backstab.js', 'skill_crafting.js', 'world.js', 'quests.js', 'dojo.js', 'engine.js', 'learning.js', 'advanced_sql.js', 'query_feedback.js', 'first_day.js', 'prologue.js', 'companion.js', 'deep.js', 'sqled.js', 'effects.js', 'geography.js', 'cartography.js', 'water_depth.js', 'interiors.js', 'navigation.js', 'world_progress.js', 'buildings.js', 'building_cache.js', 'building_view.js', 'dungeon_layouts.js', 'dungeons.js', 'dungeon_progress.js', 'dungeon_play.js', 'artdungeon.js', 'artdata.js', 'artdojo.js', 'artbody.js', 'arthuman.js', 'artpainted.js', 'artpaintedtwo.js', 'painted_two_body.js', 'artpaintedgear.js', 'human_gaits.js', 'painted_gaits.js', 'artkit.js', 'artworld.js', 'artlandscape.js', 'artarchitecture.js', 'artcartography.js', 'artship.js', 'character_profiles.js', 'npc_appearance.js', 'movement.js', 'interaction_rules.js', 'actor_rig.js', 'painted_character_view.js', 'painted_gear.js', 'terrain_edges.js', 'landscape.js', 'service_places.js', 'scene_a.js', 'scene_dungeon.js', 'scene_world.js', 'scene_cartography.js', 'scene_venues.js', 'scene_living.js', 'scene_landscape.js', 'scene_services.js', 'scene_controls.js', 'scene_ship.js', 'scene_combat.js', 'scene_b.js', 'poker.js', 'casino.js', 'audio.js', 'world_services.js', 'cartography_screen.js', 'character_worlds.js', 'game.js'].map(r).join('\n');
if (/<\/script/i.test(js)) throw new Error('script close in js');
const raw = r('shell.html').replace('/*CSS*/', () => r('style.css')).replace('/*JS*/', () => r('offline.js') + '\n' + js);
const { execFileSync } = require('node:child_process'), { createHash } = require('node:crypto');
const path = require('node:path');
const hash = data => createHash('sha256').update(data).digest('hex');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name, 'en')).flatMap(e => {
    const file = dir + '/' + e.name;
    return e.isDirectory() ? walk(file) : [file];
  });
}
const inputs = ['src/manifest.webmanifest', 'src/service-worker.js', ...walk('art'), ...walk('vendor'), require.resolve('sql.js/dist/sql-asm.js')];
const version = hash(raw + inputs.map(f => f.replaceAll('\\', '/').split('/node_modules/').pop() + ':' + hash(fs.readFileSync(f))).join('\n'));
const html = raw.replace('/*RELEASE*/', version);
fs.mkdirSync(DIST, { recursive: true });
fs.copyFileSync('src/manifest.webmanifest', DIST + '/manifest.webmanifest');
fs.writeFileSync(DIST + '/index.html', html); console.log('built', (html.length / 1024).toFixed(1) + ' KB');
const commit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: __dirname, encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Expected a full git commit for release metadata');
fs.writeFileSync(DIST + '/release.json', JSON.stringify({ commit, htmlSha256: createHash('sha256').update(html).digest('hex') }, null, 2) + '\n');
if (fs.existsSync('art')) { fs.cpSync('art', DIST + '/art', { recursive: true }); console.log('copied art/ to ' + DIST + '/art'); }   // game/art: fonts and music (source files) plus the packed art the packers write
fs.cpSync('vendor', DIST + '/vendor', { recursive: true });
fs.copyFileSync(require.resolve('sql.js/dist/sql-asm.js'), DIST + '/vendor/sql-asm.js');
fs.copyFileSync(path.join(path.dirname(require.resolve('sql.js/dist/sql-asm.js')), '../LICENSE'), DIST + '/vendor/SQL-LICENSE');
fs.copyFileSync('src/service-worker.js', DIST + '/service-worker.js');
const files = ['index.html', 'manifest.webmanifest', ...walk('art'), ...walk('vendor'), 'vendor/sql-asm.js', 'vendor/SQL-LICENSE']
  .map(url => { const data=fs.readFileSync(DIST + '/' + url); return {url, bytes:data.length, sha256:hash(data)}; });
fs.writeFileSync(DIST + '/offline-manifest.json', JSON.stringify({version, bytes:files.reduce((n,f)=>n+f.bytes,0), files}) + '\n');
console.log('Offline copy: ' + files.length + ' files, ' + (files.reduce((n,f)=>n+f.bytes,0)/1e6).toFixed(1) + ' MB');
