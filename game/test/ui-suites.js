/* One inventory for automatic selection, local execution and the CI gate. */
const MODULES = ['playability', 'query-feedback', 'battle-risk', 'battle-boundaries',
  'skill-system', 'backstab', 'npc-appearance', 'sound', 'dungeons', 'music', 'arming',
  'first-day', 'prologue', 'world-travel', 'world-buildings', 'cartography', 'joystick',
  'venues', 'worlds', 'living-world', 'offline', 'offline-restart', 'journeys', 'dev-mode','equipment','mounts','settlements','deletion','appearance-materials','painted-release'];
// Focused first-day runs omit long profession days; every full gate retains them.
const ALL_SUITES = ['canary', 'smoke', 'scenes', ...MODULES];
function normalizeSuites(suites) {
  if (!Array.isArray(suites) || !suites.length || suites.some(s => !ALL_SUITES.includes(s)))
    throw Error('Expected a nonempty array of known browser suites.');
  const requested = new Set(suites);
  if (requested.has('journeys')) requested.add('first-day');
  return ALL_SUITES.filter(s => requested.has(s));
}
function suitesFromEnvironment(value = process.env.BW_UI_SUITES) {
  return value === undefined ? ALL_SUITES.slice() : normalizeSuites(JSON.parse(value));
}
function validSelection(plan) {
  if (!plan || !['none', 'focused', 'full', 'session'].includes(plan.tier) ||
      ['ui', 'core', 'release', 'live'].some(k => typeof plan[k] !== 'boolean') || !Array.isArray(plan.suites)) return false;
  const {PROFILES,SCENES}=require('./scope-policy');
  const groups=['all','protocol','assets','build','audio','engine','actors','world','cards','effects','packaging'];
  if(!Array.isArray(plan.coreGroups)||!plan.coreGroups.length||new Set(plan.coreGroups).size!==plan.coreGroups.length||plan.coreGroups.some(g=>!groups.includes(g))||
    !Array.isArray(plan.profiles)||JSON.stringify(plan.profiles)!==JSON.stringify(PROFILES)||
    !Array.isArray(plan.scenes)||plan.scenes.some(s=>!SCENES.includes(s))||
    !Array.isArray(plan.sceneProfiles)||!plan.sceneProfiles.length||plan.sceneProfiles.some(p=>!PROFILES.includes(p)))return false;
  if(plan.suites.includes('scenes')&&!plan.scenes.length)return false;
  if(plan.tier==='full'&&(!plan.coreGroups.includes('all')||JSON.stringify(plan.sceneProfiles)!==JSON.stringify(PROFILES)||JSON.stringify(plan.scenes)!==JSON.stringify(SCENES)))return false;
  if (plan.tier === 'session') return JSON.stringify(plan.scenes) === JSON.stringify(SCENES) &&
    require('./release-session').validSessionPlan(plan, normalizeSuites);
  if (plan.sessionProfile != null) return false;
  if ((plan.release || plan.live) && (!plan.ui || !plan.core)) return false;
  if (plan.tier === 'none') return !plan.ui && !plan.release && !plan.live && plan.suites.length === 0;
  if (!plan.ui) return false;
  try {
    const normalized = normalizeSuites(plan.suites);
    if (JSON.stringify(normalized) !== JSON.stringify(plan.suites) || (!normalized.includes('smoke')&&!normalized.includes('canary'))) return false;
    return plan.tier !== 'full' || (plan.core && normalized.length === ALL_SUITES.length);
  } catch { return false; }
}
module.exports = { MODULES, ALL_SUITES, normalizeSuites, suitesFromEnvironment, validSelection };
