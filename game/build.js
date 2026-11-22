const fs = require('fs'); const DIST = process.env.BW_DIST || 'dist', r = f => fs.readFileSync(f === 'artdata.js' && process.env.BW_ART_JS ? process.env.BW_ART_JS : 'src/' + f, 'utf8');   // BW_DIST and BW_ART_JS: a test build against stand-in art
const js = ['world.js', 'quests.js', 'dojo.js', 'engine.js', 'deep.js', 'sqled.js', 'effects.js', 'dungeons.js', 'dungeon_progress.js', 'dungeon_play.js', 'artdungeon.js', 'artdata.js', 'artdojo.js', 'artbody.js', 'artkit.js', 'scene_a.js', 'scene_dungeon.js', 'scene_b.js', 'poker.js', 'casino.js', 'audio.js', 'game.js'].map(r).join('\n');
if (/<\/script/i.test(js)) throw new Error('script close in js');
const html = r('shell.html').replace('/*CSS*/', () => r('style.css')).replace('/*JS*/', () => js);
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(DIST + '/index.html', html); console.log('built', (html.length / 1024).toFixed(1) + ' KB');
const { execFileSync } = require('node:child_process'), { createHash } = require('node:crypto');
const commit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: __dirname, encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Expected a full git commit for release metadata');
fs.writeFileSync(DIST + '/release.json', JSON.stringify({ commit, htmlSha256: createHash('sha256').update(html).digest('hex') }, null, 2) + '\n');
if (fs.existsSync('art')) { fs.cpSync('art', DIST + '/art', { recursive: true }); console.log('copied art/ to ' + DIST + '/art'); }   // game/art: fonts and music (source files) plus the packed art the packers write
