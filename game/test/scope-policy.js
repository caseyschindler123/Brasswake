const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..');
const PROFILES=['phone-chromium','phone-webkit','desktop-chromium'];
const SCENES=['title','tallyport','fight','bag','paperdoll','dungeon','dojo','interior'];
// Complete unchanged fixture behavior was verified in Actions 45703705378.
const FIXTURE_BASE='f7988d84ba8269015db0716b3b0b1e65e29e6578';
function registrationEquivalent({readOld,readNow}={}){
  try{
    const old=file=>(readOld?readOld(file):execFileSync('git',['show',FIXTURE_BASE+':game/test/browser/'+file],{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']})).replace(/\r/g,'');
    const now=file=>(readNow?readNow(file):fs.readFileSync(path.join(__dirname,'browser',file),'utf8')).replace(/\r/g,'');
    const body=s=>s.slice(s.indexOf('test('));
    const d=old('dungeons.js'),cut=d.indexOf("test('version six accounts");
    if(body(now('dungeons.js'))!==d.slice(cut).replace(/\nmodule\.exports=\{walk,interact,win\};\s*$/,''))return false;
    if(!now('dungeon-helper.js').startsWith(d.slice(0,cut)))return false;
    const f=old('first-day.js'),start=f.indexOf("if (require('../ui-suites')"),end=f.indexOf("test('first-day · road farewell",start);
    if(body(now('first-day.js'))!==f.slice(end))return false;
    const loop=f.slice(start,end).replace(/^if \([^\n]*\n/,'');
    if(!now('journeys.js').endsWith(loop))return false;
    if(!now('first-day-helper.js').startsWith(f.slice(0,start).replace("require('./dungeons')","require('./dungeon-helper')")))return false;
    // New imports/exports must expose the complete original helper functions.
    for(const file of ['dungeon-helper.js','first-day-helper.js']){
      const s=now(file),names=[...s.matchAll(/^(?:async )?function (\w+)\(/gm)].map(m=>m[1]);
      const prefix=file==='dungeon-helper.js'?d.slice(0,cut):f.slice(0,start).replace("require('./dungeons')","require('./dungeon-helper')");
      const tail=s.slice(prefix.length).trim();if(!/^module\.exports=\{[\w,]+\};$/.test(tail))return false;
      const exported=tail.match(/\{([^}]+)\}/)[1].split(',');if(JSON.stringify([...exported].sort())!==JSON.stringify([...names].sort()))return false;
      const header="const {test,expect}=require('@playwright/test');\nconst {screenshot,observeErrors}=require('./flow');\nconst {"+exported.join(',')+"}=require('./"+file.slice(0,-3)+"');\n";
      if(file==='dungeon-helper.js'&&now('dungeons.js').slice(0,now('dungeons.js').indexOf('test('))!==header)return false;
      if(file==='first-day-helper.js'&&(now('first-day.js').slice(0,now('first-day.js').indexOf('test('))!==header||now('journeys.js')!==header+loop))return false;
    }
    return true;
  }catch{return false;}
}
const tooling = file => /^game\/test\/(?:scope-policy|dev-mode|dev-storage|scope\.test|registration\.test)\.js$/.test(file)||
  /^game\/test\/dev\.html$/.test(file)||file==='game/test/server.js'||file==='game/test/server.test.js'||file==='game/test/browser/dev-mode.js';
const registrationFiles=new Set(['game/test/browser/first-day.js','game/test/browser/journeys.js','game/test/browser/dungeons.js','game/test/browser/first-day-helper.js','game/test/browser/dungeon-helper.js']);
function scopePlan(plan,files,{equivalent=registrationEquivalent}={}){
  const p={...plan,profiles:PROFILES.slice(),scenes:plan.suites.includes('scenes')?SCENES.slice():[],coreGroups:plan.core?['all']:['protocol']};
  const gameFiles=files.filter(f=>/^game\/(src|art|vendor)\//.test(f)||f==='game/build.js');
  const fixtures=files.filter(f=>registrationFiles.has(f));
  const ordinary=files.filter(f=>!tooling(f)&&!registrationFiles.has(f));
  const onlyTooling=gameFiles.length===0&&fixtures.length===0&&ordinary.every(f=>/\.md$/i.test(f)||/^\.github\//.test(f)||
    /^game\/test\/(?:select-tests|ui-suites|verify|run-ui|release-gate|deployment-baseline|workflow\.test|protocol\.test|live|live-suites)\.js$/.test(f)||
    ['game/playwright.config.js','game/package.json','game/package-lock.json','game/test/browser/ui.spec.js','game/test/browser/live.spec.js'].includes(f));
  const safeMigration=fixtures.length>0&&gameFiles.length===0&&equivalent()&&ordinary.every(f=>/\.md$/i.test(f)||/^\.github\//.test(f)||
    /^game\/test\/(?:select-tests|ui-suites|verify|run-ui|release-gate|deployment-baseline|workflow\.test|protocol\.test|live|live-suites)\.js$/.test(f)||
    ['game/playwright.config.js','game/package.json','game/package-lock.json','game/test/browser/ui.spec.js','game/test/browser/live.spec.js'].includes(f));
  if(!plan.release&&!plan.live&&plan.tier!=='full'&&(onlyTooling||safeMigration)&&files.some(f=>!f.endsWith('.md'))){
    Object.assign(p,{tier:'focused',core:false,ui:true,suites:['canary','dev-mode'],scenes:[],coreGroups:['protocol'],reason:'Tooling/registration: exact discovery, unchanged fixture bodies and direct developer scenarios.'});
  }
  if(plan.tier==='full'&&safeMigration&&!plan.release&&!plan.live){
    Object.assign(p,{tier:'focused',core:false,ui:true,suites:['canary','dev-mode'],scenes:[],coreGroups:['protocol'],reason:'Verified fixture extraction: unchanged scenario/helper bodies; discovery and direct scenarios.'});
  }
  const cosmetic=/^game\/art\/(landscape|architecture|cartography)\/|^game\/src\/art(landscape|architecture|cartography)\.js$/;
  if(plan.tier!=='full'&&gameFiles.length&&gameFiles.every(f=>cosmetic.test(f))){
    Object.assign(p,{scope:'visual',suites:['canary','scenes'],scenes:['tallyport',...gameFiles.some(f=>/architecture/.test(f))?['interior','dungeon']:[]],coreGroups:['assets','build','protocol'],reason:'Reviewed decorative atlas: affected scene captures and integrity, without unrelated gameplay journeys.'});
  }else if(p.tier==='focused'&&p.core){
    p.coreGroups=['assets','build','protocol'];
    if(gameFiles.some(f=>/audio|music|\/mu\/|\/fx\//.test(f)))p.coreGroups.push('audio');
    if(gameFiles.some(f=>/query_feedback|sqled/.test(f)))p.coreGroups.push('engine');
    if(gameFiles.some(f=>/npc_appearance/.test(f)))p.coreGroups.push('actors');
    if(gameFiles.some(f=>/building|landscape|terrain_edges|service_places|scene_living/.test(f)))p.coreGroups.push('world');
    if(gameFiles.some(f=>/poker|casino/.test(f)))p.coreGroups.push('cards');
    if(gameFiles.some(f=>/effects/.test(f)))p.coreGroups.push('effects');
  }
  p.sceneProfiles=p.scope==='visual'?['phone-chromium','desktop-chromium']:PROFILES.slice();
  return p;
}
module.exports={PROFILES,SCENES,FIXTURE_BASE,registrationEquivalent,tooling,scopePlan};
