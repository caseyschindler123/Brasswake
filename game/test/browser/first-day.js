const {test,expect}=require('@playwright/test');
const {screenshot,observeErrors}=require('./flow');
const {walk}=require('./dungeons');
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
  const e=await f.evaluate(({kind,extra})=>{const p=Scene.pos(),a=Scene.ents().filter(e=>e.kind===kind&&!e.dead&&!e.dying&&!e.hidden&&!(kind==='mon'&&e.inst.elite)&&Object.entries(extra).every(([k,v])=>e[k]===v));a.sort((a,b)=>Math.hypot(a.x-p[0],a.y-p[1])-Math.hypot(b.x-p[0],b.y-p[1]));if(!a.length)throw Error('Missing '+kind);return {at:[a[0].x,a[0].y],name:a[0].name};},{kind,extra});
  await walk(f,e.at,stats,true);await speech(f);await f.waitForTimeout(500);if(kind==='guide'&&await f.locator('#say').isVisible())return;await speech(f);
  if(await f.locator('#ctx').isVisible()&&(await f.locator('#ctx').innerText()).includes(e.name))await f.locator('#ctx').click();else await clickWorld(f,e.at);
  await f.waitForTimeout(500);
  if(kind==='guide'){if(await f.locator('#say').isVisible())return;continue;}
  if(!['mon','guard'].includes(kind)||await f.locator('#fight').isVisible())return;
  }
  throw Error('Could not approach and engage '+kind);
}
function beginnerAnswer(ask){
  const all=ask.match(/Show everything in the (\w+) table/);if(all)return 'SELECT * FROM '+all[1];
  const pick=ask.match(/Show the (.+?) of every (\w+)\./);if(!pick)throw Error('Unexpected untaught first-day query: '+ask);
  return 'SELECT '+pick[1].replace(/ and the /g,', ')+' FROM '+({vendor:'vendors',item:'items',customer:'customers',employee:'employees'}[pick[2]]);
}
async function beginnerFight(f,stats){
  for(let n=0;n<30;n++){
    const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
    if(await f.locator('[data-a=floot]').isVisible())break;
    const choose=f.locator('[data-a=fchoose]');if(await choose.isVisible())await choose.click();
    const heal=f.locator('#fight [data-a=tonic]');if(await heal.isVisible())await heal.click();
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
async function finishGuidedDay(f,info,stats,fish=false){
  await f.locator('[data-a=qleave]').last().click();await speech(f);await visit(f,'hallexit',stats);await speech(f);
  await visit(f,'mon',stats,{r:1});await beginnerFight(f,stats);await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(6);
  await speech(f);await f.locator('#nav [data-t=bag]').click();
  const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
  const gift=await f.evaluate(()=>__bw.S.gk);await f.locator(`[data-a=item][data-id="${gift}"]`).click();await f.locator('[data-a=equip]').click();await speech(f);
  await f.locator('#nav [data-t=hero]').click();if(await coach.isVisible())await coach.click();await expect(f.locator('#doll')).toBeVisible();await expect(f.getByRole('heading',{name:'New arrival',exact:true})).toBeVisible();await screenshot(f,info,'equipped-weapon-after-first-fight');await f.locator('#nav [data-t=world]').click();
  await visit(f,'stallkeep',stats,{r:1});await f.locator('#sheet [data-a=sellcommon]').click();await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(8);await speech(f);
  await visit(f,'npc',stats,{r:1,i:0});await speech(f,'#say [data-a=pages]');if(await coach.isVisible())await coach.click();await f.locator('[data-a=buypage]:not([disabled])').first().click();await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(9);await f.locator('.sheet-x').click();await speech(f);
  await visit(f,'banker',stats,{r:1});await speech(f,'[data-a=bankopen]');await f.locator('[data-a=bdep]').click();await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(10);await speech(f);
  await visit(f,'lookout',stats);await speech(f);await screenshot(f,info,'harbour-tower-and-road');
  if(fish){
    const pier=await f.evaluate(()=>Scene.spots().pierfish);await walk(f,pier,stats,true);await speech(f);
    await expect.poll(()=>f.evaluate(()=>{const e=Scene.guideEnt(),p=Scene.pos();return !!e&&Math.hypot(e.fx-p[0],e.fy-p[1])<4;})).toBe(true);
    await visit(f,'fish',stats,{x:pier[0],y:pier[1]});
    if(await coach.isVisible())await coach.click();await f.locator('[data-a=cast][data-i="0"]').click();
    await query(f,beginnerAnswer(await f.locator('.fi-ask p').first().innerText()));stats.queries++;
    await expect(f.locator('#enc')).toContainText('A clean cast');await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(12);await f.waitForTimeout(600);
    await expect(f.locator('#say')).toBeHidden();await screenshot(f,info,'guided-first-cast-result');await f.locator('[data-a=fileave]').last().click();await speech(f);
  }else{
    // Fishing is explicitly optional. Follow the offered Skip it choice.
    await visit(f,'guide',stats);await speech(f,'[data-a=gnext]');await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(12);await speech(f);
  }
  await visit(f,'stairs',stats,{r:1});await speech(f,'[data-a=start][data-k=dungeon]');await expect.poll(()=>f.evaluate(()=>!!Scene.inDungeon())).toBe(true);await speech(f);
  await visit(f,'guard',stats,{tutorial:true});await beginnerFight(f,stats);
  await visit(f,'chest',stats,{tutorial:true});await expect(f.locator('#sheet')).toContainText('vault chest');await screenshot(f,info,'first-cellar-chest');await f.locator('#sheet button[data-a=closesheet]').last().click();await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(14);
  await visit(f,'dtravel',stats,{to:-1});await speech(f,'[data-a=dtravel]');await speech(f);
  const ring=await f.evaluate(()=>Scene.spots().boss1);stats.stopWhenGuideEnds=true;await walk(f,[ring[0],ring[1]+5],stats,false);delete stats.stopWhenGuideEnds;await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(15);
  await expect(f.locator('#say')).toBeVisible();await expect(f.locator('#say-text')).toContainText('New Reader.');await expect(f.locator('#say-text')).toContainText('Marigold');await screenshot(f,info,'tamsin-farewell-at-the-road');await speech(f);
  expect(await f.evaluate(()=>({tut:__bw.S.tut,practice:!!__bw.S.seen['intro.practice'],bank:__bw.S.bank.gold>0}))).toEqual({tut:3,practice:true,bank:true});
}

for (const [path,look] of [['warrior',0],['thief',2],['mage',4],['crafter',6]]) test('a new player meets Tamsin, learns SQL and completes the guided day without skipping · '+path,async({page},info)=>{
  test.setTimeout(750000);const errors=observeErrors(page),stats={fixture:false,steps:0,queries:0,solveVisibleFight:beginnerFight};
  await page.waitForLoadState('networkidle');
  await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=newslot]').first().click();await page.locator(`[data-a=pick][data-look="${look}"]`).click();await page.locator('[data-a=begin]').click();
  await require('./intro-helper').fullArrival(page,info,screenshot);await expect(page.locator('[data-a=conceal]')).toHaveCount(0);await page.waitForTimeout(500);await speech(page);await learnMovement(page,stats);
  await person(page,'folk',stats);if(await page.evaluate(()=>__bw.S.gd<3)){await speech(page);await person(page,'folk',stats);}await expect.poll(()=>page.evaluate(()=>__bw.S.gd)).toBe(3);await speech(page);await page.waitForTimeout(500);await speech(page);
  await person(page,'dojo',stats);await expect.poll(()=>page.evaluate(()=>Scene.inHall())).toBe(1);
  await person(page,'odalys',stats);await speech(page,'[data-a=start][data-k=intro]');
  await expect(page.locator('#enc')).toContainText('practice copy');await page.locator('[data-s=irow]').click();
  await page.locator('[data-kind=row][data-v="1"]').click();await expect(page.locator('[data-s=icol]')).toBeDisabled();
  await page.locator('[data-kind=row][data-v="0"]').click();await page.locator('[data-s=icol]').click();
  await page.locator('[data-kind=column][data-v=destination]').click();await page.locator('[data-s=i2]').click();await screenshot(page,info,'query-source-and-result');
  await page.locator('[data-s=ipredict]').click();await page.locator('[data-kind=result][data-v=names]').click();await page.locator('[data-s=i3]').click();
  await page.locator('[data-a=blank][data-w=destination]').click();await page.locator('[data-a=blank][data-w=manifest]').click();await page.locator('[data-a=blankrun]').click();await page.locator('[data-s=reps]').click();
  const gold=await page.evaluate(()=>__bw.S.gold);
  await query(page,'SELECT quantity FROM manifest');await expect(page.locator('#q-out')).toContainText('Not yet');expect(await page.evaluate(()=>__bw.S.gold)).toBe(gold);
  for(const sql of ['select name from manifest','SELECT destination FROM manifest','SELECT name, quantity FROM manifest','SELECT * FROM manifest','SELECT name FROM items','SELECT name, city FROM customers']){
    await query(page,sql);stats.queries++;const next=page.locator('[data-a=introcontinue]');if(await next.isVisible())await next.click();
  }
  await expect(page.locator('#enc .reward-gold')).toContainText('+25 gold');expect(await page.evaluate(before=>__bw.S.gold-before,gold)).toBe(25);await screenshot(page,info,'first-lesson-gold-pile');
  await page.locator('[data-a=qleave]').last().click();await speech(page,'[data-a=intropractice]');await page.locator('[data-a=practicepage]').first().click();await query(page,'SELECT name FROM items');
  await expect(page.locator('#enc')).toContainText('Your first ability');expect(await page.evaluate(()=>!!__bw.S.seen['intro.practice'])).toBe(true);await screenshot(page,info,'safe-first-ability');
  await finishGuidedDay(page,info,stats,path==='mage');
  expect(stats.steps).toBeGreaterThan(10);expect(errors).toEqual([]);
});

test('supplies explain full health, consume once, and restore the actual amount',async({page},info)=>{
  const errors=observeErrors(page);await page.goto('/__visual?scene=bag');await expect(page.locator('body')).toHaveAttribute('data-ready','bag',{timeout:45000});const f=page.frames().find(f=>f.url().includes('visual_test=1'));
  const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
  await f.evaluate(()=>{__bw.S.food.loaf=2;__bw.S.tonics=2;__bw.render();});
  const contrast=await f.locator('.supply').first().evaluate(el=>{const lum=c=>{const v=c.match(/[0-9.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};const bg=lum(getComputedStyle(el).backgroundColor);return [...el.querySelectorAll('b,small')].map(n=>{const fg=lum(getComputedStyle(n).color);return (Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05);});});for(const ratio of contrast)expect(ratio).toBeGreaterThanOrEqual(4.5);await screenshot(page,info,'readable-supply-list');
  await f.locator('[data-a=supply][data-k=loaf]').click();await expect(f.locator('#sheet')).toContainText('Health is full');await expect(f.locator('#sheet [data-a=eat]')).toBeDisabled();await screenshot(page,info,'bread-full-health-explanation');
  await f.locator('.sheet-x').click();const hp=await f.evaluate(()=>{__bw.S.hp-=5;return __bw.S.hp;});
  await f.locator('[data-a=supply][data-k=loaf]').click();await f.locator('#sheet [data-a=eat]').click();expect(await f.evaluate(()=>({hp:__bw.S.hp,n:__bw.S.food.loaf}))).toEqual({hp:hp+5,n:1});
  const before=await f.evaluate(()=>{__bw.S.hp-=35;return __bw.S.hp;});await f.locator('[data-a=supply][data-k=tonic]').click();await f.locator('#sheet [data-a=tonic]').click();expect(await f.evaluate(()=>({hp:__bw.S.hp,n:__bw.S.tonics}))).toEqual({hp:before+30,n:1});
  expect(errors).toEqual([]);
});

test('guided fishing keeps every cast within taught SQL and leaves results uninterrupted',async({page},info)=>{
  const errors=observeErrors(page);await page.goto('/__visual?scene=tallyport');await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});const f=page.frames().find(f=>f.url().includes('visual_test=1'));
  // Prepared edge state tests all cast choices separately from the earned guided days above.
  await f.evaluate(()=>{__bw.ACT.closesheet();__bw.S.gd=11;__bw.S.tut=2;const p=Scene.spots().pierfish;Scene.guideOff();Scene.load([p[0],p[1]-1],1);__bw.render();});
  const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
  for(let i=0;i<3;i++){
    await f.evaluate(()=>__bw.HOST.interact(Scene.find(e=>e.kind==='fish'&&e.fid==='f1-pier')));if(await coach.isVisible())await coach.click();
    await expect(f.locator('#sheet')).not.toContainText('Try a harder query');await f.locator(`[data-a=cast][data-i="${i}"]`).click();
    await expect(f.locator('#enc')).toContainText('First Circle question');const sql=beginnerAnswer(await f.locator('.fi-ask p').first().innerText());
    if(i<2){await f.locator('[data-a=fileave]').last().click();continue;}
    await query(f,sql);await expect(f.locator('#enc')).toContainText('A clean cast');await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(12);await f.waitForTimeout(600);
    await expect(f.locator('#say')).toBeHidden();await screenshot(page,info,'guided-deep-cast-results');await f.locator('[data-a=fileave]').last().click();
  }
  expect(errors).toEqual([]);
});

test('unfinished safe practice survives dojo reentry and slot reload without losing Tamsin',async({page})=>{
  const errors=observeErrors(page);await page.goto('/__visual?scene=tallyport');await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});const f=page.frames().find(f=>f.url().includes('visual_test=1'));
  await f.evaluate(()=>{__bw.ACT.closesheet();__bw.S.pos=Scene.pos().slice();__bw.S.gd=3;__bw.S.tut=1;__bw.S.seen['intro.assembled']=1;__bw.S.met['1.0']=1;__bw.save();__bw.render();});
  const outside=await f.evaluate(()=>__bw.S.pos.slice());
  await f.evaluate(()=>__bw.HOST.interact(Scene.find(e=>e.kind==='dojo'&&e.r===1)));
  expect(await f.evaluate(()=>!!Scene.find(e=>e.kind==='odalys'))).toBe(true);
  await f.locator('body').press('ArrowUp',{delay:80});expect(await f.evaluate(()=>__bw.S.pos)).toEqual(outside);
  await f.evaluate(()=>__bw.SH.hallexit());
  await f.evaluate(()=>__bw.HOST.interact(Scene.find(e=>e.kind==='dojo'&&e.r===1)));
  await f.evaluate(()=>__bw.HOST.interact(Scene.find(e=>e.kind==='odalys')));await speech(f,'[data-a=intropractice]');
  await f.locator('[data-a=practicepage]').first().click();await query(f,'SELECT name FROM items');await expect(f.locator('#enc')).toContainText('Your first ability');
  // A queued RAF can carry a timestamp just before resume's performance.now().
  // Force that ordering once while the practice swing is paused.
  await f.evaluate(()=>{const raf=window.requestAnimationFrame;window.requestAnimationFrame=cb=>{window.requestAnimationFrame=raf;return raf.call(window,t=>cb(t-1000));};});
  await f.locator('[data-a=qleave]').last().click();await f.waitForTimeout(80);await f.evaluate(()=>__bw.SH.hallexit());
  await f.evaluate(()=>{__bw.save();__bw.ACT.reset();});
  await f.locator('[data-a=newslot]').first().click();await f.locator('[data-a=pick][data-look="0"]').click();await f.locator('[data-a=begin]').click();expect(await f.evaluate(()=>!!Scene.guideEnt())).toBe(false);await f.evaluate(()=>__bw.ACT.reset());await f.locator('[data-a=playslot][data-i="0"]').click();
  expect(await f.evaluate(()=>!!Scene.guideEnt())).toBe(true);expect(await f.evaluate(()=>!!__bw.S.seen['intro.practice'])).toBe(true);
  expect(errors).toEqual([]);
});

test('repeat lesson rewards stay unpaid and gold result matches the credited bonus',async({page},info)=>{
  const errors=observeErrors(page);await page.goto('/__visual?scene=tallyport');await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});const f=page.frames().find(f=>f.url().includes('visual_test=1'));
  const before=await f.evaluate(()=>{__bw.ACT.closesheet();__bw.S.inv.push({id:'reward-ring',name:'Test ring',slot:'ring',rarity:'rare',tier:1,stats:{gold:20}});__bw.S.eq.ring='reward-ring';delete __bw.S.done.c103;delete __bw.A.paid.c103;__bw.START.contract({id:'c103'});return __bw.S.gold;});
  if(await f.locator('[data-a=qturn]').isVisible())await f.locator('[data-a=qturn]').click();
  await query(f,'SELECT name, unit_price FROM items ORDER BY unit_price DESC');
  await expect(f.locator('#enc .reward-gold')).toContainText('+36 gold');expect(await f.evaluate(()=>__bw.S.gold)-before).toBe(36);await screenshot(page,info,'contract-gold-bonus');
  await f.locator('[data-a=qleave]').last().click();await f.evaluate(()=>__bw.START.contract({id:'c103'}));await query(f,'SELECT name, unit_price FROM items ORDER BY unit_price DESC');await expect(f.locator('#enc .reward-gold')).toHaveCount(0);expect(await f.evaluate(()=>__bw.S.gold)-before).toBe(36);
  expect(errors).toEqual([]);
});

for(const choice of ['stay','gohome']) test('the recovered history leads to the '+choice+' ending with a consistent rescue date',async({page},info)=>{
  const errors=observeErrors(page);await page.goto('/__visual?scene=tallyport');await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});const f=page.frames().find(f=>f.url().includes('visual_test=1'));
  // Prepared story state verifies the actual query and ending delivery, not an expedition.
  await f.evaluate(()=>{__bw.ACT.closesheet();__bw.S.letter=1;__bw.S.archive=1;__bw.S.tabs={0:1,1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1};__bw.S.jr[8]=1;__bw.S.boss={1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1};__bw.ACT.truth({id:'t12'});});
  await query(f,"SELECT x.name, MIN(l.seen_on) AS door FROM (SELECT name, found_on FROM strangers UNION ALL SELECT old_name, old_date FROM erasures WHERE table_name = 'strangers') x JOIN lights l ON l.sea = 'Brass Sea' AND l.seen_on > x.found_on GROUP BY x.name, x.found_on ORDER BY x.found_on");
  await expect(f.locator('#enc')).toContainText('That is the Truth');await f.locator('[data-a=trclose]').last().click();
  await expect(f.locator('.tt-story')).toContainText('2026-07-24');await expect(f.locator('.tt-story')).toContainText('forty days');await screenshot(page,info,'light-after-rescue');
  await f.locator('[data-a=sbeat]').click();await f.locator(`[data-a=${choice}]`).click();await expect(f.locator('.tt-story')).toContainText(choice==='stay'?'staying':'shore of your homeland');expect(await f.evaluate(()=>__bw.S.ending)).toBe(choice==='stay'?'stay':'home');await screenshot(page,info,'ending-'+choice);
  while(await f.locator('[data-a=sbeat]').isVisible())await f.locator('[data-a=sbeat]').click();
  await expect(f.locator('#title')).toBeHidden();
  await f.locator('#nav [data-t=world]').click();const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
  await expect(f.getByRole('group',{name:'Movement joystick'})).toHaveAttribute('aria-disabled','false');
  // A new action follows the story transition, rather than its protected
  // synthetic click. The existing touch-redraw guard lasts 450 milliseconds.
  await f.waitForTimeout(500);
  const journal=f.locator('[data-a=journal]');
  if(info.project.use.hasTouch)await journal.tap();else await journal.click();
  await expect(f.locator('#sheet')).toBeVisible();
  await expect(f.locator('#sheet')).toContainText('The reopened archive');
  await f.getByRole('heading',{name:'The reopened archive',exact:true}).scrollIntoViewIfNeeded();
  await screenshot(page,info,'journal-'+choice);expect(errors).toEqual([]);
});
