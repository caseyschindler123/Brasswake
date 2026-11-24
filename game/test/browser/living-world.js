const {test,expect}=require('@playwright/test');
const {observeErrors,screenshot}=require('./flow');
async function scene(page,name='tallyport'){
  await page.goto('/__visual?scene='+name);await expect(page.locator('body')).toHaveAttribute('data-ready',name,{timeout:45000});
  const f=page.frames().find(f=>f.url().includes('visual_test=1'));const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();return f;
}
test('living world · cancellation freezes the actual between-tile position without rollback',async({page})=>{
  const errors=observeErrors(page),f=await scene(page);
  await f.evaluate(()=>{for(const e of Scene.ents()){e.wander=0;e.tx=null;e.fx=e.x;e.fy=e.y;}
    const {world:m}=Scene.debug(),[cx,cy]=Scene.towns()[1];
    for(let y=cy-22;y<cy+22;y++)for(let x=cx-28;x<cx+28;x++)if([0,1,2,3].every(d=>m.seen[y*m.w+x+d]&&!m.solid[y*m.w+x+d]&&!m.occ.has(y*m.w+x+d))){Scene.hop(x,y);return;}
    throw Error('No open movement lane');});
  const stick=f.locator('#movement-joystick');await expect(stick).toHaveAttribute('aria-disabled','false');const box=await stick.boundingBox();
  await stick.evaluate(n=>n.addEventListener('pointerdown',e=>n.dataset.pointer=String(e.pointerId),{once:true}));
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.74,box.y+box.height/2);
  const stop=await f.evaluate(()=>new Promise(resolve=>{function sample(){const p=Scene.debug().P;if(Math.abs(p.fx-Math.round(p.fx))>.08){const before=[p.fx,p.fy];const n=document.querySelector('#movement-joystick');n.dispatchEvent(new PointerEvent('pointercancel',{pointerId:+n.dataset.pointer}));resolve({before,after:[p.fx,p.fy],moving:Scene.traveling()});}else requestAnimationFrame(sample);}sample();}));
  await page.mouse.up();expect(stop.after).toEqual(stop.before);expect(stop.moving).toBe(false);await f.waitForTimeout(600);expect(await f.evaluate(()=>{const p=Scene.debug().P;return [p.fx,p.fy];})).toEqual(stop.before);expect(errors).toEqual([]);
});
test('living world · names follow rendered heads and town boundaries update location',async({page},info)=>{
  const errors=observeErrors(page),f=await scene(page);
  const actor=await f.evaluate(()=>{const e=Scene.find(e=>e.npcLook&&e.r===1&&e.kind==='banker');Scene.hop(...Scene.safePosition([e.x,e.y+1],1));return e.name;});
  await f.waitForFunction(name=>!!Scene.find(e=>e.name===name).rendered,actor);
  const bounds=await f.evaluate(name=>{const e=Scene.find(e=>e.name===name);return {x:e.rendered.headX,top:e.rendered.topY,footX:e.fx*16+8,footY:e.fy*16+15};},actor);
  expect(Math.abs(bounds.x-bounds.footX)).toBeLessThan(5);expect(bounds.top).toBeLessThan(bounds.footY-12);
  expect(await f.evaluate(()=>Scene.location().name)).toBe('Tallyport');await screenshot(page,info,'living-town-entrances-and-names');
  await f.evaluate(()=>{const {world:m}=Scene.debug(),[cx,cy]=Scene.towns()[1];for(let d=40;d<100;d++)for(const [x,y]of [[cx+d,cy],[cx-d,cy],[cx,cy-d],[cx,cy+d]])if(!Geography.inTown(x,y)&&m.seen[y*m.w+x]&&!m.solid[y*m.w+x]&&!m.occ.has(y*m.w+x)){Scene.hop(x,y);return;}throw Error('No wilderness landing');});
  expect(await f.evaluate(()=>Scene.location().name)).toBe('Wilderness');expect(errors).toEqual([]);
});
test('living world · entering a business records its matching map symbol across reload',async({page},info)=>{
  const errors=observeErrors(page),f=await scene(page);
  const service=await f.evaluate(()=>{const p=Scene.cartographyCatalogue().find(p=>p.kind==='service'&&p.type==='shop'&&p.r===1),b=p.building;
    if(!p)throw Error('Missing shop service');for(let i=0;i<b.plan.tiles.length;i++){if(b.plan.tiles[i]!==Buildings.FLOOR)continue;const x=b.x+i%b.w,y=b.y+Math.floor(i/b.w);if(!Scene.debug().world.solid[y*Scene.debug().world.w+x]&&!Scene.debug().world.occ.has(y*Scene.debug().world.w+x)){Scene.hop(x,y);return {id:p.id,name:p.name};}}throw Error('No shop interior');});
  await expect.poll(()=>f.evaluate(id=>!!__bw.S.services?.[id],service.id)).toBe(true);
  await f.locator('#nav [data-t=map]').click();await f.locator('[data-a=cmapview][data-mode=town]').click();const marker=f.locator('.cmap-service').filter({has:f.locator('svg')});await expect(marker).not.toHaveCount(0);await screenshot(page,info,'remembered-business-map');
  await f.evaluate(()=>__bw.save());await f.waitForLoadState('networkidle');
  // Leave the visual harness: reloading its iframe would rerun its disposable
  // character setup and race the real save-restoration screen on WebKit.
  await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});await page.locator('[data-a=playslot]').click();
  expect(await page.evaluate(id=>!!__bw.S.services?.[id],service.id)).toBe(true);expect(errors).toEqual([]);
});
test('living world · enhanced dungeon depth remains readable at phone and desktop sizes',async({page},info)=>{
  const errors=observeErrors(page),f=await scene(page,'dungeon');await f.evaluate(()=>Scene.debug().draw());await screenshot(page,info,'living-dungeon-depth');
  expect(await f.evaluate(()=>Scene.debug().map.layout.rooms.length)).toBeGreaterThan(10);
  for(let r=2;r<=8;r++){
    await f.evaluate(r=>Scene.enterDungeon(r,{floor:0,progress:{seen:{},gates:{},claimed:{},kills:{}}}),r);
    await f.waitForTimeout(700);await f.evaluate(()=>Scene.debug().draw());
    await screenshot(page,info,'living-dungeon-theme-'+r);
    expect(await f.evaluate(()=>Scene.debug().map.r)).toBe(r);
  }
  expect(errors).toEqual([]);
});
test('living world · returning to characters retires house placement and dojo keeps the town location',async({page})=>{
  const errors=observeErrors(page),f=await scene(page);
  await f.evaluate(()=>{__bw.S.deeds=[{shape:0,mat:0}];__bw.ACT.placedeed({k:'0'});});
  await expect(f.locator('#placebar')).toBeVisible();expect(await f.evaluate(()=>!!Scene.ghostNow())).toBe(true);
  await f.locator('#nav [data-t=hero]').click();const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();await f.locator('[data-a=reset]').click();
  await expect(f.locator('#placebar')).toHaveCount(0);expect(await f.evaluate(()=>Scene.ghostNow())).toBeNull();
  await f.locator('[data-a=worldpick][data-i="1"]').click();await expect(f.locator('#placebar')).toHaveCount(0);expect(await f.evaluate(()=>Scene.ghostNow())).toBeNull();
  await f.locator('[data-a=worldpick][data-i="0"]').click();await f.locator('[data-a=playslot]').click();
  await f.evaluate(()=>Scene.enterHall(1,[]));expect(await f.evaluate(()=>Scene.location().name)).toBe('Tallyport');expect(errors).toEqual([]);
});
