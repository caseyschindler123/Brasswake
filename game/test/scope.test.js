const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chooseUI}=require('./select-tests'),{validSelection}=require('./ui-suites');
const {scopePlan,registrationEquivalent,PROFILES}=require('./scope-policy');
test('fixture extraction proves unchanged callbacks and helper bodies against verified full source',()=>{
  assert.equal(registrationEquivalent(),true);
  for(const file of ['dungeon-helper.js','first-day-helper.js','first-day.js','journeys.js']){
    assert.equal(registrationEquivalent({readNow:name=>fs.readFileSync(path.join(__dirname,'browser',name),'utf8')+(name===file?'\nthrow Error("changed behavior");\n':'')}),false);
  }
  const plan=chooseUI({files:['game/test/browser/first-day.js','game/test/browser/dungeon-helper.js']});
  assert.deepEqual(plan.suites,['canary','dev-mode']);assert.equal(validSelection(plan),true);
  const unproven=scopePlan({tier:'full',ui:true,core:true,release:false,live:false,suites:require('./ui-suites').ALL_SUITES},['game/test/browser/first-day.js'],{equivalent:()=>false});
  assert.equal(unproven.tier,'full');
  for(const unknown of ['game/src/game.js','game/src/actor_rig.js','game/test/browser/unknown.js','game/test/browser/movement.js'])
    assert.equal(chooseUI({files:['game/test/browser/first-day.js',unknown]}).tier,'full');
});
test('cosmetic assets select changed captures and bounded core groups; mixed risk stays full',()=>{
  const plan=chooseUI({files:['game/art/architecture/region-2.webp']});assert.deepEqual(plan.coreGroups,['assets','build','protocol']);
  assert.deepEqual(plan.suites,['canary','scenes']);assert.deepEqual(plan.sceneProfiles,['phone-chromium','desktop-chromium']);
  assert.equal(validSelection(plan),true);
  for(const risky of ['game/src/style.css','game/src/world_progress.js','game/src/service-worker.js'])assert.equal(chooseUI({files:['game/art/architecture/region-2.webp',risky]}).tier,'full');
  const bad={...plan,coreGroups:['invented']};assert.equal(validSelection(bad),false);
  const full=chooseUI({files:['game/src/game.js']});assert.equal(validSelection({...full,profiles:PROFILES.slice(1)}),false);
  assert.equal(validSelection({...full,coreGroups:['protocol']}),false);
  assert.equal(validSelection({...full,scenes:[]}),false);
});
test('developer code is a loopback-server resource and excluded from production build inputs',()=>{
  const build=fs.readFileSync(path.join(__dirname,'../build.js'),'utf8');assert.doesNotMatch(build,/dev-mode|dev-storage|dev\.html/);
});
