// Opt-in compressed campaigns. Does not run in ordinary CI or change shipped rules.
require('./browser-path');
const { chromium,expect }=require('@playwright/test');
const { spawn,spawnSync }=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {drivePath}=require('./browser/movement');
const game=path.resolve(__dirname,'..'),auditRoot=path.resolve(game,'../work/path-audit');
const args=Object.fromEntries(process.argv.slice(2).map(x=>{const [k,...v]=x.replace(/^--/,'').split('=');return[k,v.join('=')];}));
const paths=(args.paths||'warrior,mage,thief').split(','),seeds=(args.seeds||'1729').split(',').map(Number),encounters=Number(args.encounters||12);
const mistakeEvery=Number(args['mistake-every']||0),label=args.label||'latest';
if(!/^[a-z0-9-]+$/i.test(label)||!Number.isSafeInteger(mistakeEvery)||mistakeEvery<0||mistakeEvery===1)throw Error('Use a simple output label and mistake-every 0 or >=2');
const work=path.join(auditRoot,label);
if(paths.some(p=>!['warrior','mage','thief'].includes(p))||seeds.some(s=>!Number.isSafeInteger(s)||s<1)||!Number.isSafeInteger(encounters)||encounters<1||encounters>50)throw Error('Use valid paths, positive seeds and 1–50 encounters per Circle');
fs.mkdirSync(work,{recursive:true});
const snapshot=args.snapshot?path.resolve(args.snapshot):fs.mkdtempSync(path.join(work,'campaign-'));
if(!snapshot.startsWith(auditRoot+path.sep))throw Error('Snapshots must stay within work/path-audit');
if(!args.snapshot){const built=spawnSync(process.execPath,['build.js'],{cwd:game,env:{...process.env,BW_DIST:snapshot},stdio:'inherit'});if(built.status)process.exit(built.status||1);}
const driverSource=fs.readFileSync(path.join(__dirname,'path-driver.js'),'utf8');
fs.writeFileSync(path.join(work,'harness-driver.js'),driverSource);
fs.copyFileSync(__filename,path.join(work,'harness-runner.js'));
const metadata={...JSON.parse(fs.readFileSync(path.join(snapshot,'release.json'),'utf8')),auditDriverSha256:createHash('sha256').update(driverSource).digest('hex')};
async function freePort(){return await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});}
async function move(page,path,run,purpose) {
  const before=await page.evaluate(()=>{PathAudit.act('coachok');document.body.tabIndex=-1;document.body.focus();Scene.resume();return PathAudit.snapshot();});
  // The actual joystick updates its availability on the next rendered frame.
  await page.waitForTimeout(50);await page.evaluate(()=>PathAudit.act('coachok'));
  if(await page.evaluate(()=>!!__bw.F))return false;
  try{await expect(page.locator('.movement-joystick')).toHaveAttribute('aria-disabled','false',{timeout:5000});}
  catch(error){if(await page.evaluate(()=>!!__bw.F))return false;throw error;}
  await drivePath(page,path,run);
  await page.evaluate(({before,purpose})=>PathAudit.movement(before,purpose),{before,purpose});
  return true;
}
async function thiefFight(page,r,n,boss=false) {
  const prep=await page.evaluate(({r,n,boss})=>PathAudit.prepareStrike(r,n,boss),{r,n,boss});if(!prep)return null;
  if(!prep.fallback){
    await page.evaluate(()=>{PathAudit.act('coachok');document.body.tabIndex=-1;document.body.focus();});
    await move(page,prep.path,false,'backstab-approach');
    const follow=await page.evaluate(()=>PathAudit.continueApproach());if(follow?.length)await move(page,follow,false,'follow-rear-approach');
    for(let attempt=0;attempt<5;attempt++) {
      const hit=await page.evaluate(boss=>PathAudit.strikePendingTarget(boss),boss);
      if(hit.done)return hit.won;if(hit.fallback)break;
      const escape=await page.evaluate(()=>PathAudit.escapeRoute());if(!escape)break;
      await move(page,escape,true,'backstab-escape');
      const back=await page.evaluate(()=>PathAudit.returnRoute());if(!back)break;
      await move(page,back,false,'backstab-return');
    }
  }
  return await page.evaluate(boss=>PathAudit.fallbackStrike(boss),boss);
}
async function main(){
  const port=await freePort(),base=`http://localhost:${port}`;
  const server=spawn(process.execPath,['test/server.js'],{cwd:game,env:{...process.env,BW_DIST:snapshot,BW_TEST_PORT:String(port)},stdio:['ignore','pipe','inherit']});
  let browser;
  try {
    await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Fixture startup timeout')),15000);server.stdout.once('data',()=>{clearTimeout(t);resolve();});server.once('error',reject);});
    browser=await chromium.launch({headless:true});
    const results=[];
    for(const seed of seeds)for(const role of paths){
      const context=await browser.newContext({viewport:{width:390,height:720},isMobile:true,hasTouch:true});const page=await context.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      const checkpoints=[];let report;
      try {
        await page.goto(base+'/index.html?visual_test=1');await page.locator('#artload').waitFor({state:'hidden',timeout:45000});await page.locator('#st-load').waitFor({state:'hidden',timeout:45000});
        await page.locator('[data-a=newslot]').first().click();await page.locator(`[data-a=pick][data-id=${role}]`).first().click();await page.locator('[data-a=begin]').click();
        await require('./browser/intro-helper').skipArrival(page,role+' audit');
        await page.waitForFunction(()=>window.__bw&&Scene.debug().map);
        await page.addScriptTag({content:driverSource});await page.evaluate(options=>installPathAudit(options),{path:role,seed,mistakeEvery});
        checkpoints.push({label:'fresh',...await page.evaluate(()=>PathAudit.start())});
        for(let r=1;r<=8;r++) {
          console.log(`${role} seed ${seed}: Circle ${r}`);
          await page.evaluate(r=>{const P=PathAudit;P.travel(r);for(const c of Content.CONTRACTS.filter(c=>c.r===r&&!__bw.S.done[c.id]))P.contract(c.id);P.shopping(r);P.locks(r);},r);
          if(role==='thief'&&r===1)await page.evaluate(()=>PathAudit.learnBackstab());
          if(role==='thief')for(let n=0;n<6;n++) {
            const approach=await page.evaluate(r=>PathAudit.prepareTheft(r),r);if(!approach)break;if(approach.retry)continue;
            await page.evaluate(()=>{PathAudit.act('coachok');const b=document.body;b.tabIndex=-1;b.focus();});
            await move(page,approach.path,false,'theft-approach');
            await page.evaluate(({id,n})=>PathAudit.steal(id,n%2===1),{id:approach.id,n});
          }
          for(let n=0;n<encounters;n++) {
            if(r===2&&n<3)await page.evaluate(({path,n})=>{
              const P=PathAudit,id={warrior:'swords',mage:'magery',thief:'fencing'}[path],stat={warrior:'str',mage:'int',thief:'dex'}[path];
              P.controlMode(id,n===0?'lock':n===1?'down':'up');P.controlMode(stat,n===0?'lock':n===1?'down':'up',true);
              if(n===2){for(const other of Progression.stats.filter(k=>k!==stat))P.controlMode(other,'lock',true);P.controlTarget(id,+((__bw.S.sk[id]||0)+.1).toFixed(1));P.controlTarget(stat,+(__bw.S.attr[stat]+.2).toFixed(1),true);}
            },{path:role,n});
            const held=r===2&&n<3?await page.evaluate(()=>PathAudit.snapshot()):null;
            const status=role==='thief'&&!(r===2&&n<3)?await thiefFight(page,r,n):await page.evaluate(({r,n})=>{const P=PathAudit,e=P.enemies(r)[n%P.enemies(r).length];if(!e)return null;return P.fight(e,{utilitySample:n%5===0});},{r,n});
            if(status===null)break;
            if(held) {
              const id={warrior:'swords',mage:'magery',thief:'fencing'}[role],stat={warrior:'str',mage:'int',thief:'dex'}[role],after=await page.evaluate(()=>PathAudit.snapshot());
              if(n<2){assert.equal(after.sk[id]||0,held.sk[id]||0);assert.equal(after.attr[stat],held.attr[stat]);}
              else {assert.equal(after.sk[id],+(held.sk[id]+.1).toFixed(1));assert.equal(after.modes[id],'lock');assert.equal(after.attr[stat],+(held.attr[stat]+.2).toFixed(1));assert.equal(after.statModes[stat],'lock');}
              await page.evaluate(({id,stat})=>{PathAudit.controlTarget(id,null);PathAudit.controlTarget(stat,null,true);PathAudit.controlMode(id,'up');for(const other of Progression.stats)PathAudit.controlMode(other,'up',true);},{id,stat});
            }
          }
          let won=false;for(let attempt=0;attempt<3&&!won;attempt++){await page.evaluate(r=>PathAudit.supplies(r),r);won=role==='thief'?await thiefFight(page,r,0,true):await page.evaluate(r=>{const e=Scene.find(e=>e.kind==='boss'&&e.r===r);if(!e)throw Error('No examiner '+r);return PathAudit.fight(e,{boss:true});},r);}
          checkpoints.push(await page.evaluate(r=>PathAudit.checkpoint('Circle '+r),r));
          await page.evaluate(()=>{PathAudit.act('tab',{t:'hero'});PathAudit.act('coachok');});
          await page.screenshot({path:path.join(work,`${role}-${seed}-circle-${r}.png`),fullPage:false});
          if(!won){await page.evaluate(r=>PathAudit.warnings.push('Examiner '+r+' not defeated'),r);break;}
          await page.evaluate(()=>PathAudit.act('tab',{t:'world'}));
        }
        report=await page.evaluate(()=>PathAudit.report());report.checkpoints=checkpoints;report.errors=errors;
        const controls=await page.evaluate(path=>{
          const id={warrior:'swords',mage:'magery',thief:'fencing'}[path],stat={warrior:'str',mage:'int',thief:'dex'}[path];
          PathAudit.controlTarget(id,+((__bw.S.sk[id]||0)+.5).toFixed(1));PathAudit.controlMode(id,'lock');PathAudit.controlMode(stat,'down',true);PathAudit.controlTarget(stat,+(__bw.S.attr[stat]+.5).toFixed(1),true);
          PathAudit.act('export');return document.querySelector('#savebox').value;
        },role);
        const exported=JSON.parse(Buffer.from(controls,'base64').toString('utf8')),world=exported.worlds[exported.world],expected=world.slots[world.cur];
        await page.evaluate(code=>{PathAudit.act('closesheet');PathAudit.act('import');document.querySelector('#savebox').value=code;PathAudit.act('doimport');},controls);
        await page.waitForLoadState('networkidle');await page.goto(base+'/index.html?visual_test=1');await page.locator('#artload').waitFor({state:'hidden',timeout:45000});await page.locator('#st-load').waitFor({state:'hidden',timeout:45000});await page.locator(`[data-a=playslot][data-i="${world.cur}"]`).click();
        const persisted=await page.evaluate(()=>{const s=__bw.S;return Object.fromEntries(['sk','attr','skillModes','skillTargets','attrModes','attrTargets','mana','stamina','stats','pages'].map(k=>[k,s[k]]));});
        for(const [k,v]of Object.entries(persisted))assert.deepEqual(v,expected[k]);
        report.persistence={exportImportReload:true,checked:Object.keys(persisted)};report.earnedSaveCode=controls;
        await page.locator('#nav [data-t=hero]').click();const coach=page.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();await page.screenshot({path:path.join(work,`${role}-${seed}-restored-controls.png`)});
        assert.deepEqual(errors,[]);
      }catch(error){report=await page.evaluate(()=>window.PathAudit?.report()).catch(()=>({}));report.failure=String(error.stack||error);report.checkpoints=checkpoints;report.errors=errors;console.error(role+': '+error.message);await page.screenshot({path:path.join(work,role+'-'+seed+'-failure.png')}).catch(()=>{});}
      report.metadata=metadata;report.shortcuts=['guided start skipped through its normal button','regional travel and encounter approach compressed','reference SQL automatically entered','combat animation completed immediately'];
      fs.writeFileSync(path.join(work,`${role}-${seed}.json`),JSON.stringify(report,null,2)+'\n');results.push({path:role,seed,marks:report.final?.marks,queries:report.final?.stats?.q,failure:report.failure,warnings:report.warnings});
      console.log(JSON.stringify(results.at(-1)));await context.close();
    }
    fs.writeFileSync(path.join(work,'campaign-summary.json'),JSON.stringify({metadata,results},null,2)+'\n');
    if(results.some(r=>r.failure||r.marks!==8))process.exitCode=1;
  }finally{if(browser)await browser.close();server.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
