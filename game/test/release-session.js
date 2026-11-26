const fs = require('node:fs');
const path = require('node:path');

const FILE = 'game/test/painted-release-session.json';
const ID = 'painted-characters-2026-11-26';
const HOTFIX = 'painted-facing-hotfix-2026-11-26';
const HOTFIX_BASE = '0090c8926a0b1baa58bb53f6908c9c40e42d564f';
const HOTFIX_START = '2026-11-26T16:52:00.000Z', HOTFIX_EXPIRY = '2026-11-26T17:30:00.000Z';
const hotfixCode = ['game/src/painted_character_view.js','game/src/scene_b.js'];
const hotfixAllowed = new Set([FILE,...hotfixCode,'game/test/painted-character.test.js','game/test/browser/joystick.js',
  'game/test/release-session.js','game/test/select-tests.js','game/test/protocol.test.js','arttools/PAINTED_CHARACTERS.md']);
const hotfixSuites = ['canary','scenes','arming','joystick','appearance-materials'];
const hotfixWebKit = [
  'release canary: boot, real SQL and device persistence',
  'joystick · painted bodies and fitted gear face the direction of travel',
  'joystick · slower gaits keep travel, contact sounds and distance events synchronized',
  'paper doll in hero and appearance reflects equip, unequip, legacy gear and reload',
];
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const CHROMIUM = ['phone-chromium', 'desktop-chromium'];
const exact = new Set([
  FILE, 'arttools/painted_release_body_shape.test.cjs', 'arttools/painted_release_wardrobe.test.cjs', '.github/workflows/pages.yml', 'arttools/check_packed_art.js', 'arttools/packed_manifest.json',
  'game/build.js', 'game/playwright.config.js',
  'game/src/actor_rig.js', 'game/src/artpainted.js', 'game/src/artpaintedgear.js',
  'game/src/artpaintedheads.js', 'game/src/artpaintedrelease.js', 'game/src/character_profiles.js',
  'game/src/game.js', 'game/src/head_portraits.js', 'game/src/npc_appearance.js',
  'game/src/painted_character_view.js', 'game/src/painted_gaits.js', 'game/src/painted_gear.js',
  'game/src/scene_b.js', 'game/src/style.css',
  'game/test/actor-rig.test.js', 'game/test/painted-character.test.js',
  'game/test/protocol.test.js', 'game/test/release-gate.js', 'game/test/release-session.js', 'game/test/save-compatibility.test.js',
  'game/test/scope.test.js', 'game/test/select-tests.js', 'game/test/ui-suites.js',
  'game/test/live.js', 'game/test/live-suites.js', 'game/test/run-ui.js', 'game/test/selection-transport.js', 'game/test/verify.js',
  'game/test/browser/appearance-materials.js', 'game/test/browser/arming.js',
  'game/test/browser/intro-helper.js', 'game/test/browser/joystick.js', 'game/test/browser/mounts.js',
  'game/test/browser/npc-appearance.js', 'game/test/browser/painted-release.js',
  'game/test/browser/prologue.js', 'game/test/browser/worlds.js',
]);
const bodyPath = /^game\/art\/(?:painted|painted-release)\/(?:body|doll)-(?:[1-9]|[12]\d|30)(?:-[a-z]+)?\.webp$/;
const slotPath = /^game\/art\/painted-release\/(?:body|doll)-[0-5]-(?:hands|feet|cloak|armor)-[a-z0-9_-]+\.webp$/;
function allowed(file) {
  return exact.has(file) || /\.md$/i.test(file) || bodyPath.test(file) || slotPath.test(file) ||
    /^game\/art\/painted\/(?:LICENSE\.txt|heads-(?:man|woman)\.webp)$/.test(file) ||
    file === 'game/art/paintedgear/gear.webp' ||
    /^arttools\/(?:test_)?painted_[a-z0-9_]+\.(?:cjs|js|py|json|html)$/.test(file);
}

function loadSession() {
  try {
    const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../..', FILE), 'utf8'));
    const { id, publishedBase, startsAt, expiresAt, chromiumSuites, webkitTests } = data;
    const duration = Date.parse(expiresAt) - Date.parse(startsAt);
    if (![ID,HOTFIX].includes(id) || !/^[a-f0-9]{40}$/.test(publishedBase) || !(duration > 0 && duration <= 3 * 60 * 60 * 1000) ||
        !Array.isArray(chromiumSuites) || !chromiumSuites.length || new Set(chromiumSuites).size !== chromiumSuites.length ||
        !Array.isArray(webkitTests) || !webkitTests.length || webkitTests.some(title => typeof title !== 'string' || !title) ||
        new Set(webkitTests).size !== webkitTests.length) return null;
    const { normalizeSuites } = require('./ui-suites');
    const suites = normalizeSuites(chromiumSuites);
    if (id === HOTFIX) {
      if (publishedBase !== HOTFIX_BASE || startsAt !== HOTFIX_START || expiresAt !== HOTFIX_EXPIRY ||
          !same(suites,hotfixSuites) || !same(webkitTests,hotfixWebKit)) return null;
      return { ...data, chromiumSuites:suites, coreGroups:['assets','actors','build','protocol'] };
    }
    if (!['canary', 'scenes', 'arming', 'offline', 'battle-risk', 'worlds', 'joystick', 'appearance-materials']
      .every(name => suites.includes(name)) || suites.includes('journeys')) return null;
    return { ...data, chromiumSuites:suites, coreGroups:['all'] };
  } catch {
    return null;
  }
}

function matched(session, coverageBase, files, now) {
  if (!session || session.publishedBase !== coverageBase || !(now >= Date.parse(session.startsAt) &&
    now < Date.parse(session.expiresAt)) || !Array.isArray(files) || !files.includes(FILE)) return false;
  if (session.id === HOTFIX) return hotfixCode.every(file=>files.includes(file)) &&
    files.every(file=>typeof file==='string'&&(hotfixAllowed.has(file)||/^game\/docs\/.+\.md$/i.test(file)));
  return files.includes('game/build.js') && files.includes('game/src/painted_gear.js') &&
    files.includes('game/art/paintedgear/gear.webp') &&
    files.some(file => bodyPath.test(file) && file.startsWith('game/art/painted-release/body-')) &&
    files.every(file => typeof file === 'string' && allowed(file));
}

function releaseSession({ event, scope, ref, publish, ci, coverageBase, baselineAvailable,
  runtimeChanged, packagingChanged, candidate, files, now = Date.now() }) {
  if (event !== 'push' || scope !== 'auto' || ref !== 'refs/heads/main' || publish || !ci ||
      !Array.isArray(files) || !files.includes(FILE) || candidate === coverageBase) return undefined;
  const session = loadSession();
  if (!baselineAvailable || runtimeChanged || packagingChanged || !/^[a-f0-9]{40}$/.test(candidate) ||
      !matched(session,coverageBase,files,now)) return null;
  return { id:session.id, candidate, selectedAt:new Date(now).toISOString(), files };
}

function validSessionPlan(plan, normalizeSuites) {
  const session = loadSession();
  const record = plan.sessionProfile;
  if (!record || record.id !== session?.id || !/^[a-f0-9]{40}$/.test(record.candidate) || record.candidate===plan.coverageBase ||
      !matched(session,plan.coverageBase,record.files,Date.parse(record.selectedAt)) ||
      !plan.release || !plan.live || !plan.ui || !plan.core || !same(plan.coreGroups,session.coreGroups) ||
      JSON.stringify(plan.sceneProfiles)!==JSON.stringify(CHROMIUM)) return false;
  if (!Array.isArray(plan.files) || !record.files.every(file => plan.files.includes(file))) return false;
  try { return JSON.stringify(plan.suites)===JSON.stringify(normalizeSuites(session.chromiumSuites)); }
  catch { return false; }
}

function webkitGrep(value = process.env.BW_UI_SESSION_PROFILE) {
  if (!value) return undefined;
  const session = loadSession();
  if (!session || session.id !== value) throw Error('Unknown or unavailable browser session profile.');
  const escaped = session.webkitTests.map(title => title.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'));
  return new RegExp('(?:^|\\s)(?:' + escaped.join('|') + ')$');
}

module.exports = { FILE, CHROMIUM, loadSession, releaseSession, validSessionPlan, webkitGrep };
