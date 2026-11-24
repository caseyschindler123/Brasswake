/* Stable CI validation check: missing selection and skipped required UI fail closed. */
function releaseGate({core,ui,browser}) {
  return core==='success'&&(ui==='true' ? browser==='success' : ui==='false'&&browser==='skipped');
}
if(require.main===module) {
  const state={core:process.env.BW_CORE_RESULT,ui:process.env.BW_UI_SELECTED,browser:process.env.BW_BROWSER_RESULT};
  if(!releaseGate(state))throw Error('Required release checks did not all pass: '+JSON.stringify(state));
  console.log('Core verification and every selected browser profile passed.');
}
module.exports={releaseGate};
