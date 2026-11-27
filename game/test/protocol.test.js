const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const { deflateSync } = require('node:zlib');
const { chooseUI, collectChanges, packagingScripts, selection } = require('./select-tests');
const { publishedSource, assertDeploymentOrder, publicationDecision } = require('./deployment-baseline');
const { ALL_SUITES, MODULES, normalizeSuites, suitesFromEnvironment, validSelection } = require('./ui-suites');
const { releaseGate } = require('./release-gate');
const { registrationEquivalent } = require('./scope-policy');
const { LIVE_SUITES, liveSuites, suitesFromLiveEnvironment } = require('./live-suites');
const { FILE: SESSION_FILE, loadSession, webkitGrep } = require('./release-session');
const { encodeSelection, decodeSelection, PREFIX, MAX_ENCODED_BYTES, MAX_DECODED_BYTES } = require('./selection-transport');

for (const file of ['AGENTS.md', 'game/docs/05_CODING_WORKFLOW.md']) {
  test('tooling/docs do not publish or run game UI: ' + file, () => {
    const plan=chooseUI({files:[file]});assert.equal(plan.ui,false);assert.equal(plan.release,false);assert.equal(plan.core,false);
  });
}
for (const file of ['game/src/game.js','game/src/style.css','game/src/engine.js','game/src/character_worlds.js',
  'game/src/movement.js','game/src/actor_rig.js','game/src/offline.js','game/src/service-worker.js','game/art/i/bag.webp','game/vendor/new.js']) {
  test('shared or unknown game changes require full release checks: ' + file, () => {
    const plan=chooseUI({files:[file]});assert.equal(plan.tier,'full');assert.equal(plan.release,true);assert.deepEqual(plan.suites,ALL_SUITES);
  });
}
test('music-only changes select related coverage and smoke without full guided days',()=>{
  const plan=chooseUI({files:['game/src/audio.js','game/art/mu/m_tallyport.mp3']});
  assert.deepEqual(plan.suites,['smoke','scenes','sound','music']);assert.equal(plan.release,true);assert.equal(plan.core,true);
  assert.equal(plan.suites.includes('first-day'),false);assert.equal(validSelection(plan),true);
});
test('prepared effect assets use complete audio coverage; shared and packaging changes still require full checks',()=>{
  const effects=Object.values(JSON.parse(fs.readFileSync(path.join(__dirname,'../../arttools/music/effects.json'),'utf8')).effects);
  assert.equal(effects.length,72);
  for(const {path:file} of effects){
    const plan=chooseUI({files:[file]});
    assert.deepEqual(plan.suites,['smoke','scenes','sound','music']);
    assert.equal(plan.tier,'focused');assert.equal(plan.core,true);assert.equal(plan.release,true);
    for(const shared of ['game/src/game.js','game/src/offline.js','game/build.js','game/test/browser/movement.js'])
      assert.equal(chooseUI({files:[file,shared]}).tier,'full');
    assert.equal(chooseUI({files:[file],packagingChanged:true}).tier,'full');
    assert.equal(chooseUI({files:[file],baselineAvailable:false}).tier,'full');
  }
});
test('mixed changes retain the union; one unknown source promotes the whole release',()=>{
  const files=['game/src/npc_appearance.js','game/src/audio.js'];const plan=chooseUI({files});
  for(const suite of ['smoke','scenes','npc-appearance','worlds','arming','sound','music'])assert.ok(plan.suites.includes(suite));
  assert.equal(chooseUI({files:[...files,'game/src/new_system.js']}).tier,'full');
});

test('reviewed landscape presentation selects its consumers while physical/runtime changes retain journeys',()=>{
  for(const file of ['game/src/landscape.js','game/src/scene_landscape.js','game/src/artlandscape.js','game/art/landscape/region-1.webp']){
    const plan=chooseUI({files:[file]});
    assert.equal(plan.tier,'focused');assert.equal(plan.release,true);
    if(/artlandscape|\/art\//.test(file))assert.deepEqual(plan.suites,['canary','scenes']);
    else for(const suite of ['smoke','scenes','npc-appearance','living-world','world-buildings','cartography'])assert.ok(plan.suites.includes(suite));
    assert.equal(plan.suites.includes('journeys'),false);
    for(const risky of ['game/src/scene_b.js','game/src/buildings.js','game/src/movement.js','game/src/world_progress.js',
      'game/src/offline.js','game/src/style.css','game/src/engine.js','game/build.js','game/src/new_system.js']){
      const full=chooseUI({files:[file,risky]});assert.equal(full.tier,'full');assert.ok(full.suites.includes('journeys'));
    }
  }
});

test('journey scope retains targeted first-day checks and edits to its owning fixture retain long cases',()=>{
  assert.deepEqual(normalizeSuites(['smoke','journeys']),['smoke','first-day','journeys']);
  const fixture=chooseUI({files:['game/test/browser/first-day.js']});
  assert.deepEqual(fixture.suites,registrationEquivalent()?['canary','dev-mode']:['smoke','first-day','journeys']);assert.equal(fixture.release,false);
  const incomplete=chooseUI({files:['game/src/game.js']});
  incomplete.suites=incomplete.suites.filter(name=>name!=='journeys');
  assert.equal(validSelection(incomplete),false,'full cannot omit long cases');
});

test('reviewed atlas changes select their render consumers, with physical and save code still full',()=>{
  for(const file of ['game/src/artarchitecture.js','game/art/architecture/region-1.webp']){
    const plan=chooseUI({files:[file]});assert.equal(plan.tier,'focused');
    assert.deepEqual(plan.suites,['canary','scenes']);assert.deepEqual(plan.scenes,['tallyport','interior','dungeon']);
    assert.equal(plan.suites.includes('journeys'),false);
  }
  for(const file of ['game/src/artcartography.js','game/art/cartography/props.webp'])
    assert.deepEqual(chooseUI({files:[file]}).suites,['canary','scenes']);
  for(const file of ['game/src/buildings.js','game/src/scene_dungeon.js','game/src/dungeon_progress.js',
    'game/src/cartography.js','game/src/cartography_screen.js','game/src/scene_cartography.js'])
    assert.equal(chooseUI({files:[file,'game/src/artarchitecture.js']}).tier,'full');
});

test('hosted selection always retains smoke, affected behavior and all risky/full flows',()=>{
  const plan=files=>({...chooseUI({files}),files});
  assert.deepEqual(liveSuites(plan(['game/src/scene_landscape.js'])),['smoke']);
  assert.deepEqual(liveSuites(plan(['game/art/landscape/region-1.webp'])),['smoke','offline']);
  assert.deepEqual(liveSuites(plan(['game/src/audio.js'])),['smoke','audio']);
  assert.deepEqual(liveSuites(plan(['game/art/fx/door.wav'])),['smoke','audio','offline']);
  assert.deepEqual(liveSuites(plan(['game/src/query_feedback.js'])),['smoke','battle']);
  assert.deepEqual(liveSuites(plan(['game/src/npc_appearance.js'])),['smoke','arrival']);
  for(const file of ['game/src/game.js','game/src/offline.js','game/build.js','game/src/movement.js','game/src/actor_rig.js','game/src/unknown.js'])
    assert.deepEqual(liveSuites(plan([file])),LIVE_SUITES);
  assert.deepEqual(liveSuites(chooseUI({event:'schedule'})),LIVE_SUITES);
  assert.deepEqual(liveSuites(chooseUI({files:['game/src/audio.js']})),LIVE_SUITES,'missing changed-file evidence cannot omit offline checks');
  assert.deepEqual(suitesFromLiveEnvironment(undefined),LIVE_SUITES);
  for(const value of ['', '[]', 'null','{}','["smoke","unknown"]','["audio"]','["smoke","smoke"]'])
    assert.throws(()=>suitesFromLiveEnvironment(value));
  assert.throws(()=>liveSuites({tier:'full',suites:['smoke']}),/valid verification plan/);
});
test('suite repairs keep their tests; shared fixture repairs require full coverage',()=>{
  for(const name of MODULES){
    const plan=chooseUI({files:['game/test/browser/'+name+'.js']});
    if(['first-day','dungeons','journeys'].includes(name)&&registrationEquivalent())assert.deepEqual(plan.suites,['canary','dev-mode']);
    else if(name==='dungeons'){assert.equal(plan.tier,'full');assert.deepEqual(plan.suites,ALL_SUITES);}
    else if(['first-day','journeys'].includes(name))assert.deepEqual(plan.suites,['smoke','first-day','journeys']);
    else assert.ok(plan.suites.includes(name));
    assert.ok(plan.suites.includes('smoke')||plan.suites.includes('canary'));assert.equal(plan.release,false);
  }
  for(const file of ['game/test/live-suites.js','game/test/live.js','game/test/browser/live.spec.js']){
    const plan=chooseUI({files:[file]});assert.ok(plan.suites.includes('smoke')||plan.suites.includes('canary'));assert.equal(plan.release,false);
  }
  for(const name of ['movement','flow','intro-helper','offline-flow','unregistered'])
    assert.equal(chooseUI({files:['game/test/browser/'+name+'.js']}).tier,'full');
  assert.ok(chooseUI({files:['game/test/browser/battle-risk.js']}).suites.includes('battle-boundaries'));
});
test('runner wiring executes smoke/scenes without publishing unchanged assets',()=>{
  const plan=chooseUI({files:['game/test/select-tests.js','game/test/browser/ui.spec.js']});
  assert.deepEqual(plan.suites,['canary','dev-mode']);assert.equal(plan.core,false);assert.equal(plan.release,false);
});
test('pure test changes still run their core assertions',()=>{
  const plan=chooseUI({files:['game/test/progression.test.js']});assert.equal(plan.core,true);assert.equal(plan.ui,false);assert.equal(plan.release,false);
});
test('dependency and packaging changes require full verification',()=>{
  for(const input of [{files:['game/package.json'],runtimeChanged:true},{files:['game/build.js']},
    {files:['game/package.json'],packagingChanged:true}]){
    const plan=chooseUI(input);assert.equal(plan.tier,'full');assert.equal(plan.release,true);
  }
});
test('failed game rollout remains in coverage when the next push only fixes a test',()=>{
  const calls=[];
  const files=collectChanges('failed-push','published-good',(...args)=>{
    calls.push(args);
    if(args[0]==='ls-files')return '';
    return args.includes('published-good')?'game/src/character_worlds.js\0game/test/browser/worlds.js\0':'game/test/browser/worlds.js\0';
  });
  const plan=chooseUI({files});assert.equal(plan.tier,'full');assert.equal(plan.release,true);
  assert.equal(calls.filter(a=>a[0]==='diff').length,2);
});
test('actual Git renames and Unicode paths cannot hide a game change',()=>{
  const work=path.resolve(__dirname,'../../work');fs.mkdirSync(work,{recursive:true});
  const dir=fs.mkdtempSync(path.join(work,'protocol-git-'));
  const git=(...args)=>require('node:child_process').execFileSync('git',args,{cwd:dir,encoding:'utf8'});
  git('init','--quiet');fs.mkdirSync(path.join(dir,'game/src'),{recursive:true});fs.mkdirSync(path.join(dir,'game/art'),{recursive:true});
  fs.writeFileSync(path.join(dir,'game/src/audio.js'),'old');fs.writeFileSync(path.join(dir,'game/art/日本.webp'),'old');
  git('add','.');const base=git('write-tree').trim();
  fs.mkdirSync(path.join(dir,'moved'));fs.renameSync(path.join(dir,'game/src/audio.js'),path.join(dir,'moved/audio.js'));
  fs.writeFileSync(path.join(dir,'game/art/日本.webp'),'new');git('add','-A');
  const files=collectChanges(base,undefined,git);
  assert.ok(files.includes('game/src/audio.js'));assert.ok(files.includes('game/art/日本.webp'));
  assert.equal(chooseUI({files}).tier,'full');assert.equal(chooseUI({files}).release,true);
});
test('build lifecycle changes are packaging; test command metadata is not',()=>{
  const original={scripts:{build:'node build.js','test:ui':'old'}};
  assert.deepEqual(packagingScripts(original),packagingScripts({scripts:{...original.scripts,'test:ui':'new'}}));
  for(const key of ['build','prebuild','postbuild','postinstall'])
    assert.notDeepEqual(packagingScripts(original),packagingScripts({scripts:{...original.scripts,[key]:'changed'}}));
});
test('published scope requires verified content, and stale/divergent publication is refused',async()=>{
  const live='a'.repeat(40),candidate='b'.repeat(40);let verified=false;
  const receipt=await publishedSource({fetchImpl:async()=>new Response(JSON.stringify({commit:live})),
    verify:async options=>{assert.equal(options.expectedCommit,live);verified=true;return{commit:live};}});
  assert.equal(receipt.commit,live);assert.equal(verified,true);
  await assert.rejects(publishedSource({fetchImpl:async()=>new Response('',{status:503})}),/HTTP 503/);
  await assert.rejects(publishedSource({fetchImpl:async()=>new Response('{"commit":"invalid"}')}),/Invalid/);
  assert.doesNotThrow(()=>assertDeploymentOrder(live,candidate,(a,b)=>a===live&&b===candidate));
  assert.throws(()=>assertDeploymentOrder(candidate,live,()=>false),/refusing rollback/);
  assert.throws(()=>assertDeploymentOrder('invalid',candidate,()=>true),/verified/);
  assert.equal(publicationDecision(live,candidate,live,()=>true),true);
  assert.equal(publicationDecision(candidate,candidate,live,()=>true),false,'already public: verify without redeploy');
  assert.throws(()=>publicationDecision(candidate,'c'.repeat(40),live,()=>true),/rerun all checks/,'ancestry alone cannot reuse stale focused checks');
  assert.throws(()=>publicationDecision(live,candidate,undefined,()=>true),/baseline is required/);
});
test('coverage unions failed pushes; publication uses only actual live differences',()=>{
  const previous='a'.repeat(40),live='b'.repeat(40),candidate='c'.repeat(40);
  const currentPackage=fs.readFileSync(path.join(__dirname,'../package.json'),'utf8');
  const currentLock=fs.readFileSync(path.join(__dirname,'../package-lock.json'),'utf8');
  function plan({pushFiles,liveFiles,event='push',published=live}){
    return selection({env:{CI:'true',GITHUB_EVENT_NAME:event,BW_DIFF_BASE:previous,BW_RELEASE_BASE:published,BW_RELEASE_VERIFIED:'true'},
      assertOrder:(a,b)=>{assert.notEqual(event,'pull_request','PRs do not attempt rollback checks');assert.equal(a,published);assert.equal(b,candidate);},
      runGit:(...args)=>{
        if(args[0]==='rev-parse')return candidate;
        if(args[0]==='diff')return (args.includes(published)?liveFiles:pushFiles).join('\0')+'\0';
        if(args[0]==='show')return args[1].endsWith('package-lock.json')?currentLock:currentPackage;
        return '';
      }});
  }
  const repaired=plan({pushFiles:['game/test/browser/worlds.js'],liveFiles:['game/src/character_worlds.js','game/test/browser/worlds.js']});
  assert.equal(repaired.tier,'full');assert.equal(repaired.release,true);assert.equal(repaired.coverageBase,live);
  const reverted=plan({pushFiles:['game/src/game.js'],liveFiles:[]});
  assert.equal(reverted.tier,'full');assert.equal(reverted.release,false);assert.equal(reverted.live,false);
  const rerun=plan({pushFiles:['game/src/audio.js'],liveFiles:[],published:candidate});
  assert.equal(rerun.release,false);assert.equal(rerun.live,true);
  assert.equal(plan({pushFiles:['game/src/audio.js'],liveFiles:['game/src/game.js'],event:'pull_request'}).tier,'full');
});
test('CI cannot select a publishing baseline without verified live identity',()=>{
  const result=spawnSync(process.execPath,[path.join(__dirname,'select-tests.js'),'--dry-run'],{encoding:'utf8',
    env:{...process.env,CI:'true',GITHUB_EVENT_NAME:'push',BW_RELEASE_VERIFIED:'',BW_RELEASE_BASE:'',BW_VERIFY_SCOPE:'auto',BW_PUBLISH:'false'}});
  assert.notEqual(result.status,0);assert.match(result.stderr,/verified published baseline/);
});
test('missing comparisons conservatively require full coverage',()=>{
  const plan=chooseUI({baselineAvailable:false});assert.equal(plan.tier,'full');assert.equal(plan.release,true);
});
test('scheduled and manual full validation do not publish by default',()=>{
  for(const event of ['schedule','workflow_dispatch']){
    const plan=chooseUI({event,scope:'full',baselineAvailable:false});assert.equal(plan.tier,'full');assert.equal(plan.release,false);
  }
});
test('manual smoke cannot publish or downscope a release',()=>{
  const input={event:'workflow_dispatch',scope:'smoke',baselineAvailable:false};
  assert.deepEqual(chooseUI(input).suites,['smoke']);assert.equal(chooseUI(input).release,false);
  assert.throws(()=>chooseUI({...input,publish:true}),/full verification/);
  assert.throws(()=>chooseUI({event:'push',scope:'smoke'}),/non-publishing/);
  assert.throws(()=>chooseUI({event:'workflow_dispatch',scope:'full',publish:true,ref:'refs/heads/topic'}),/main/);
  assert.equal(chooseUI({event:'workflow_dispatch',scope:'full',publish:true}).release,true);
  assert.throws(()=>chooseUI({scope:'typo'}),/Unknown/);
});
test('unknown, empty and malformed requests cannot hide required UI',()=>{
  for(const value of ['', '[]', '["unknown"]','null','{}'])assert.throws(()=>suitesFromEnvironment(value));
  assert.deepEqual(suitesFromEnvironment(undefined),ALL_SUITES);assert.throws(()=>normalizeSuites([]));
  for(const plan of [null,{}, {tier:'none',ui:false,core:false,release:true,suites:[]},
    {tier:'focused',ui:true,core:true,release:true,suites:['music']},
    {tier:'full',ui:true,core:true,release:true,suites:['smoke']},
    {tier:'focused',ui:true,core:true,release:true,suites:['smoke','smoke']}])assert.equal(validSelection(plan),false);
});
test('CI aggregate rejects failed or skipped required results',()=>{
  const plans=[chooseUI({files:['AGENTS.md']}),chooseUI({files:['game/src/audio.js']}),
    chooseUI({files:['game/src/game.js']}),chooseUI({event:'schedule',scope:'full'})];
  for(const plan of plans)for(const core of ['success','failure','cancelled',undefined])
    for(const browser of ['success','failure','cancelled','skipped',undefined])
      assert.equal(releaseGate({core,plan,browser}),core==='success'&&(plan.ui?browser==='success':browser==='skipped'));
  assert.equal(releaseGate({core:'success',browser:'success'}),false);
});
test('aggregate CLI reads the validated Actions plan and job results',()=>{
  for(const [plan,browser,approved] of [[chooseUI({files:['game/src/audio.js']}),'success',true],
    [chooseUI({files:['AGENTS.md']}),'skipped',true],[null,'success',false],
    [chooseUI({files:['game/src/audio.js']}),'skipped',false]]){
    const result=spawnSync(process.execPath,[path.join(__dirname,'release-gate.js')],{encoding:'utf8',
      env:{...process.env,BW_CORE_RESULT:'success',BW_SELECTION:JSON.stringify(plan),BW_BROWSER_RESULT:browser}});
    assert.equal(result.status===0,approved);
  }
});
test('deployment-sized verification transports every path under the Actions environment limit',()=>{
  const files=Array.from({length:2400},(_,i)=>'game/art/painted-release/directional-wardrobe/independent-world-and-frontal-projections/測定-fitted-equipment-bank-'+i+'.webp');
  const plan={...chooseUI({files:['game/src/game.js']}),files};
  const legacy=JSON.stringify(plan), encoded=encodeSelection(plan);
  assert.ok(Buffer.byteLength(legacy)>=271213,'fixture must exceed the observed plan size');
  assert.ok(Buffer.byteLength(encoded)<=MAX_ENCODED_BYTES);
  assert.deepEqual(decodeSelection(encoded),plan);
  assert.deepEqual(decodeSelection(legacy),plan);
  for(const [payload,browser,approved] of [[encoded,'success',true],[encoded,'skipped',false],[PREFIX+'invalid!','success',false]]){
    const result=spawnSync(process.execPath,[path.join(__dirname,'release-gate.js')],{encoding:'utf8',
      env:{...process.env,BW_CORE_RESULT:'success',BW_SELECTION:payload,BW_BROWSER_RESULT:browser}});
    assert.equal(result.status===0,approved);
  }
});
test('verification transport rejects malformed, oversized and expanding payloads',()=>{
  const wrap=bytes=>PREFIX+bytes.toString('base64');
  const json=Buffer.from('{"ui":true}');
  const compressed=deflateSync(json);
  const corrupt=Buffer.from(compressed);corrupt[corrupt.length-1]^=1;
  for(const value of [undefined,PREFIX,PREFIX+'Zg=',PREFIX+'Zg==\n',PREFIX+'Zh==',PREFIX+'Zg__',
    PREFIX+'A'.repeat(MAX_ENCODED_BYTES),wrap(corrupt),wrap(Buffer.concat([compressed,Buffer.from([0])])),
    wrap(deflateSync(Buffer.from([34,255,34]))),
    wrap(deflateSync(Buffer.alloc(MAX_DECODED_BYTES+1,32)))])
    assert.throws(()=>decodeSelection(value));
  assert.throws(()=>decodeSelection(' '.repeat(MAX_DECODED_BYTES+1)),/uncompressed size limit/);
  assert.throws(()=>encodeSelection('x'.repeat(MAX_DECODED_BYTES)),/uncompressed size limit/);
  const highEntropy=require('node:crypto').randomBytes(MAX_ENCODED_BYTES).toString('hex');
  assert.throws(()=>encodeSelection(highEntropy),/Actions transport size limit/);
});
test('deferred execution cannot suppress explicitly requested full UI',()=>{
  const result=spawnSync(process.execPath,[path.join(__dirname,'verify.js'),'--defer-ui','--ui'],{encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/Cannot defer an explicit --ui request/);
  assert.doesNotMatch(result.stdout,/Packed art/);
});
test('schedule CLI is full and non-publishing without a comparison SHA',()=>{
  const receipt=path.join(__dirname,'../../work/test-selection.json');
  const before=fs.existsSync(receipt)?fs.readFileSync(receipt,'utf8'):null;
  const result=spawnSync(process.execPath,[path.join(__dirname,'select-tests.js'),'--dry-run'],{encoding:'utf8',
    env:{...process.env,CI:'true',GITHUB_EVENT_NAME:'schedule',BW_DIFF_BASE:'',BW_VERIFY_SCOPE:'full',BW_PUBLISH:'false',GITHUB_OUTPUT:''}});
  assert.equal(result.status,0,result.stderr);const plan=JSON.parse(result.stdout);
  assert.equal(plan.release,false);assert.deepEqual(plan.suites,ALL_SUITES);
  assert.equal(fs.existsSync(receipt)?fs.readFileSync(receipt,'utf8'):null,before,'dry-run must preserve real CI receipt');
});
test('Actions retains all profiles, validates the plan and isolates nightly queueing',()=>{
  const config=require('../playwright.config');
  const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/pages.yml'),'utf8').replace(/\r/g,'');
  const browser=workflow.split('\n  browser:\n')[1]?.split('\n  build:\n')[0];assert.ok(browser);
  const profiles=[...browser.matchAll(/- project: ([\w-]+)\n\s+browser: ([\w-]+)/g)].map(m=>[m[1],m[2]]).sort();
  assert.deepEqual(profiles,config.projects.map(p=>[p.name,p.use.browserName]).sort());assert.equal(config.retries,0);
  assert.match(browser,/BW_UI_SUITES: \$\{\{ needs\.core\.outputs\.suites \}\}/);assert.match(browser,/fail-fast: false/);
  const aggregate=workflow.split('\n  build:\n')[1]?.split('\n  deploy:\n')[0];
  assert.match(aggregate,/needs: \[core, browser\]/);assert.match(aggregate,/always\(\) && !cancelled\(\)/);
  assert.match(aggregate,/BW_BROWSER_RESULT: \$\{\{ needs\.browser\.result \}\}/);
  assert.match(aggregate,/BW_SELECTION: \$\{\{ needs\.core\.outputs\.plan \}\}/);assert.match(aggregate,/node game\/test\/release-gate\.js/);
  const deploy=workflow.split('\n  deploy:\n')[1];assert.match(deploy,/needs: \[core, build\]/);
  assert.match(deploy,/needs\.build\.result == 'success'/);assert.match(deploy,/needs\.core\.outputs\.live == 'true'/);
  assert.match(deploy,/github.ref == 'refs\/heads\/main'/);assert.match(deploy,/!cancelled\(\)/);
  assert.match(deploy,/node test\/deployment-baseline\.js --guard/);assert.match(deploy,/fetch-depth: 0/);
  assert.match(deploy,/BW_VERIFIED_BASE: \$\{\{ needs\.core\.outputs\.coverage_base \}\}/);
  assert.match(workflow,/run: node test\/deployment-baseline\.js\n/);
  assert.doesNotMatch(workflow,/run: npm run (build|verify|test:protocol|test:live)/);
  assert.equal((workflow.match(/run: node build\.js/g)||[]).length,2);
  assert.equal((workflow.match(/steps\.select\.outputs\.release == 'true'/g)||[]).length,2);
  assert.match(workflow,/schedule:\n    - cron: '20 9 \* \* \*'/);assert.match(workflow,/'nightly'.*'validation'.*'release'/);
  assert.match(workflow,/publish:[\s\S]*?default: false/);assert.doesNotMatch(workflow,/continue-on-error: true/);
});
test('workflow YAML rejects duplicate keys and preserves baseline/publication wiring',()=>{
  const YAML=require('yaml');const document=YAML.parseDocument(fs.readFileSync(path.join(__dirname,'../../.github/workflows/pages.yml'),'utf8'),{uniqueKeys:true});
  assert.deepEqual(document.errors,[]);const jobs=document.toJS().jobs;
  const checkout=jobs.deploy.steps.find(s=>s.name==='Check out source for live verification');
  assert.equal(checkout.with['fetch-depth'],0);assert.equal(checkout.with['persist-credentials'],false);
  const guard=jobs.deploy.steps.find(s=>s.id==='order'),deploy=jobs.deploy.steps.find(s=>s.id==='deployment');
  assert.ok(jobs.deploy.steps.indexOf(guard)<jobs.deploy.steps.indexOf(deploy));
  assert.equal(deploy.if,"steps.order.outputs.publish == 'true'");
  assert.equal(jobs.core.outputs.coverage_base,'${{ steps.select.outputs.coverage_base }}');
  assert.equal(jobs.core.outputs.ui_session_profile,'${{ steps.select.outputs.ui_session_profile }}');
  assert.equal(jobs.browser.env.BW_UI_SESSION_PROFILE,'${{ needs.core.outputs.ui_session_profile }}');
  assert.equal(jobs.core.steps.find(s=>s.id==='select').run,'node test/select-tests.js');
  assert.equal(jobs.deploy.steps.find(s=>s.run==='node test/live.js').env.BW_SELECTION,'${{ needs.core.outputs.plan }}');
});
test('required browser shards cross all profiles and keep independent evidence and fail-closed aggregation',()=>{
  const {jobs}=require('yaml').parse(fs.readFileSync(path.join(__dirname,'../../.github/workflows/pages.yml'),'utf8'));
  const {browser,build}=jobs,{matrix}=browser.strategy;
  const profiles=require('../playwright.config').projects.map(p=>({project:p.name,browser:p.use.browserName}));
  assert.deepEqual(Object.keys(matrix).sort(),['include','project','shard']);
  assert.deepEqual(matrix.project,profiles.map(p=>p.project));
  assert.deepEqual(matrix.shard,[1,2]);assert.deepEqual(matrix.include,profiles);
  // Include only adds the correct browser to each project/shard combination;
  // it must not replace the Cartesian axes with standalone profile rows.
  const rows=matrix.project.flatMap(project=>matrix.shard.map(shard=>({...matrix.include.find(p=>p.project===project),shard})));
  assert.equal(rows.length,6);assert.ok(rows.every(row=>row.browser));
  assert.equal(browser.strategy['fail-fast'],false);assert.equal(browser['timeout-minutes'],90);
  assert.equal(browser.env.BW_UI_WORKERS,'1');
  assert.equal(browser.if,"needs.core.outputs.ui == 'true'");assert.equal(browser.needs,'core');
  const verify=browser.steps.find(s=>s.name==='Verify every selected suite in this profile');
  assert.equal(verify.run,'npx playwright test --project=${{ matrix.project }} --shard=${{ matrix.shard }}/2');
  const evidence=browser.steps.find(s=>s.name==='Retain profile evidence');
  assert.equal(evidence.if,'always()');assert.equal(evidence.with.name,'browser-${{ matrix.project }}-${{ matrix.shard }}');
  const names=rows.map(row=>evidence.with.name.replace('${{ matrix.project }}',row.project).replace('${{ matrix.shard }}',row.shard));
  assert.equal(new Set(names).size,6);
  assert.deepEqual(build.needs,['core','browser']);
  const gate=build.steps.find(s=>s.run==='node game/test/release-gate.js');
  assert.equal(gate.env.BW_BROWSER_RESULT,'${{ needs.browser.result }}');
  assert.equal(gate.env.BW_CORE_RESULT,'${{ needs.core.result }}');
  assert.equal(gate.env.BW_SELECTION,'${{ needs.core.outputs.plan }}');
  assert.equal(require('../playwright.config').retries,0);
  for(const job of Object.values(jobs)){
    assert.ok(!job['continue-on-error']);
    assert.ok(job.steps.every(step=>!step['continue-on-error']));
  }
});

test('painted session requires a matching active main push and retains full core/hosted gates',()=>{
  const active=loadSession(),record=active?.id==='painted-characters-2026-11-26'?active:null,candidate='e'.repeat(40),previous='d'.repeat(40);
  const productionBody='game/art/painted-release/body-30-crossbow.webp';
  const files=[SESSION_FILE,'game/build.js','game/src/painted_gear.js','game/art/paintedgear/gear.webp',
    productionBody,'game/art/painted-release/body-5-hands-hands-plated-block.webp',
    'game/art/painted-release/doll-5-feet-feet-riding.webp','game/test/browser/appearance-materials.js'];
  const pkg=fs.readFileSync(path.join(__dirname,'../package.json'),'utf8');
  const lock=fs.readFileSync(path.join(__dirname,'../package-lock.json'),'utf8');
  const simulate=({delta=files,time=Date.parse(record?.startsAt || '2026-11-26T14:46:00Z')+1000,
    expectedBase=record?.publishedBase || 'cb5546ec62ab8b6219eb56cd3f1ef4aaf09671a8',
    env={},packageBefore=pkg,noComparison=false}={})=>selection({
    now:time, assertOrder:(base,head)=>assert.deepEqual([base,head],[expectedBase,candidate]),
    env:{CI:'true',GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main',BW_DIFF_BASE:previous,
      BW_RELEASE_BASE:expectedBase,BW_RELEASE_VERIFIED:'true',...env},
    runGit:(...args)=>{
      if(args[0]==='rev-parse')return candidate;
      if(args[0]==='cat-file' && noComparison)throw Error('missing comparison');
      if(args[0]==='diff')return (args[4]===previous||args[4]===expectedBase?delta:[]).join('\0')+'\0';
      if(args[0]==='show')return args[1].endsWith('package-lock.json')?lock:packageBefore;
      return '';
    },
  });
  const selected=simulate();
  if (!record) {
    assert.equal(selected.tier,'full');
    assert.deepEqual(selected.suites,ALL_SUITES);
    assert.throws(()=>webkitGrep('painted-characters-2026-11-26'),/unavailable/);
    return;
  }
  assert.equal(selected.tier,'session');assert.equal(selected.sessionProfile.candidate,candidate);
  assert.deepEqual(selected.coreGroups,['all']);assert.deepEqual(selected.suites,record.chromiumSuites);
  assert.deepEqual(liveSuites(selected),LIVE_SUITES);
  const gate=(plan,browser='success',expectedCommit=candidate)=>releaseGate({core:'success',plan,browser,expectedCommit});
  assert.equal(gate(selected),true);
  assert.equal(gate(selected,'failed'),false);assert.equal(gate(selected,'skipped'),false);
  assert.equal(gate(selected,'success','f'.repeat(40)),false);
  for(const [key,value] of [['coreGroups',['assets']],['suites',['canary']],['profiles',['phone-chromium']],
    ['sceneProfiles',['phone-webkit']],['live',false],['coverageBase',previous],['files',files.slice(1)],
    ['sessionProfile',{...selected.sessionProfile,selectedAt:record.expiresAt}]])
    assert.equal(gate({...selected,[key]:value}),false,key);
  for(const opts of [{time:Date.parse(record.expiresAt)},{time:Date.parse(record.startsAt)-1},
    {expectedBase:'f'.repeat(40)},{delta:[...files,'game/src/service-worker.js']},
    {delta:[...files,'game/vendor/new.js']},{delta:files.slice(1)},{noComparison:true},
    {delta:files.map(file=>file===productionBody?'game/art/painted/body-30-idle.webp':file)},
    {packageBefore:JSON.stringify({...JSON.parse(pkg),dependencies:{unapproved:'1.0.0'}})},
    {env:{BW_VERIFY_SCOPE:'full'}},{env:{GITHUB_EVENT_NAME:'pull_request'}},
    {env:{GITHUB_EVENT_NAME:'schedule'}},{env:{GITHUB_REF:'refs/heads/another'}}]){
    const normal=simulate(opts);assert.equal(normal.tier,'full',JSON.stringify(opts));assert.deepEqual(normal.suites,ALL_SUITES);
  }
  assert.throws(()=>webkitGrep('wrong-release'),/Unknown/);
});
test('facing hotfix session binds the exact baseline, window, changed paths and core groups',()=>{
  const record=loadSession(), id='painted-facing-hotfix-2026-11-26';
  if (record?.id!==id) {
    assert.throws(()=>webkitGrep(id),/unavailable/);
    return;
  }
  const candidate='a'.repeat(40),previous='b'.repeat(40),base=record.publishedBase;
  const sources=['game/src/painted_character_view.js','game/src/scene_b.js'];
  const files=[SESSION_FILE,...sources,'game/test/browser/joystick.js','game/test/painted-character.test.js','game/test/select-tests.js'];
  const pkg=fs.readFileSync(path.join(__dirname,'../package.json'),'utf8');
  const lock=fs.readFileSync(path.join(__dirname,'../package-lock.json'),'utf8');
  const simulate=(delta=files,reference=base,now=Date.parse(record.startsAt)+1000)=>selection({
    now, assertOrder:(published,head)=>assert.deepEqual([published,head],[reference,candidate]),
    env:{CI:'true',GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main',BW_DIFF_BASE:previous,
      BW_RELEASE_BASE:reference,BW_RELEASE_VERIFIED:'true'},
    runGit:(...args)=>{
      if(args[0]==='rev-parse')return candidate;
      if(args[0]==='diff')return (args[4]===previous||args[4]===reference?delta:[]).join('\0')+'\0';
      if(args[0]==='show')return args[1].endsWith('package-lock.json')?lock:pkg;
      return '';
    },
  });
  const selected=simulate();
  assert.equal(selected.tier,'session');
  assert.deepEqual(selected.coreGroups,['assets','actors','build','protocol']);
  assert.deepEqual(selected.suites,['canary','scenes','arming','joystick','appearance-materials']);
  assert.equal(validSelection(selected),true);
  assert.deepEqual(liveSuites(selected),LIVE_SUITES);
  for(const coreGroups of [['all'],['assets','build','protocol'],['actors']])
    assert.equal(validSelection({...selected,coreGroups}),false);
  for(const full of [simulate(files,'d'.repeat(40)),simulate(files,base,Date.parse(record.expiresAt)),
    ...sources.map(file=>simulate(files.filter(f=>f!==file))),
    ...['game/src/game.js','game/build.js','game/package-lock.json','game/art/paintedgear/gear.webp','game/art/readme.md'].map(file=>simulate([...files,file]))]){
    assert.equal(full.tier,'full');
    assert.deepEqual(full.suites,ALL_SUITES);
  }
});
test('intro hotfix binds baseline, expiry, paths, all profiles and every relevant failure',()=>{
  const record=loadSession(),id='intro-controls-hotfix-2026-11-26';
  if(record?.id!==id){assert.throws(()=>webkitGrep(id),/unavailable/);return;}
  const candidate='a'.repeat(40),previous='b'.repeat(40),base=record.publishedBase;
  const sources=['game/src/game.js','game/src/style.css','game/src/scene_b.js'];
  const files=[SESSION_FILE,...sources,'game/test/browser/intro-helper.js','game/test/browser/learning-boundaries.js','game/test/browser/living-world.js'];
  const pkg=fs.readFileSync(path.join(__dirname,'../package.json'),'utf8'),lock=fs.readFileSync(path.join(__dirname,'../package-lock.json'),'utf8');
  const simulate=(delta=files,reference=base,now=Date.parse(record.startsAt)+1000)=>selection({
    now,assertOrder:(published,head)=>assert.deepEqual([published,head],[reference,candidate]),
    env:{CI:'true',GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main',BW_DIFF_BASE:previous,BW_RELEASE_BASE:reference,BW_RELEASE_VERIFIED:'true'},
    runGit:(...args)=>{if(args[0]==='rev-parse')return candidate;if(args[0]==='diff')return(args[4]===previous||args[4]===reference?delta:[]).join('\0')+'\0';if(args[0]==='show')return args[1].endsWith('package-lock.json')?lock:pkg;return '';},
  });
  const selected=simulate();
  assert.equal(selected.tier,'session');assert.equal(validSelection(selected),true);
  assert.deepEqual(selected.coreGroups,['assets','actors','world','build','protocol']);
  assert.deepEqual(liveSuites(selected),LIVE_SUITES);
  assert.equal(releaseGate({core:'success',plan:selected,browser:'success',expectedCommit:candidate}),true);
  for(const browser of ['failure','skipped','cancelled'])assert.equal(releaseGate({core:'success',plan:selected,browser,expectedCommit:candidate}),false);
  for(const full of [simulate(files,'d'.repeat(40)),simulate(files,base,Date.parse(record.expiresAt)),simulate(files,base,Date.parse(record.startsAt)-1),
    ...sources.map(file=>simulate(files.filter(f=>f!==file))),
    ...['game/src/service-worker.js','game/build.js','game/package-lock.json','game/art/new.webp'].map(file=>simulate([...files,file]))]){
    assert.equal(full.tier,'full');assert.deepEqual(full.suites,ALL_SUITES);
  }
  for(const key of ['coreGroups','profiles','sessionProfile']){
    const altered={...selected,[key]:key==='coreGroups'?['assets']:key==='profiles'?['phone-chromium']:{...selected.sessionProfile,candidate:'c'.repeat(40)}};
    assert.equal(releaseGate({core:'success',plan:altered,browser:'success',expectedCommit:candidate}),false);
  }
});

function listSuites(suites,{live=false,session,project,shard,workers}={}){
  const env={...process.env,[live?'BW_LIVE_SUITES':'BW_UI_SUITES']:JSON.stringify(suites)};
  if(workers)env.BW_UI_WORKERS=String(workers);
  if(live)env.BW_LIVE='1';else delete env.BW_LIVE;
  if(session)env.BW_UI_SESSION_PROFILE=session;else delete env.BW_UI_SESSION_PROFILE;
  const args=['test','--list','--reporter=json'];
  if(project)args.push('--project='+project);if(shard)args.push('--shard='+shard);
  const result=spawnSync(process.execPath,[require.resolve('@playwright/test/cli'),...args],{
    cwd:path.resolve(__dirname,'..'),encoding:'utf8',env,maxBuffer:16*1024*1024});
  assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);assert.deepEqual(report.errors,[]);
  if(workers)assert.equal(report.config.workers,Number(workers),'discovery must use the workflow worker limit');
  const cases=[];function visit(s){for(const spec of s.specs||[])for(const t of spec.tests)cases.push({title:spec.title,file:spec.file,project:t.projectName});for(const child of s.suites||[])visit(child);}visit(report);return cases;
}
test('session real discovery keeps each exact WebKit critical case and complete selected Chromium suites',()=>{
  const session=loadSession();
  if (!session) {
    assert.equal(webkitGrep(''),undefined);
    return;
  }
  const standard=listSuites(session.chromiumSuites), cases=listSuites(session.chromiumSuites,{session:session.id});
  assert.deepEqual(cases.filter(t=>t.project==='phone-webkit').map(t=>t.title).sort(),session.webkitTests.toSorted());
  if(session.id==='intro-controls-hotfix-2026-11-26'){
    for(const profile of ['phone-chromium','desktop-chromium'])
      assert.deepEqual(cases.filter(t=>t.project===profile).map(t=>t.title).sort(),session.webkitTests.toSorted());
    assert.equal(cases.length,27);
    assert.ok(standard.length>cases.length);
    return;
  }
  for(const profile of ['phone-chromium','desktop-chromium'])
    assert.deepEqual(cases.filter(t=>t.project===profile),standard.filter(t=>t.project===profile));
  assert.ok(cases.some(t=>t.title.includes('painted fit ·')&&t.project==='phone-chromium'));
  assert.equal(cases.some(t=>t.title.includes('guided day without skipping')),false);
});
test('actual discovery retains full long flows and all projects; smoke stays bounded',()=>{
  const full=listSuites(ALL_SUITES),smoke=listSuites(['smoke']),music=listSuites(['smoke','music']);
  assert.deepEqual([...new Set(full.map(t=>t.project))].sort(),['desktop-chromium','phone-chromium','phone-webkit']);
  assert.equal(smoke.length,9);assert.ok(smoke.some(t=>t.title.includes('export, import')));
  assert.ok(full.some(t=>t.title.includes('guided day without skipping')));
  for(const name of MODULES)assert.ok(full.some(t=>t.file.replace(/\\/g,'/').endsWith(name+'.js')),name+' is registered');
  assert.ok(music.length>smoke.length);assert.ok(music.every(t=>smoke.some(s=>s.title===t.title)||t.file.replace(/\\/g,'/').endsWith('music.js')));
  assert.ok(full.length>music.length);assert.ok(full.every(t=>full.filter(c=>c.project===t.project).length===full.length/3));
});

test('actual required shard discovery is disjoint and exactly preserves the full inventory',t=>{
  const browser=require('yaml').parse(fs.readFileSync(path.join(__dirname,'../../.github/workflows/pages.yml'),'utf8')).jobs.browser;
  const {matrix}=browser.strategy,workers=browser.env.BW_UI_WORKERS;
  const full=listSuites(ALL_SUITES,{workers}),key=c=>JSON.stringify([c.project,c.file,c.title]);
  const expected=full.map(key).sort();assert.equal(new Set(expected).size,expected.length);
  const combined=[];
  for(const project of matrix.project){
    const discovered=matrix.shard.map(shard=>listSuites(ALL_SUITES,{project,shard:shard+'/'+matrix.shard.length,workers}));
    const sets=discovered.map(cases=>new Set(cases.map(key)));
    assert.ok(sets.every(set=>set.size>0));
    assert.equal([...sets[0]].filter(id=>sets[1].has(id)).length,0,project+' shards overlap');
    const union=discovered.flat().map(key).sort();
    assert.deepEqual(union,full.filter(c=>c.project===project).map(key).sort(),project+' has missing or extra cases');
    combined.push(...union);
    t.diagnostic(project+': '+discovered.map(cases=>cases.length).join(' + ')+' = '+union.length);
  }
  assert.deepEqual(combined.sort(),expected);
  t.diagnostic('All required shards preserve '+expected.length+' full cases, including all profession journeys.');
});

test('real discovery separates the four profession days without losing targeted first-day regressions',()=>{
  const focused=listSuites(['smoke','first-day']);
  const journeys=listSuites(normalizeSuites(['smoke','journeys']));
  assert.equal(focused.some(t=>t.title.includes('guided day without skipping')),false);
  assert.equal(journeys.filter(t=>t.title.includes('guided day without skipping')).length,12);
  for(const path of ['warrior','thief','mage','crafter'])
    assert.equal(journeys.filter(t=>t.title.endsWith('· '+path)).length,3);
  for(const title of ['road farewell completes','unfinished safe practice survives','guided fishing keeps'])
    assert.equal(focused.filter(t=>t.title.includes(title)).length,3);
  assert.ok(focused.every(t=>journeys.some(j=>j.title===t.title&&j.project===t.project)));
});

test('hosted real discovery retains one smoke, affected checks and all six full cases',()=>{
  const smoke=listSuites(['smoke'],{live:true}),all=listSuites(LIVE_SUITES,{live:true});
  assert.equal(smoke.length,1);assert.match(smoke[0].title,/exact deployed commit/);
  assert.equal(all.length,6);
  for(const [suite,count] of [['audio',2],['offline',2],['battle',2],['arrival',3]]){
    const cases=listSuites(['smoke',suite],{live:true});assert.equal(cases.length,count);
    assert.ok(cases.every(t=>all.some(c=>c.title===t.title)));
  }
});
