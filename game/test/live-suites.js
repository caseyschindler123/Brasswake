const { validSelection } = require('./ui-suites');

const LIVE_SUITES = ['smoke', 'audio', 'offline', 'battle', 'arrival'];
function liveSuites(plan) {
  if (!validSelection(plan)) throw Error('A valid verification plan is required for hosted selection.');
  if (plan.tier === 'full') return LIVE_SUITES.slice();
  if (!Array.isArray(plan.files)) return LIVE_SUITES.slice();
  const suites = new Set(plan.suites), selected = new Set(['smoke']);
  const has = names => names.some(name => suites.has(name));
  if (has(['sound', 'music'])) selected.add('audio');
  // Changed assets must also be available from the complete offline download.
  if (has(['offline', 'offline-restart']) || plan.files?.some(file => file.startsWith('game/art/')))
    selected.add('offline');
  if (has(['query-feedback', 'battle-risk', 'battle-boundaries', 'playability', 'skill-system', 'backstab']))
    selected.add('battle');
  if (has(['prologue', 'first-day', 'journeys', 'worlds', 'arming'])) selected.add('arrival');
  return LIVE_SUITES.filter(name => selected.has(name));
}
function suitesFromLiveEnvironment(value = process.env.BW_LIVE_SUITES) {
  if (value === undefined) return LIVE_SUITES.slice();
  const suites = JSON.parse(value);
  if (!Array.isArray(suites) || !suites.includes('smoke') ||
      suites.some(name => !LIVE_SUITES.includes(name)) || new Set(suites).size !== suites.length)
    throw Error('Expected known hosted suites including smoke.');
  return LIVE_SUITES.filter(name => suites.includes(name));
}
module.exports = { LIVE_SUITES, liveSuites, suitesFromLiveEnvironment };
