const {test,expect}=require('@playwright/test');
const {screenshot,observeErrors}=require('./flow');
const {walk,liveFight}=require('./dungeon-helper');
const {drivePath}=require('./movement');

async function speech(f, action) {
  if(action)await expect(f.locator('#say')).toBeVisible();
  for(let i=0;i<12;i++){
    if(action&&await f.locator(action).isVisible()){await f.locator(action).click();return;}
    const bye=f.locator('#say [data-a=closesheet]');
    if(!action&&await bye.isVisible()){await bye.click();return;}
    if(!await f.locator('#say-text').isVisible()){if(action)throw Error('Dialogue closed before '+action);return;}
    await f.locator('#say-text').click();
  }
  throw Error('Dialogue did not expose '+action);
}
async function clickWorld(f,at){
  for(let attempt=0;attempt<3;attempt++){
    await speech(f);
    const p=await f.evaluate(([x,y])=>{const d=Scene.debug();return{x:(x*16+8-d.cam.x)*d.zoom,y:(y*16+8-d.cam.y)*d.zoom};},at);
    try{await f.locator('#stage canvas.over').click({position:p,timeout:1500});return;}
    catch(error){if(attempt===2||!await f.locator('#say-text').isVisible())throw error;await speech(f);}
  }
}
async function learnMovement(f,stats){
  for(let attempt=0;attempt<6;attempt++){
    await speech(f);
    const step=await f.evaluate(()=>{
      const gd=__bw.S.gd;if(gd>=2)return {done:true};
      const {map:m,P,cam,zoom}=Scene.debug(),box=document.querySelector('#stage').getBoundingClientRect(),start=P.y*m.w+P.x,q=[start],seen=new Set(q),prev=new Map(),want=gd===0?2.5:6.1;
      for(let i=0;i<q.length&&i<1200;i++){
        const k=q[i],x=k%m.w,y=Math.floor(k/m.w),d=Math.hypot(x-P.x,y-P.y),sx=(x*16+8-cam.x)*zoom,sy=(y*16+8-cam.y)*zoom;
        if(d>=want&&sx>28&&sx<box.width-28&&sy>115&&sy<box.height-70&&!m.ents.some(e=>!e.hidden&&Math.hypot(e.fx+.5-(x+.5),e.fy+.2-(y+.5))<1.12)){const path=[];for(let n=k;n!==start;n=prev.get(n))path.push([n%m.w,Math.floor(n/m.w)]);return {at:[x,y],path:path.reverse(),run:gd===1,from:[P.x,P.y]};}
        for(const [dx,dy]of[[1,0],[-1,0],[0,-1],[0,1]]){const X=x+dx,Y=y+dy,n=Y*m.w+X;if(X<0||Y<0||X>=m.w||Y>=m.h||seen.has(n)||m.solid[n]||m.occ.has(n)||m.t[n]===4)continue;seen.add(n);prev.set(n,k);q.push(n);}
      }
      throw Error('No visible ground for the walking/running lesson');
    });
    if(step.done)return;
    await drivePath(f,step.path,step.run);await f.waitForFunction(()=>!Scene.traveling(),null,{timeout:12000});
    const pos=await f.evaluate(()=>Scene.pos());stats.steps+=Math.abs(pos[0]-step.from[0])+Math.abs(pos[1]-step.from[1]);
    await f.waitForTimeout(400);
  }
  throw Error('Walking/running lesson did not complete');
}
async function person(f,kind,stats){
  const target=()=>f.evaluate(kind=>{const p=Scene.pos(),list=Scene.ents().filter(e=>e.kind===kind&&e.r===1&&!e.hidden);list.sort((a,b)=>Math.hypot(a.x-p[0],a.y-p[1])-Math.hypot(b.x-p[0],b.y-p[1]));if(!list.length)throw Error('Missing '+kind);const e=list[0];return{at:[e.x,e.y],name:e.name,distance:Math.hypot(e.fx-p[0],e.fy-p[1])};},kind);
  for(let attempt=0;attempt<8;attempt++){
    await speech(f);const at=await target();await walk(f,at.at,stats,true);await speech(f);const live=await target();
    // A wandering porter can leave the destination while we approach it.
    if(live.distance>2.4)continue;
    const ctx=f.locator('#ctx');
    try{
      if(await ctx.isVisible()&&(await ctx.innerText()).includes(live.name))await ctx.click({timeout:1500});
      else await clickWorld(f,live.at);
    }catch(error){if(!await f.locator('#say-text').isVisible())throw error;await speech(f);continue;}
    await f.waitForTimeout(400);
    const reached=kind==='dojo'?await f.evaluate(()=>!!Scene.inHall()):kind==='folk'?await f.evaluate(()=>__bw.S.gd>=3):await f.locator('#say').getByText(live.name,{exact:false}).count()>0;
    if(reached)return;
  }
  throw Error('Could not finish the visible interaction with '+kind);
}
async function query(f,sql){await f.locator('#sql').fill(sql);await f.locator('#kb [data-fn=run]').click();await f.waitForTimeout(500);}

async function visit(f,kind,stats,extra={}){
  for(let attempt=0;attempt<12;attempt++){
  await speech(f);
  const e=await f.evaluate(({kind,extra})=>{const p=Scene.pos(),a=Scene.ents().filter(e=>e.kind===kind&&!e.dead&&!e.dying&&!e.hidden&&!(kind==='mon'&&e.inst.elite)&&Object.entries(extra).every(([k,v])=>e[k]===v));a.sort((a,b)=>Math.hypot(a.x-p[0],a.y-p[1])-Math.hypot(b.x-p[0],b.y-p[1]));if(!a.length)throw Error('Missing '+kind);
    // Follow the actual roaming creature, rather than its now-stale cell.
    // This fixture identity changes no position, movement or combat rules.
    if(kind==='mon'&&!a[0].id)a[0].id='firstday-approach-'+Scene.ents().indexOf(a[0]);
    return {id:a[0].id,at:[a[0].x,a[0].y],name:a[0].name};},{kind,extra});
  const reached=await walk(f,kind==='mon'?e.id:e.at,stats,true);if(kind==='mon'&&reached)e.at=[reached.x,reached.y];await speech(f);await f.waitForTimeout(500);if(kind==='guide'&&await f.locator('#say').isVisible())return;await speech(f);
  if(await f.locator('#ctx').isVisible()&&(await f.locator('#ctx').innerText()).includes(e.name))await f.locator('#ctx').click();else await clickWorld(f,e.at);
  await f.waitForTimeout(500);
  if(kind==='guide'){if(await f.locator('#say').isVisible())return;continue;}
  if(!['mon','guard'].includes(kind)||await f.locator('#fight').isVisible()||await f.evaluate(id=>__bw.Combat?.snapshot().target?.id===id,e.id))return;
  }
  throw Error('Could not approach and engage '+kind);
}
function beginnerAnswer(ask){
  const all=ask.match(/Show everything in the (\w+) table/);if(all)return 'SELECT * FROM '+all[1];
  if(/Show every row and column of the employees table/.test(ask))return 'SELECT * FROM employees';
  const forms=[[/stock quantity for every item/,'stock_qty','items'],[/each customer’s name followed by their city/,'name, city','customers'],[/hire date followed by the name for every employee/,'hire_date, name','employees'],[/order number, date and status for every order/,'order_id, order_date, status','orders'],[/realm, rating and name of every vendor/,'realm, rating, name','vendors'],[/each item’s category, name, stock quantity and price/,'category, name, stock_qty, unit_price','items']];
  for(const [pattern,columns,table]of forms)if(pattern.test(ask))return 'SELECT '+columns+' FROM '+table;
  const pick=ask.match(/Show the (.+?) of every (\w+)\./);if(!pick)throw Error('Unexpected untaught first-day query: '+ask);
  return 'SELECT '+pick[1].replace(/ and the /g,', ')+' FROM '+({vendor:'vendors',item:'items',customer:'customers',employee:'employees'}[pick[2]]);
}
async function beginnerFight(f,stats){
  if(await f.evaluate(()=>!!__bw.Combat&&(!__bw.F||__bw.F.live)))return liveFight(f,stats,beginnerAnswer,30);
  for(let n=0;n<30;n++){
    const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
    if(await f.locator('[data-a=floot]').isVisible())break;
    const choose=f.locator('[data-a=fchoose]');if(await choose.isVisible())await choose.click();
    const heal=f.locator('#fight [data-a=tonic]:not([disabled])');
    if(await heal.isVisible()&&await f.evaluate(()=>__bw.S.hp<=__bw.maxHp()-30)){await heal.click();await f.waitForFunction(()=>__bw.F&&!__bw.F.busy);continue;}
    const page=f.locator('[data-a=fpage]').first();if(await page.isVisible())await page.click();
    if(await coach.isVisible())await coach.click();
    await expect(f.locator('#sql')).toBeVisible();
    // Solve the rendered instruction, without reading the game's reference answer.
    await query(f,beginnerAnswer(await f.locator('#fight .ask').innerText()));stats.queries++;
    await f.waitForFunction(()=>!__bw.F?.busy,null,{timeout:15000});
  }
  await expect(f.locator('[data-a=floot]')).toBeVisible();await f.locator('[data-a=floot]').click();
  await expect(f.locator('[data-a=lootall]')).toBeVisible();await f.locator('[data-a=lootall]').click();await f.waitForTimeout(300);await speech(f);
}
async function roadFarewell(f,stats){
  const ring=await f.evaluate(()=>Scene.spots().boss1);
  // Progress is checked on actual-distance ticks. Continue far enough inside
  // the six-cell radius for a tick after rounded ownership enters that radius.
  stats.stopWhenGuideEnds=true;
  try{await walk(f,[ring[0],ring[1]+4],stats,false);}
  finally{delete stats.stopWhenGuideEnds;}
}
async function earnedDojoReadiness(f,info,stats){
  const practise=async id=>{
    await f.locator(`#sheet [data-a=learnconcept][data-id="${id}"]`).click();
    await expect(f.locator('#enc [data-lesson-example]')).toBeVisible();
    await f.locator('[data-a=qturn]').click();
    for(let attempt=0;attempt<8;attempt++){
      // Known correct fixture SQL is submitted through the ordinary editor;
      // no learning, reward or readiness flags are injected into the journey.
      await query(f,await f.evaluate(()=>__bw.Q.task.sql));stats.queries++;
      if(await f.evaluate(id=>Learning.ready(__bw.A.learning,id),id))break;
      await f.locator('[data-a=learnnext]').click();
    }
    expect(await f.evaluate(id=>Learning.ready(__bw.A.learning,id),id)).toBe(true);
    await f.locator('#enc .q-head [data-a=qleave]').click();
    await expect(f.locator('#enc')).toBeHidden();
  };
  for(const [i,id]of [[0,'sort'],[1,'limit'],[2,'distinct']]){await visit(f,'student',stats,{i});await practise(id);}
  for(const id of ['arithmetic','alias']){await visit(f,'master',stats);await speech(f,'#say [data-a=learninghub]');await practise(id);}
  expect(await f.evaluate(()=>Learning.regionConcepts(1).every(id=>Learning.ready(__bw.A.learning,id)))).toBe(true);
  await f.locator('#nav [data-t=ledger]').click();const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
  await f.locator('[data-a=lsub][data-s=grimoire]').click();await expect(f.locator('#view')).toContainText('5 of 5 regional techniques ready');
  await screenshot(f,info,'earned-dojo-readiness-and-review');await f.locator('#nav [data-t=world]').click();
}
async function finishGuidedDay(f,info,stats,fish=false,study=false){
  await f.locator('[data-a=qleave]').last().click();await speech(f);if(study)await earnedDojoReadiness(f,info,stats);await visit(f,'hallexit',stats);await speech(f);
  await visit(f,'mon',stats,{r:1});await beginnerFight(f,stats);await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(6);
  await speech(f);await f.locator('#nav [data-t=bag]').click();
  const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
  const gift=await f.evaluate(()=>__bw.S.gk);await f.locator(`[data-a=item][data-id="${gift}"]`).click();await f.locator('[data-a=equip]').click();await speech(f);
  await f.locator('#nav [data-t=hero]').click();if(await coach.isVisible())await coach.click();await expect(f.locator('#doll')).toBeVisible();await expect(f.getByRole('heading',{name:'New arrival',exact:true})).toBeVisible();await screenshot(f,info,'equipped-weapon-after-first-fight');await f.locator('#nav [data-t=world]').click();
  await visit(f,'stallkeep',stats,{r:1});await f.locator('#sheet [data-a=sellcommon]').click();await expect(f.locator('#sheet')).toContainText('Choose goods to sell');await f.locator('#sheet [data-a=sellallcommon]').click();await expect(f.locator('#sheet')).toContainText('Review this sale');await f.locator('#sheet [data-a=sellconfirm]').click();await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(8);await speech(f);
  await person(f,'dojo',stats);await person(f,'odalys',stats);await speech(f,'#say [data-a=learnpractice]');
  const trainingBefore=await f.evaluate(()=>({gold:__bw.S.gold,hp:__bw.S.hp,mana:__bw.S.mana,skills:JSON.stringify(__bw.S.sk)}));
  for(let i=0;i<3;i++){
    await query(f,await f.evaluate(()=>__bw.Q.task.sql));stats.queries++;
    await expect(f.locator('#enc')).toContainText('Your query gives the requested result.');
    expect(await f.evaluate(()=>__bw.Q.practiceScore[0])).toBe(i+1);
    if(i<2)await f.locator('#enc [data-a=learnnext]').click();
  }
  await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(9);
  expect(await f.evaluate(()=>Object.keys(__bw.S.techniques.learned))).toEqual(expect.arrayContaining(['swords.cross-cut','fencing.stop-thrust','archery.true-shot','magery.frost-dart']));
  expect(await f.evaluate(()=>({gold:__bw.S.gold,hp:__bw.S.hp,mana:__bw.S.mana,skills:JSON.stringify(__bw.S.sk)}))).toEqual(trainingBefore);
  await screenshot(f,info,'earned-first-techniques');await f.locator('#enc .q-head [data-a=qleave]').click();
  await visit(f,'hallexit',stats);await speech(f);
  await visit(f,'banker',stats,{r:1});await speech(f,'[data-a=bankopen]');{const bankCoach=f.locator('[data-a=coachok]');if(await bankCoach.isVisible())await bankCoach.click();}await f.locator('[data-a=bdep]').click();await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(10);await expect(f.locator('#sheet')).toBeVisible();await f.locator('.sheet-x').click();await speech(f);
  await visit(f,'lookout',stats);await speech(f);await screenshot(f,info,'harbour-tower-and-road');
  if(fish){
    const pier=await f.evaluate(()=>Scene.spots().pierfish);await walk(f,pier,stats,true);await speech(f);
    await expect.poll(()=>f.evaluate(()=>{const e=Scene.guideEnt(),p=Scene.pos();return !!e&&Math.hypot(e.fx-p[0],e.fy-p[1])<4;})).toBe(true);
    await visit(f,'fish',stats,{x:pier[0],y:pier[1]});
    if(await coach.isVisible())await coach.click();await f.locator('[data-a=cast][data-i="0"]').click();
    await query(f,beginnerAnswer(await f.locator('.fi-ask > p:not(.cap2)').innerText()));stats.queries++;
    await expect(f.locator('#enc')).toContainText('A clean cast');await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(12);await f.waitForTimeout(600);
    await expect(f.locator('#say')).toBeHidden();await screenshot(f,info,'guided-first-cast-result');await f.locator('[data-a=fileave]').last().click();await speech(f);
  }else{
    // Fishing is explicitly optional. Follow the offered Skip it choice.
    await visit(f,'guide',stats);await speech(f,'[data-a=gnext]');await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(12);await speech(f);
  }
  await visit(f,'stairs',stats,{r:1});await speech(f,'[data-a=start][data-k=dungeon]');await expect.poll(()=>f.evaluate(()=>!!Scene.inDungeon())).toBe(true);await speech(f);
  await visit(f,'guard',stats,{tutorial:true});await beginnerFight(f,stats);
  await visit(f,'chest',stats,{tutorial:true});await expect(f.locator('#sheet').getByRole('heading',{name:'Starter chest',exact:true})).toBeVisible();await screenshot(f,info,'first-cellar-chest');await f.locator('#sheet button[data-a=closesheet]').last().click();await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(14);
  await visit(f,'dtravel',stats,{to:-1});await speech(f,'[data-a=dtravel]');await speech(f);
  await roadFarewell(f,stats);await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(15);
  await expect(f.locator('#say')).toBeVisible();await expect(f.locator('#say-text')).toContainText('New Reader.');await expect(f.locator('#say-text')).toContainText('Marigold');await screenshot(f,info,'tamsin-farewell-at-the-road');await speech(f);
  expect(await f.evaluate(()=>({tut:__bw.S.tut,practice:!!__bw.S.seen['intro.practice'],bank:__bw.S.bank.gold>0}))).toEqual({tut:3,practice:true,bank:true});
}


module.exports={speech,clickWorld,learnMovement,person,query,visit,beginnerFight,roadFarewell,finishGuidedDay,beginnerAnswer};
