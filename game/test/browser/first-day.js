const {test,expect}=require('@playwright/test');
require('./learning');
require('./learning-boundaries');
const {screenshot,observeErrors}=require('./flow');
const {speech,clickWorld,learnMovement,person,query,visit,beginnerFight,roadFarewell,finishGuidedDay,beginnerAnswer}=require('./first-day-helper');
test('first-day · road farewell completes across actual-distance phases before its inner waypoint',async({page},info)=>{
  const errors=observeErrors(page),evidence=[];
  await page.goto('/__visual?scene=tallyport');await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});
  const f=page.frames().find(f=>f.url().includes('visual_test=1'));
  const ring=await f.evaluate(()=>{
    for(const e of Scene.ents())if(e.wander){e.wander=0;e.tx=null;e.fx=e.x;e.fy=e.y;}
    __bw.S.name='New Reader';
    return Scene.spots().boss1;
  });
  await f.locator('.movement-joystick').evaluate(node=>{
    node.__roadPointers=0;node.addEventListener('pointerdown',e=>{if(e.isTrusted)node.__roadPointers++;});
  });
  for(const phase of [0,.25,.6,.8,.99]){
    const hints=await f.evaluate(({ring,phase})=>{
      __bw.ACT.closesheet();__bw.S.gd=14;__bw.S.tut=2;__bw.S.region=1;
      Scene.hop(ring[0],ring[1]+7);Scene.debug().P.footDistance=phase;
      return __bw.S.hints;
    },{ring,phase});
    await roadFarewell(f,{fixture:false,steps:0,queries:0});
    await expect.poll(()=>f.evaluate(()=>__bw.S.gd)).toBe(15);
    await expect(f.locator('#say')).toBeVisible();
    // Reveal the line using the same tap offered to players. Waiting for its
    // typewriter five times consumed the movement test's unchanged deadline.
    await f.locator('#say-text').click();
    await expect(f.locator('#say-text')).toContainText('New Reader.');
    await expect(f.locator('#say-text')).toContainText('Marigold');
    const state=await f.evaluate(()=>{
      const p=Scene.debug().P;return{gd:__bw.S.gd,tut:__bw.S.tut,hints:__bw.S.hints,at:Scene.pos(),distance:p.wd,phase:p.footDistance};
    });
    expect(state.tut).toBe(3);expect(state.hints).toBe(hints+1);
    expect(Math.hypot(state.at[0]-ring[0],state.at[1]-ring[1])).toBeLessThan(6);
    expect(state.distance).toBeGreaterThan(1);
    evidence.push({initialPhase:phase,...state});
    if(phase===.8)await screenshot(page,info,'farewell-after-fractional-distance-tick');
    await speech(f);
  }
  expect(await f.locator('.movement-joystick').evaluate(node=>node.__roadPointers)).toBeGreaterThanOrEqual(5);
  await info.attach('road-distance-phase-evidence',{body:JSON.stringify(evidence,null,2),contentType:'application/json'});
  expect(errors).toEqual([]);
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
    await expect(f.locator('#enc')).toContainText('First Circle question');const sql=beginnerAnswer(await f.locator('.fi-ask > p:not(.cap2)').innerText());
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
  await f.locator('#sheet summary').filter({hasText:'Ilva’s story'}).click();
  await f.getByRole('heading',{name:'The reopened archive',exact:true}).scrollIntoViewIfNeeded();
  await screenshot(page,info,'journal-'+choice);expect(errors).toEqual([]);
});
