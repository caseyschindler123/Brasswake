const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { assertDeploymentOrder, isSHA } = require('./deployment-baseline');
const { ALL_SUITES, MODULES, normalizeSuites, validSelection } = require('./ui-suites');
const { encodeSelection } = require('./selection-transport');
const { FILE: SESSION_FILE, CHROMIUM, loadSession, releaseSession } = require('./release-session');
const root = path.resolve(__dirname, '../..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const protocol = new Set(['game/test/select-tests.js', 'game/test/ui-suites.js',
  'game/test/verify.js', 'game/test/run-ui.js', 'game/test/release-gate.js',
  'game/test/deployment-baseline.js', 'game/test/live.js', 'game/test/live-suites.js', 'game/test/workflow.test.js', 'game/test/protocol.test.js', 'game/playwright.config.js', 'game/test/browser/ui.spec.js', 'game/test/browser/live.spec.js',
  'game/package.json', 'game/package-lock.json', SESSION_FILE, 'game/test/release-session.js', 'game/test/selection-transport.js']);
const runner = new Set(['game/test/select-tests.js', 'game/test/ui-suites.js',
  'game/test/verify.js', 'game/test/run-ui.js', 'game/test/live.js', 'game/test/live-suites.js', 'game/playwright.config.js', 'game/test/browser/ui.spec.js', 'game/test/browser/live.spec.js']);
const sourceGroups = [
  [/^game\/src\/(audio|music)\.js$|^game\/art\/(mu|fx)\//, ['music', 'sound', 'scenes']],
  // ActorRig also supplies physical walking/running speeds: it stays full.
  [/^game\/src\/npc_appearance\.js$/, ['npc-appearance', 'worlds', 'arming', 'prologue', 'scenes']],
  [/^game\/src\/(building_view|building_cache|terrain_edges|service_places|scene_living)\.js$/,
    ['living-world', 'world-buildings', 'venues', 'cartography', 'scenes']],
  [/^game\/src\/(query_feedback|sqled)\.js$/, ['query-feedback', 'playability', 'battle-risk', 'battle-boundaries', 'scenes']],
  [/^game\/src\/effects\.js$/, ['sound', 'battle-risk', 'scenes']],
  [/^game\/src\/(poker|casino)\.js$/, ['playability', 'venues', 'scenes']],
  // Presentation ecology never mutates collision, world state or gameplay RNG.
  // Physical generation (scene_b/world), movement and saves still fall back to full.
  [/^game\/src\/(landscape|scene_landscape|artlandscape)\.js$|^game\/art\/landscape\//,
    ['npc-appearance', 'living-world', 'world-buildings', 'cartography', 'scenes']],
  // Atlas rectangles/images affect presentation; physical blueprints, travel,
  // progression and the save bridge deliberately remain outside these mappings.
  [/^game\/src\/artarchitecture\.js$|^game\/art\/architecture\//,
    ['living-world', 'world-buildings', 'venues', 'dungeons', 'scenes']],
  [/^game\/src\/artcartography\.js$|^game\/art\/cartography\//,
    ['cartography', 'world-buildings', 'scenes']],
];
const sharedFixtures = new Set(['flow', 'movement', 'intro-helper', 'offline-flow', 'dungeons', 'battle-release']);
const isGame = f => /^game\/(src|art|vendor)\//.test(f) || f === 'game/build.js';
const isDoc = f => /\.md$/i.test(f);
function runtimePackages(lock) {
  return Object.fromEntries(Object.entries(lock.packages || {}).filter(([name, item]) => name && !item.dev)
    .sort(([a], [b]) => a.localeCompare(b)).map(([name, item]) => [name, {
      version: item.version, integrity: item.integrity, resolved: item.resolved, dependencies: item.dependencies,
    }]));
}
function packagingScripts(manifest) {
  return Object.fromEntries(['build','prebuild','postbuild','preinstall','install','postinstall','prepare'].map(k=>[k,manifest.scripts?.[k]||null]));
}
function collectChanges(base, coverageBase, runGit = git) {
  const files=[];
  for(const at of new Set([base,coverageBase].filter(Boolean)))
    files.push(...runGit('diff','--no-renames','--name-only','-z',at,'--').split('\0').filter(Boolean));
  files.push(...runGit('ls-files','--others','--exclude-standard','-z').split('\0').filter(Boolean));
  return [...new Set(files)];
}
function chooseLegacyUI({ files = [], runtimeChanged = false, packagingChanged = false, baselineAvailable = true,
  releaseChanged, alreadyPublished = false, scope = 'auto', event = 'local', publish = false, ref = 'refs/heads/main' } = {}) {
  if (!['auto', 'smoke', 'full'].includes(scope)) throw Error('Unknown verification scope: ' + scope);
  if (publish && (event !== 'workflow_dispatch' || scope !== 'full' || ref !== 'refs/heads/main'))
    throw Error('Manual publication requires explicit full verification on main.');
  if (scope === 'smoke' && event !== 'workflow_dispatch') throw Error('Smoke-only scope is restricted to non-publishing manual validation.');
  let release = releaseChanged ?? (files.some(isGame) || runtimeChanged || packagingChanged || !baselineAvailable);
  if (event === 'schedule' || event === 'workflow_dispatch') release = publish;
  const live = release || alreadyPublished;
  const core = live || files.some(f => !isDoc(f) && !protocol.has(f) && !/^\.github\//.test(f));
  const full = reason => ({ tier: 'full', ui: true, core: true, release, live, suites: ALL_SUITES.slice(), reason });
  if (event === 'schedule' || scope === 'full') return full('Full verification requested; includes long playthroughs.');
  if (scope === 'smoke') return { tier: 'focused', ui: true, core: false, release: false, live: false, suites: ['smoke'], reason: 'Non-publishing manual smoke validation.' };
  if (!baselineAvailable) return full('No reliable comparison; conservatively verify the complete game.');
  if (runtimeChanged || packagingChanged || files.includes('game/build.js')) return full('Runtime dependency or release packaging changed.');
  const selected = new Set();
  for (const file of files) {
    if (runner.has(file)) {
      selected.add('smoke');
      if (file === 'game/test/browser/ui.spec.js' || file === 'game/playwright.config.js') selected.add('scenes');
      continue;
    }
    if (isGame(file)) {
      const group = sourceGroups.find(([pattern]) => pattern.test(file));
      if (!group) return full('Shared core or unclassified game change: ' + file);
      for (const suite of group[1]) selected.add(suite);
    } else if (file.startsWith('game/test/browser/')) {
      const name = path.posix.basename(file, '.js');
      if (sharedFixtures.has(name) || !MODULES.includes(name)) return full('Shared or unclassified browser fixture changed: ' + file);
      selected.add(name);
      // Editing the file that owns the long cases must exercise those cases too.
      if (name === 'first-day') selected.add('journeys');
      if (name === 'battle-risk') selected.add('battle-boundaries');
    }
  }
  if (selected.size) {
    selected.add('smoke');
    return { tier: 'focused', ui: true, core, release, live, suites: normalizeSuites([...selected]), reason: 'Smoke plus affected suites; unknown/shared changes always select full coverage.' };
  }
  return { tier: 'none', ui: false, core, release: false, live: false, suites: [], reason: 'No game/UI impact; validate affected automation without publication.' };
}
function chooseUI(options={}) {
 const {scopePlan}=require('./scope-policy');
 const files=options.files||[];
 const {tooling}=require('./scope-policy');
 const legacy=chooseLegacyUI({...options,files:files.filter(f=>!tooling(f))});
 if(options.event==='schedule'||options.scope==='full'||options.baselineAvailable===false||options.runtimeChanged||options.packagingChanged)return scopePlan(legacy,files,{equivalent:()=>false});
 return scopePlan(legacy,files);
}
function selection({ forceFull = false, env = process.env, runGit = git, assertOrder = assertDeploymentOrder, now = Date.now() } = {}) {
  const event = env.GITHUB_EVENT_NAME || 'local';
  const scope = forceFull ? 'full' : env.BW_VERIFY_SCOPE || 'auto';
  const publishValue = env.BW_PUBLISH || 'false';
  if (!['true', 'false'].includes(publishValue)) throw Error('Invalid publication request.');
  const options = { event, scope, publish: publishValue === 'true', ref: env.GITHUB_REF || 'refs/heads/main' };
  const publishingEvent = event === 'push' || options.publish;
  let coverageBase;
  if ((env.CI && ['push','pull_request'].includes(event)) || options.publish) {
    coverageBase = env.BW_RELEASE_BASE;
    if (env.BW_RELEASE_VERIFIED !== 'true' || !isSHA(coverageBase))
      throw Error('A verified published baseline is required before release coverage can be selected.');
  }
  let base = env.BW_DIFF_BASE, baselineAvailable = true;
  try {
    if (!base && env.CI) throw Error('Missing comparison SHA');
    base ||= runGit('rev-parse', '--verify', 'origin/main').trim();
    if (!isSHA(base) || /^0+$/.test(base)) throw Error('Missing comparison SHA');
    runGit('cat-file', '-e', base + '^{commit}');
  } catch { base = undefined; baselineAvailable = false; }
  let files = [], currentFiles = [], runtimeChanged = false, packagingChanged = false, releaseChanged;
  try {
    if (!base && !coverageBase) throw Error('No comparison');
    files = collectChanges(base, undefined, runGit);
    currentFiles = files;
    if(coverageBase){
      const {FIXTURE_BASE}=require('./scope-policy');
      const publishedDelta=collectChanges(coverageBase,undefined,runGit);
      const historical=publishedDelta.filter(isGame);
      currentFiles=[...new Set([...currentFiles,...publishedDelta])];
      const fixtureDelta=collectChanges(FIXTURE_BASE,undefined,runGit).filter(f=>!isGame(f));
      files=[...new Set([...files,...historical,...fixtureDelta])];
      releaseChanged=historical.length>0;
    }
    const readAt = (at,file) => JSON.parse(runGit('show', at + ':' + file));
    const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    for(const at of new Set([base,coverageBase].filter(Boolean))) {
      const before=readAt(at,'game/package.json'),current=read('game/package.json');
      const runtimeDelta = JSON.stringify(before.dependencies||{}) !== JSON.stringify(current.dependencies||{}) ||
        JSON.stringify(runtimePackages(readAt(at,'game/package-lock.json'))) !== JSON.stringify(runtimePackages(read('game/package-lock.json')));
      const packagingDelta = JSON.stringify(packagingScripts(before)) !== JSON.stringify(packagingScripts(current));
      runtimeChanged ||= runtimeDelta; packagingChanged ||= packagingDelta;
      if (at === coverageBase) releaseChanged ||= runtimeDelta || packagingDelta;
    }
  } catch { baselineAvailable = false; releaseChanged = undefined; }
  const candidate = runGit('rev-parse','HEAD').trim();
  if (coverageBase && publishingEvent && releaseChanged !== false) assertOrder(coverageBase,candidate);
  const alreadyPublished = publishingEvent && coverageBase === candidate &&
    (files.some(isGame) || runtimeChanged || packagingChanged);
  const normal = { ...options, files, runtimeChanged, packagingChanged, baselineAvailable, releaseChanged, alreadyPublished };
  const selected = chooseUI(normal);
  const session = selected.release ? releaseSession({ ...options, ci:env.CI, coverageBase, candidate,
    baselineAvailable, runtimeChanged, packagingChanged, files:currentFiles, now }) : undefined;
  if (session === null)
    return { ...chooseUI({...normal,scope:'full'}), reason:'Session release profile did not match verified scope; complete verification selected.', base, coverageBase, files };
  if (session) {
    const { SCENES } = require('./scope-policy');
    const profile=loadSession();
    return { ...selected, tier:'session', core:true, ui:true, coreGroups:profile.coreGroups,
      suites:normalizeSuites(profile.chromiumSuites), scenes:SCENES.slice(), sceneProfiles:CHROMIUM.slice(),
      reason:profile.coreGroups.includes('all')
        ? 'Approved painted-character session: full core, focused Chromium and critical WebKit, with full hosted verification.'
        : 'Approved facing hotfix session: affected core and browser suites, with full hosted verification.',
      sessionProfile:session, base, coverageBase, files:[...new Set([...files,...currentFiles])] };
  }
  return { ...selected, base, coverageBase, files };
}
function saveSelection(selected) {
  if (!validSelection(selected)) throw Error('Invalid verification selection.');
  fs.mkdirSync(path.join(root, 'work'), { recursive: true });
  fs.writeFileSync(path.join(root, 'work/test-selection.json'), JSON.stringify(selected, null, 2) + '\n');
  if (process.env.GITHUB_OUTPUT) {
    const outputs = { ui: selected.ui, core: selected.core, release: selected.release, live: selected.live, coverage_base: selected.coverageBase || '',
      suites: JSON.stringify(selected.suites), scenes: JSON.stringify(selected.scenes), scene_profiles: JSON.stringify(selected.sceneProfiles),
      ui_session_profile: selected.sessionProfile?.id || '', plan: encodeSelection(selected) };
    fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(outputs).map(([k,v]) => k + '=' + v).join('\n') + '\n');
  }
}
if (require.main === module) {
  const selected = selection({ forceFull: process.argv.includes('--full') });
  if (!process.argv.includes('--dry-run')) saveSelection(selected);
  console.log(JSON.stringify(selected, null, 2));
}
module.exports = { chooseUI, selection, saveSelection, runtimePackages, packagingScripts, collectChanges };
