const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');
const { drivePath } = require('./movement');

async function settlement(page) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});
  const frame = page.frames().find(f=>f.url().includes('visual_test=1'));
  await frame.evaluate(() => {
    Sound.setMu(false);
    for(const actor of Scene.ents())if(actor.wander){
      actor.wander=0;actor.tx=actor.ty=null;actor.fx=actor.x;actor.fy=actor.y;
    }
  });
  return frame;
}

test('settlements · all eight towns connect three independent dealers and an actual stable to their public streets', async ({page}) => {
  const errors=observeErrors(page), frame=await settlement(page);
  const facts = await frame.evaluate(() => {
    const {world:m}=Scene.debug(), {navigator,named,destinations}=m.cartography;
    const steps=[[0,1],[1,0],[0,-1],[-1,0]], result=[];
    for(let r=1;r<=8;r++){
      const town=named.get('town'+r).at;
      for(const type of ['casino','stable']){
        const service=destinations.find(p=>p.r===r&&p.type===type);
        if(!service){result.push({r,type,missing:true});continue;}
        const b=service.building, d=service.door;
        const roles=m.ents.filter(e=>e.venueId===b.plan.id&&(e.kind==='casino'||e.kind==='stablekeep'));
        const entry=[b.x+d.outside.x,b.y+d.outside.y];
        const facts=roles.map(e=>{
          const approaches=steps.map(([dx,dy])=>[e.x+dx,e.y+dy]);
          const closed=approaches.filter(([x,y])=>!navigator.route(entry,[x,y],[])?.path.length);
          return {key:e.station||e.kind,reachable:closed.length<approaches.length,occupies:m.occ.get(e.y*m.w+e.x)===e};
        });
        const [cx,cy]=Scene.towns()[r];
        result.push({r,type,street:!!navigator.route(town,entry,[]),
          joins:!!b.street.joins, roles:facts, seats:m.ents.filter(e=>e.venueId===b.plan.id&&e.venueSeated).length,
          doors:b.plan.doors.length,w:b.w,h:b.h,legacyId:type==='casino'&&service.id===`service:${r}:casino:${cx+3}:${cy-10}`});
      }
    }
    return result;
  });
  expect(facts).toHaveLength(16);
  for (const f of facts) {
    expect(f,`region ${f.r} ${f.type}`).toMatchObject({street:true,joins:true,doors:1});
    const expected=f.type==='casino'?['blackjack','poker','wheel']:['stablekeep'];
    expect(f.roles.map(e=>e.key).sort()).toEqual(expected);
    expect(f.roles.every(e=>e.reachable&&e.occupies)).toBe(true);
    if(f.type==='casino')expect(f).toMatchObject({seats:5,w:14,h:10,legacyId:true});
  }
  expect(errors).toEqual([]);
});

test('settlements · a street sign identifies its games and a player walks to each table', async ({page}, info) => {
  test.setTimeout(110000);
  const errors=observeErrors(page), frame=await settlement(page);
  const {door,entry}=await frame.evaluate(()=>{
    const p=Scene.debug().world.cartography.destinations.find(p=>p.r===1&&p.type==='casino');
    const {building:b,door:d}=p;
    const entry=[b.x+d.outside.x,b.y+d.outside.y];
    Scene.hop(entry[0],entry[1]+2);
    return {entry,door:[b.x+d.x,b.y+d.y]};
  });
  await frame.waitForFunction(()=>!Scene.debug().map.pending);
  await frame.waitForTimeout(3400); // The area banner briefly covers the sign.
  const sign=await frame.evaluate(([x,y])=>{
    const {cam,zoom}=Scene.debug();
    return {x:(x*16+29-cam.x)*zoom,y:(y*16+6-cam.y)*zoom};
  },door);
  const canvas=frame.locator('#stage canvas.over'), sheet=frame.locator('#sheet');
  await screenshot(page,info,'settlement-card-room-frontage');
  await canvas.click({position:sign});
  await expect(sheet).toContainText('Harbour Card Room');
  for(const label of ['Poker','Blackjack','Wheel'])await expect(sheet).toContainText(label);
  await expect(sheet.locator('[data-a=pkrules], [data-a=bjopen], [data-a=whopen]')).toHaveCount(0);
  // The player tap guard ignores the synthetic follow-up click after a canvas press.
  await frame.waitForTimeout(500);
  await sheet.getByRole('button',{name:'Done'}).click();
  await expect(sheet).toBeHidden();
  await drivePath(frame,[[entry[0],entry[1]+1],entry,door,[door[0],door[1]-1]],false);
  await frame.waitForFunction(()=>Scene.debug().world.blds.some(b=>b.r===1&&b.slot==='casino'&&b.inside&&b.fa===0));
  await screenshot(page,info,'settlement-card-room-interior');
  for (const [station,name] of [['poker','Blind Tally'],['blackjack','The Count'],['wheel','The Crooked Wheel']]) {
    const a=await frame.evaluate(station=>{
      const {map:m}=Scene.debug(), e=m.ents.find(e=>e.r===1&&e.station===station);
      const paths=[[0,1],[1,0],[0,-1],[-1,0]].map(([dx,dy])=>
        m.cartography.navigator.route(Scene.pos(),[e.x+dx,e.y+dy],[])?.path).filter(Boolean);
      paths.sort((a,b)=>a.length-b.length);
      return {path:paths[0],xy:[e.x,e.y]};
    },station);
    await drivePath(frame,a.path,false);
    const point=await frame.evaluate(([x,y])=>{
      const {cam,zoom}=Scene.debug();
      if(Math.abs(Scene.pos()[0]-x)+Math.abs(Scene.pos()[1]-y)!==1)throw Error('Dealer is out of reach');
      return {x:(x*16+8-cam.x)*zoom,y:(y*16+4-cam.y)*zoom};
    },a.xy);
    await canvas.click({position:point});
    await frame.waitForTimeout(500);
    if(station==='poker') {
      await expect(sheet).toContainText(name);
      await expect(sheet.locator('[data-a=pkrules]')).toBeVisible();
      await expect(sheet.locator('[data-a=bjopen], [data-a=whopen]')).toHaveCount(0);
      await sheet.getByRole('button',{name:'Close',exact:true}).click();
      await expect(sheet).toBeHidden();
    } else {
      const encounter=frame.locator('#enc');
      await expect(encounter).toContainText(name);
      const coach=frame.locator('[data-a=coachok]');
      if(await coach.isVisible()){await coach.click();await expect(coach).toBeHidden();}
      await encounter.locator('[data-a=houseleave]').click();
      await expect(encounter).toBeHidden();
    }
  }
  await frame.evaluate(()=>{
    const p=Scene.debug().world.cartography.destinations.find(p=>p.r===1&&p.type==='stable');
    Scene.hop(p.building.x+p.door.inside.x,p.building.y+p.door.inside.y);
  });
  await frame.waitForFunction(()=>MountView.standing(1)&&Scene.debug().world.blds.some(b=>b.r===1&&b.stalls&&b.inside&&b.fa===0));
  await expect.poll(()=>frame.evaluate(()=>Scene.location().name)).toBe('Tallyport');
  await frame.waitForTimeout(3400);
  await screenshot(page,info,'settlement-working-stable');
  await frame.evaluate(()=>{
    const [x,y]=Scene.towns()[1];Scene.hop(...Scene.safePosition([x-7,y+5],1));
  });
  await frame.waitForFunction(()=>!Scene.debug().map.pending);
  await frame.waitForTimeout(3400);
  await screenshot(page,info,'settlement-paving-and-earth');
  expect(errors).toEqual([]);
});
