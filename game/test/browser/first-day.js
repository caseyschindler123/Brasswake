const {test,expect}=require('@playwright/test');
const {screenshot,observeErrors}=require('./flow');
const {walk}=require('./dungeons');

async function speech(f, action) {
  for(let i=0;i<12;i++){
    if(action&&await f.locator(action).isVisible()){await f.locator(action).click();return;}
    const bye=f.locator('#say [data-a=closesheet]');
    if(!action&&await bye.isVisible()){await bye.click();return;}
    if(!await f.locator('#say-text').isVisible())return;
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
      const {map:m,P,cam,zoom}=Scene.debug(),box=document.querySelector('#stage').getBoundingClientRect(),start=P.y*m.w+P.x,q=[start],seen=new Set(q),want=gd===0?2.5:6.1;
      for(let i=0;i<q.length&&i<1200;i++){
        const k=q[i],x=k%m.w,y=Math.floor(k/m.w),d=Math.hypot(x-P.x,y-P.y),sx=(x*16+8-cam.x)*zoom,sy=(y*16+8-cam.y)*zoom;
        if(d>=want&&sx>28&&sx<box.width-28&&sy>115&&sy<box.height-70&&!m.ents.some(e=>!e.hidden&&Math.hypot(e.fx+.5-(x+.5),e.fy+.2-(y+.5))<1.12))return {at:[x,y],from:[P.x,P.y]};
        for(const [dx,dy]of[[1,0],[-1,0],[0,-1],[0,1]]){const X=x+dx,Y=y+dy,n=Y*m.w+X;if(X<0||Y<0||X>=m.w||Y>=m.h||seen.has(n)||m.solid[n]||m.occ.has(n)||m.t[n]===4)continue;seen.add(n);q.push(n);}
      }
      throw Error('No visible ground for the walking/running lesson');
    });
    if(step.done)return;
    await clickWorld(f,step.at);await f.waitForFunction(()=>!Scene.traveling(),null,{timeout:12000});
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

for (const [path,look] of [['warrior',0],['thief',2],['mage',4],['crafter',6]]) test('a new player meets Tamsin, walks to Odalys, reads the manifest and learns an ability without skipping · '+path,async({page},info)=>{
  test.setTimeout(300000);const errors=observeErrors(page),stats={fixture:false,steps:0,queries:0};
  await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=newslot]').first().click();await page.locator(`[data-a=pick][data-look="${look}"]`).click();await page.locator('#cr-name').fill('New Reader');await page.locator('[data-a=begin]').click();
  await expect(page.locator('.tt-story')).toContainText('Tamsin');await screenshot(page,info,'rescue-introduction');
  await page.locator('[data-a=beat]').click();await page.locator('[data-a=beat]').click();await page.locator('[data-a=ashore]').click();await page.waitForTimeout(500);await speech(page);await learnMovement(page,stats);
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
  await f.locator('[data-a=sbeat]').click();await f.locator(`[data-a=${choice}]`).click();await expect(f.locator('.tt-story')).toContainText(choice==='stay'?'staying':'shore of your own world');expect(await f.evaluate(()=>__bw.S.ending)).toBe(choice==='stay'?'stay':'home');await screenshot(page,info,'ending-'+choice);
  while(await f.locator('[data-a=sbeat]').isVisible())await f.locator('[data-a=sbeat]').click();
  await f.locator('#nav [data-t=world]').click();const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
  await f.locator('[data-a=journal]').click();await expect(f.locator('#sheet')).toContainText('The reopened archive');expect(errors).toEqual([]);
});
