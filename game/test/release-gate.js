const { validSelection } = require('./ui-suites');
const { decodeSelection } = require('./selection-transport');
/* Missing plans and skipped/failed selected jobs fail closed. */
function releaseGate({ core, plan, browser, expectedCommit }) {
  return core === 'success' && validSelection(plan) &&
    (plan.tier !== 'session' || !expectedCommit || plan.sessionProfile.candidate === expectedCommit) &&
    (plan.ui ? browser === 'success' : browser === 'skipped');
}
if (require.main === module) {
  let plan;
  try { plan = decodeSelection(process.env.BW_SELECTION); } catch { /* Rejected below. */ }
  const state = { core: process.env.BW_CORE_RESULT, plan, browser: process.env.BW_BROWSER_RESULT, expectedCommit: process.env.GITHUB_SHA };
  if (!releaseGate(state)) throw Error('Required verification did not pass: ' + JSON.stringify(state));
  console.log('All selected checks passed; publication is authorized only by the separate release flag.');
}
module.exports = { releaseGate };
