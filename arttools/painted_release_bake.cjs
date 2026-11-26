/* Bake immutable WebP assets and renderer metadata into ignored staging. */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const {pipeline} = require('node:stream/promises');
const {execFile} = require('node:child_process');
const {createHash} = require('node:crypto');
const {promisify} = require('node:util');
const {generate} = require('./painted_release_metadata.cjs');

const root = path.resolve(__dirname, '..');
const work = path.join(root, 'work/painted-release');
const pilot = path.join(root, 'work/painted-characters/model-pilot');
const args = new Map(process.argv.slice(2).map(value => {
  const at = value.indexOf('=');
  return at < 0 ? [value, true] : [value.slice(0, at), value.slice(at + 1)];
}));
const choice = (arg, length) => {
  if (!args.has(arg)) return Array.from({length}, (_, i) => i);
  const number = Number(args.get(arg));
  if (!Number.isInteger(number) || number < 0 || number >= length) throw Error('Invalid ' + arg);
  return [number];
};
const selected = choice('--profile', 6), outfits = choice('--outfit', 5);
const onlyGuides = args.has('--guides');
const withGuides = args.has('--write-guides');
const shapeProof = args.has('--shape-proof');
const refined = args.has('--refined') || shapeProof;
const pilotCheck = args.has('--pilot');
const states = args.has('--states') ? args.get('--states').split(',') : undefined;
const slot = args.get('--slot');
const archetype = args.get('--archetype');
if (slot && !['hands', 'feet', 'cloak', 'armor'].includes(slot)) throw Error('Invalid --slot');
if (slot && (!archetype || !/^[a-z0-9_-]+$/.test(archetype))) throw Error('Missing safe --archetype');
const partial = states || pilotCheck || args.has('--full-head');
const partsOnly = args.has('--parts-only');
const slotGroup = args.get('--slot-group');
if (slotGroup && (!partsOnly || !['armor', 'hands', 'feet', 'cloak'].includes(slotGroup))) {
  throw Error('--slot-group requires --parts-only and a wardrobe slot');
}
const withSlots = !slot && (!partial || slotGroup && states) && !onlyGuides && !args.has('--body-only');
if (partsOnly && !withSlots) throw Error('Parts-only mode requires the complete wardrobe slot roster');
const stageName = args.get('--stage');
if (stageName && (typeof stageName !== 'string' || !/^[a-z0-9-]+$/.test(stageName))) throw Error('Invalid --stage');
const dest = stageName ? path.join(work, stageName) : partial ? path.join(work, 'smoke') : work;
const python = args.get('--python') || 'python';
const parallel = Number(args.get('--jobs') || 1);
if (!Number.isInteger(parallel) || parallel < 1 || parallel > 6) throw Error('Invalid --jobs');
const archive = args.get('--archive') || 'C:/Users/caseys/source/SQL Game/painted_characters_2026_11_26';
const three = path.join(archive, 'motion-source/work/quaternius-jog-sample/build');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const exec = promisify(execFile);
require('../game/test/browser-path');
const {chromium} = require('../game/node_modules/playwright');

const RECEIPT_INPUTS = [
  'arttools/human_mesh.py', 'arttools/human_mesh_sources.json',
  'arttools/painted_model_geometry.js', 'arttools/painted_model_inputs.json', 'arttools/painted_model_mesh_sources.json',
  'arttools/painted_model_motion.js', 'arttools/painted_model_reference.cjs', 'arttools/painted_model_textures.py',
  'arttools/painted_motion.cjs', 'arttools/painted_release_atlas.js', 'arttools/painted_release_bake.cjs',
  'arttools/painted_release_body_shape.js',
  'arttools/painted_release_combat.cjs', 'arttools/painted_release_combat.js', 'arttools/painted_release_combat_sources.json',
  'arttools/painted_release_geometry.js', 'arttools/painted_release_metadata.cjs', 'arttools/painted_release_profile_paints.json',
  'arttools/painted_release_profile_paints.py', 'arttools/painted_release_profiles.py', 'arttools/painted_release_render.js',
  'arttools/painted_release_wardrobe.js', 'arttools/painted_release_wardrobe_projection.py',
  'arttools/painted_release_wardrobe_projection_sources.json',
  'arttools/painted_release_wardrobe_sources.json', 'arttools/painted_release_wardrobe_textures.py',
  'game/src/human_locomotion.js',
];

const STATE_COUNT = 15;

async function receiptInputs() {
  return Promise.all(RECEIPT_INPUTS.map(async file => ({
    path: file, sha256: hash((await fsp.readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n')),
  })));
}

async function textureInputs() {
  const folder = path.join(work, 'textures');
  return Promise.all((await fsp.readdir(folder)).filter(name => name.endsWith('.png'))
    .sort().map(async name => ({file: name, sha256: hash(await fsp.readFile(path.join(folder, name)))})));
}

const encoder = `
import json, sys
if sys.argv[1] != '-':
    sys.path.insert(0, sys.argv[1])
import PIL
from PIL import Image
if PIL.__version__ != '12.0.0':
    raise RuntimeError('Painted release requires the pinned Pillow 12.0.0')
with Image.open(sys.argv[2]) as im:
    if im.mode != 'RGBA':
        raise ValueError('Expected RGBA')
    im.save(sys.argv[3], format='WEBP', lossless=True, method=4, exact=True)
    print(json.dumps(list(im.size)))
`;

const MIME = {'.js': 'application/javascript', '.png': 'image/png'};
function server() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/') {
        res.setHeader('content-type', 'text/html');
        return res.end('<script type="importmap">{"imports":{"three":"/three.module.js"}}</script>');
      }
      const output = /^\/save\/(png|guides)\/([a-z0-9_-]+)$/.exec(url.pathname);
      if (output && req.method === 'POST') {
        const [, group, name] = output;
        const file = group === 'guides' && shapeProof ? path.join(work, 'shape-guides', name + '.png')
          : path.join(group === 'guides' ? work : dest, group, name + '.png');
        await pipeline(req, fs.createWriteStream(file));
        return res.end('saved');
      }
      const texture = /^\/textures\/([a-z0-9-]+)\.png$/.exec(url.pathname);
      const threeModule = /^\/three\.[a-z.]+\.js$/.test(url.pathname);
      if (!texture && !threeModule) {
        res.writeHead(404);
        return res.end();
      }
      const file = texture ? path.join(work, 'textures', texture[1] + '.png') : path.join(three, path.basename(url.pathname));
      const bytes = await fsp.readFile(file);
      res.setHeader('content-type', MIME[path.extname(file)]);
      res.end(bytes);
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end(error.message);
    }
  });
}

async function eachPool(items, count, callback) {
  const result = [];
  let next = 0;
  await Promise.all(Array.from({length: Math.min(count, items.length)}, async () => {
    while (next < items.length) {
      const i = next++;
      result[i] = await callback(items[i]);
    }
  }));
  return result;
}

async function encode(result) {
  const combos = [...Object.values(result.combos), ...Object.values(result.slots).flatMap(slot => Object.values(slot))];
  const assets = combos.flatMap(combo => [combo.doll, ...Object.values(combo.states)]).filter(Boolean).map(asset => asset.file);
  return eachPool(assets, 3, async asset => {
    const raw = path.join(dest, 'png', path.basename(asset, '.webp') + '.png');
    const output = path.join(dest, 'art', path.basename(asset));
    const packages = args.has('--python') ? '-' : path.join(work, 'pinned-python');
    const {stdout} = await exec(python, ['-I', '-X', 'utf8', '-c', encoder, packages, raw, output]);
    const bytes = await fsp.readFile(output);
    await fsp.unlink(raw);
    return {path: 'art/' + asset, size: bytes.length, sha256: hash(bytes), dimensions: JSON.parse(stdout)};
  });
}

async function bakeProfile(browser, port, profile) {
  const page = await browser.newPage();
  page.on('console', message => {
    if (message.type() === 'log' || message.type() === 'error') console.log('Profile ' + profile + ' · ' + message.text());
  });
  try {
    await page.goto('http://127.0.0.1:' + port);
    await page.evaluate(async () => { window.THREE = await import('three'); });
    const scripts = [
      'work/painted-release/profiles/' + profile + '.js',
      'work/painted-characters/motion-data.js', 'work/painted-characters/model-pilot/source-upper-motion.js',
      'game/src/human_locomotion.js', 'arttools/painted_model_geometry.js', 'arttools/painted_model_motion.js',
      ...(refined ? ['arttools/painted_release_body_shape.js'] : []),
      'arttools/painted_release_geometry.js', 'arttools/painted_release_wardrobe.js',
      'work/painted-release/combat/motion.js', 'arttools/painted_release_combat.js',
      'arttools/painted_release_render.js', 'arttools/painted_release_atlas.js',
    ];
    const optional = new Set([
      'arttools/painted_release_wardrobe.js',
      'work/painted-release/combat/motion.js', 'arttools/painted_release_combat.js',
    ]);
    for (const script of scripts) {
      const file = path.join(root, script);
      if (!optional.has(script) || fs.existsSync(file)) await page.addScriptTag({path: file});
    }
    const spec = {outfits, states, onlyGuides, withGuides, slot, archetype, withSlots, partsOnly, slotGroup,
      omitDolls: !!(slotGroup && states), pilot: pilotCheck,
      fullHead: args.has('--full-head'), refined, sex: Math.floor(profile / 3), build: profile % 3};
    const result = await page.evaluate(options => {
      if (options.states?.some(state => !PaintedReleaseAtlas.STATES.includes(state))) throw Error('Unknown bake state');
      const source = options.refined ? PaintedReleaseBodyShape.refine(HumanMeshData, options.build) : HumanMeshData;
      return PaintedReleaseAtlas.bake(PaintedReleaseRender.buildProfile(source, options.sex, options.build, HumanMeshData), options);
    }, spec);
    if (!onlyGuides) {
      const receipt = JSON.parse(await fsp.readFile(path.join(work, 'profiles', profile + '.json'), 'utf8'));
      if (refined && profile % 3 !== 0) receipt.anatomicalRefinement = 'painted_release_body_shape.js';
      const files = await encode(result);
      result.files = files;
      result.source = receipt;
      const key = slot ? profile + '-' + slot + '-' + archetype :
        profile + (slotGroup ? '-parts-' + slotGroup : partsOnly ? '-parts' : outfits.length === 1 ? '-outfit-' + outfits[0] : '');
      await fsp.writeFile(path.join(dest, 'records', key + '.json'), JSON.stringify(result) + '\n');
    }
    return result;
  } finally {
    await page.close();
  }
}

async function collect(results, startInputs = null, startTextures = null) {
  const {origin, directions, sourceDirections, frames, actions, gaits} = results[0];
  const combos = Object.assign({}, ...results.map(result => result.combos));
  const slots = Object.fromEntries(results.map(result => [result.source.profile, result.slots]));
  const {slotCatalog} = require('./painted_release_wardrobe.js');
  const catalogComplete = result => Object.entries(slotCatalog).every(([slot, keys]) => {
    const provided = result.slots[slot];
    return provided && keys.length === Object.keys(provided).length && keys.every(key => provided[key]);
  });
  const complete = results.length === 6 && Object.keys(combos).length === 30 && results.every(catalogComplete);
  const allLooks = [...Object.values(combos), ...Object.values(slots).flatMap(slot => Object.values(slot).flatMap(Object.values))];
  for (const look of allLooks) {
    if (Object.keys(look.states).length !== STATE_COUNT || !look.doll?.file) throw Error('Missing frames for fitted profile');
    for (const [state, bank] of Object.entries(look.states)) {
      const expected = ['idle', 'sit'].includes(state) ? 1 : ['walk', 'run'].includes(state) ? frames : actions;
      if (bank.frames.length !== directions || bank.frames.some(row => row.length !== expected)) {
        throw Error('Wrong frame count for ' + bank.file);
      }
    }
  }
  const inputs = await receiptInputs(), textures = await textureInputs();
  if (startInputs && JSON.stringify(inputs) !== JSON.stringify(startInputs)) throw Error('Baker inputs changed during rendering');
  if (startTextures && JSON.stringify(textures) !== JSON.stringify(startTextures)) throw Error('Painted textures changed during rendering');
  const meta = {version: 2, width: 256, height: 256, origin, directions, sourceDirections, frames, actions, painted: true,
    combos, slots, gaits, profileGaits: results.map(result => result.gaits)};
  await fsp.writeFile(path.join(dest, 'release-metadata.json'), JSON.stringify(meta) + '\n');
  const generated = generate(meta);
  await fsp.writeFile(path.join(dest, 'release-metadata.js'), generated);
  const gaitModule = [
    '/* Generated by arttools/painted_release_bake.cjs. */',
    'const PaintedGaits = ' + JSON.stringify({frames, ...gaits, profileGaits: meta.profileGaits}) + ';',
    'if (typeof module !== "undefined") module.exports = PaintedGaits;', '',
  ].join('\n');
  await fsp.writeFile(path.join(dest, 'release-gaits.js'), gaitModule);
  const files = results.flatMap(result => result.files).sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (files.length !== new Set(files.map(file => file.path)).size || files.length !== allLooks.length * (STATE_COUNT + 1)) {
    throw Error('Missing or duplicate artwork output in release manifest');
  }
  const profilePaints = JSON.parse(await fsp.readFile(path.join(work, 'profile-paint-receipt.json'), 'utf8'));
  const sources = {profiles: results.map(result => result.source), profilePaints, textures};
  const metadata = {path: 'game/src/artpainted.js', sha256: hash(generated)};
  const gaitReceipt = {path: 'game/src/painted_gaits.js', sha256: hash(gaitModule)};
  const manifest = JSON.stringify({version: 1, complete, sources, inputs, files, metadata, gaits: gaitReceipt}, null, 2) + '\n';
  await fsp.writeFile(path.join(dest, 'release-receipt.json'), manifest);
  if (complete && !args.has('--preview-manifest')) await fsp.writeFile(path.join(__dirname, 'painted_release_manifest.json'), manifest);
}

async function stage() {
  await Promise.all([
    ...['png', 'records', 'art'].map(dir => fsp.mkdir(path.join(dest, dir), {recursive: true})),
    ...['guides', 'shape-guides', 'textures'].map(dir => fsp.mkdir(path.join(work, dir), {recursive: true})),
  ]);
  if (onlyGuides) return;
  for (const name of ['body', 'plate']) {
    const destination = path.join(work, 'textures', name + '.png');
    if (!fs.existsSync(destination)) await fsp.copyFile(path.join(pilot, name + '-paint.png'), destination);
  }
}

async function readRecords() {
  if (selected.length !== 6 || outfits.length !== 5) throw Error('A release assembly requires all six profiles and five outfits');
  const overlay = args.get('--replace-stage');
  const group = args.get('--replace-slot');
  if (overlay || group) {
    if (typeof overlay !== 'string' || !/^[a-z0-9-]+$/.test(overlay) ||
        !['armor', 'hands', 'feet', 'cloak'].includes(group) || overlay === stageName) {
      throw Error('A slot replacement requires a separate stage and a wardrobe slot');
    }
  }
  const profiles = await eachPool(selected, 2, async profile => {
    const read = key => fsp.readFile(path.join(dest, 'records', key + '.json'), 'utf8').then(JSON.parse);
    const base = await read(profile);
    if (!Object.keys(base.slots).length) {
      const parts = await read(profile + '-parts');
      if (base.source.sha256 !== parts.source.sha256) throw Error('Body and part banks disagree for ' + profile);
      base.slots = parts.slots;
      base.files.push(...parts.files);
    }
    if (group) {
      const folder = path.join(work, overlay);
      const entry = JSON.parse(await fsp.readFile(path.join(folder, 'records', profile + '-parts-' + group + '.json'), 'utf8'));
      if (JSON.stringify(base.source) !== JSON.stringify(entry.source)) throw Error('Replacement profile source differs: ' + profile);
      const current = base.slots[group], updates = entry.slots[group];
      if (!current || !updates || Object.keys(current).length !== Object.keys(updates).length ||
          Object.keys(updates).some(key => !current[key])) throw Error('Replacement slot catalog differs: ' + group);
      const replacements = new Set(entry.files.map(file => file.path));
      const allowed = new Set(Object.values(current).flatMap(look => [look.doll, ...Object.values(look.states)])
        .map(asset => 'art/' + asset.file));
      if (!replacements.size || replacements.size !== entry.files.length || [...replacements].some(file => !allowed.has(file))) {
        throw Error('Replacement slot file contract differs for ' + profile + ': ' + group);
      }
      for (const [key, update] of Object.entries(updates)) {
        current[key].states = {...current[key].states, ...update.states};
        if (update.doll) current[key].doll = update.doll;
      }
      await eachPool(entry.files, 3, async file => {
        const name = path.basename(file.path), incoming = await fsp.readFile(path.join(folder, 'art', name));
        if (hash(incoming) !== file.sha256) throw Error('Replacement slot file differs: ' + name);
        await fsp.writeFile(path.join(dest, 'art', name), incoming);
      });
      base.files = [...base.files.filter(file => !replacements.has(file.path)), ...entry.files];
      await fsp.writeFile(path.join(dest, 'records', profile + '.json'), JSON.stringify(base) + '\n');
    }
    return base;
  });
  await collect(profiles);
}

async function main() {
  if (args.has('--assemble')) return readRecords();
  await stage();
  const full = !partial && !onlyGuides && !slot && !partsOnly && selected.length === 6 && outfits.length === 5;
  const [inputs, textures] = full ? await Promise.all([receiptInputs(), textureInputs()]) : [];
  const host = server();
  await new Promise(resolve => host.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true});
    const results = await eachPool(selected, parallel, profile => bakeProfile(browser, host.address().port, profile));
    if (full) await collect(results, inputs, textures);
  } finally {
    await browser?.close();
    host.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
