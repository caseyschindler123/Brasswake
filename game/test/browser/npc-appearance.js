const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');

async function scene(page, name) {
  await page.goto('/__visual?scene=' + name);
  await expect(page.locator('body')).toHaveAttribute('data-ready', name, { timeout: 45000 });
  return page.frames().find(frame => frame.url().includes('visual_test=1'));
}

test('directional NPCs walk, differ in appearance, and turn to the player', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await scene(page, 'tallyport');
  const town = await frame.evaluate(() => {
    const rival = Scene.find(e => e.kind === 'rival' && e.r === 1);
    Scene.hop(...Scene.safePosition([rival.x - 4, rival.y + 1], 1));
    return { name: rival.name, position: [rival.fx, rival.fy] };
  });
  await frame.waitForFunction(({ name, position }) => {
    const rival = Scene.find(e => e.name === name);
    return rival.tx != null && rival.walk > 1 &&
      Math.hypot(rival.fx - position[0], rival.fy - position[1]) > .1;
  }, town);
  const motion = await frame.evaluate(async name => {
    const e = Scene.find(e => e.name === name), { npcPose } = Scene.debug();
    const steps = await new Promise(resolve => {
      const samples = [];
      const start = performance.now();
      function sample() {
        if (e.tx != null) samples.push([e.fx, e.fy, npcPose(e).frame]);
        if (performance.now() - start > 8500 || new Set(samples.map(s => s[2])).size >= 3) resolve(samples);
        else requestAnimationFrame(sample);
      }
      sample();
    });
    return { positions: new Set(steps.map(s => s.slice(0, 2).join(','))).size, frames: new Set(steps.map(s => s[2])).size };
  }, town.name);
  expect(motion.positions).toBeGreaterThan(2);
  expect(motion.frames).toBeGreaterThanOrEqual(3);

  await frame.waitForFunction(() => {
    const { npcFrame } = Scene.debug(), odalys = Scene.find(e => e.kind === 'npc' && e.r === 1 && e.i === 0);
    const guide = Scene.guideEnt() || Scene.guidePut(odalys.x, odalys.y + 2);
    const initial = { row: 0, source: 0, frame: 2 };
    return !!npcFrame(odalys.npcLook, initial) && !!npcFrame(guide.npcLook, initial);
  });
  const sprites = await frame.evaluate(() => {
    const { npcPose, npcFrame, npcCache } = Scene.debug();
    const actor = Scene.find(e => e.kind === 'npc' && e.r === 1 && e.i === 0);
    const guide = Scene.guideEnt(), look = actor.npcLook;
    const vectors = [[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]];
    const sheet = document.createElement('canvas');
    sheet.width = 320; sheet.height = 256;
    sheet.style.cssText = 'position:fixed;z-index:999;top:48%;left:50%;transform:translate(-50%,-50%);background:#485362;border:2px solid #b5ad98;';
    const strip = sheet.getContext('2d'), views = [], frames = [];
    strip.fillStyle = '#f0e8d8'; strip.font = '14px sans-serif'; strip.fillText('Odalys Brine', 12, 21);
    for (const [dx, dy] of vectors) {
      const pose = npcPose({ ...actor, fx: 0, fy: 0, tx: dx, ty: dy, walk: 2 });
      const source = npcFrame(look, pose);
      const display = document.createElement('canvas');
      display.width = display.height = 80;
      const ctx = display.getContext('2d');
      if (pose.flip) { ctx.translate(80, 0); ctx.scale(-1, 1); }
      ctx.drawImage(source, 0, 0);
      views.push(display.toDataURL());
      frames.push(pose);
      strip.drawImage(display, (pose.direction % 4) * 80, 24 + (pose.direction >> 2) * 72);
    }
    const south = frames[0], base = npcFrame(look, south);
    const pixelDiff = (image, x, y, w, h) => {
      const a = base.getContext('2d').getImageData(x, y, w, h).data;
      const b = image.getContext('2d').getImageData(x, y, w, h).data;
      return a.reduce((n, value, i) => n + Math.abs(value - b[i]), 0);
    };
    const tone = npcFrame({ ...look, skin: 4, key: 'tone-sample' }, south);
    const cloth = npcFrame({ ...look, cloth: '#5592ba', key: 'cloth-sample' }, south);
    const walkFrames = Array.from({ length: 8 }, (_, frame) => npcFrame(look, { ...south, frame }).toDataURL());
    strip.drawImage(base, 0, 174); strip.drawImage(tone, 80, 174); strip.drawImage(cloth, 160, 174);
    strip.drawImage(npcFrame(guide.npcLook, south), 240, 174);
    const skinDelta = pixelDiff(tone, 35, 15, 10, 11), clothDelta = pixelDiff(cloth, 25, 26, 30, 24);
    const bootDelta = pixelDiff(tone, 22, 62, 34, 15);
    for (let i = 0; i < 180; i++) npcFrame({ ...look, key: 'eviction-sample-' + i }, south);
    document.body.append(sheet);
    sheet.id = 'npc-visual-evidence';
    return { directions: frames.map(f => f.direction), painted: new Set(views).size,
      walking: new Set(walkFrames).size, skinDelta, clothDelta, bootDelta, cache: npcCache(),
      guideName: guide.name, guideLook: guide.npcLook, odalys: look };
  });
  expect(sprites.directions).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(sprites.painted).toBe(8);
  expect(sprites.walking).toBeGreaterThan(5);
  expect(sprites.skinDelta).toBeGreaterThan(500);
  expect(sprites.clothDelta).toBeGreaterThan(1000);
  expect(sprites.bootDelta).toBe(0);
  expect(sprites.cache.frames).toBe(sprites.cache.limit);
  expect(sprites.guideName).toBe('Tamsin');
  expect(sprites.guideLook).not.toEqual(sprites.odalys);
  await screenshot(page, info, 'npc-directions-and-materials');
  await frame.evaluate(() => { document.querySelector('#npc-visual-evidence').remove(); Scene.guideOff(); });

  const staff = await frame.evaluate(() => {
    const e = Scene.find(a => a.kind === 'npc' && a.r === 1 && a.i === 0), { map, npcPose } = Scene.debug();
    const initial = npcPose(e).direction;
    const approach = [[1, 0], [-1, 0], [0, -1]].find(([dx, dy]) => {
      const index = (e.x + dx) + (e.y + dy) * map.w;
      return map.t[index] !== 4 && !map.solid[index] && !map.occ.has(index);
    });
    if (!approach) throw Error('No open direction beside ' + e.name);
    const [dx, dy] = approach;
    Scene.hop(e.x + dx, e.y + dy);
    return { initial, expected: NpcAppearance.direction(dx, dy), name: e.name };
  });
  expect(staff.initial).not.toBe(staff.expected);
  await expect(frame.locator('#ctx')).toContainText(staff.name);
  await frame.waitForTimeout(650); // Let the scene transition clear for the screenshot.
  await screenshot(page, info, 'npc-facing-town');
  await frame.locator('#ctx').click();
  await expect(frame.locator('#say')).toContainText(staff.name);
  expect(await frame.evaluate(name => Scene.debug().npcPose(Scene.find(e => e.name === name)).direction, staff.name))
    .toBe(staff.expected);
  expect(errors).toEqual([]);
});

test('dojo fighters reuse their walking outfits while sparring', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await scene(page, 'dojo');
  await frame.waitForFunction(() => {
    const students = Scene.ents().filter(e => e.kind === 'student' && e.spar), { npcPose, npcFrame, map } = Scene.debug();
    return students.length === 2 && students.every(e => npcFrame(e.npcLook, npcPose(e))) &&
      map.blds.some(b => b.view?.furniture.length === 3);
  });
  const poses = await frame.evaluate(() => {
    const e = Scene.find(e => e.kind === 'student' && e.spar), { npcPose, npcFrame } = Scene.debug();
    return [0, 2, 3, 4, 5, 6, 7].map(ff => {
      const pose = npcPose({ ...e, ff });
      return { row: pose.row, image: npcFrame(e.npcLook, pose).toDataURL(), lean: pose.lean, scale: pose.scale };
    });
  });
  expect(poses[0].row).toBeLessThan(5);
  expect(poses.slice(1, 5).every(p => p.row >= 10 && p.row < 19)).toBeTruthy();
  expect(new Set(poses.slice(1, 5).map(p => p.image)).size).toBe(4);
  expect(poses[5].lean).not.toBe(0);
  expect(poses[6].scale).toBeLessThan(1);
  const order = await frame.evaluate(() => {
    const d = Scene.debug();
    d.draw();
    const room = d.map.blds.find(b => b.view?.furniture.length === 3);
    const mats = room.view.furniture.map(f => f.image);
    const fighters = Scene.ents().filter(e => e.spar).map(e => d.npcFrame(e.npcLook, d.npcPose(e)));
    const context = document.querySelector('#stage canvas.game').getContext('2d'), original = context.drawImage;
    const order = [];
    context.drawImage = function (image, ...args) {
      if (mats.includes(image)) order.push('mat');
      if (fighters.includes(image)) order.push('fighter');
      return original.call(this, image, ...args);
    };
    try { d.draw(); } finally { context.drawImage = original; }
    return order;
  });
  expect(order).toEqual(['mat', 'mat', 'mat', 'fighter', 'fighter']);
  await frame.waitForTimeout(1100); // Let the venue name clear above the ring.
  await screenshot(page, info, 'npc-directional-dojo');
  expect(errors).toEqual([]);
});

test('human wandering takes a diagonal step without cutting a blocked corner', async ({ page }) => {
  const errors=observeErrors(page),frame=await scene(page,'tallyport');
  const start=await frame.evaluate(()=>{
    const {map}=Scene.debug(),e=Scene.find(e=>e.kind==='rival'&&e.r===1);
    const options=[[1,1,1],[-1,1,3],[-1,-1,5],[1,-1,7]];
    const clear=(x,y)=>!map.solid[y*map.w+x]&&!map.occ.has(y*map.w+x)&&[2,3].includes(map.t[y*map.w+x]);
    const next=options.find(([dx,dy])=>clear(e.x+dx,e.y+dy)&&clear(e.x+dx,e.y)&&clear(e.x,e.y+dy));
    if(!next)throw Error('Rival has no clear diagonal fixture step');
    Scene.hop(...Scene.safePosition([e.x-4,e.y+2],1));
    const [dx,dy,index]=next,old=Math.random;window.__npcDiagonalRandom=old;Math.random=()=> (index+.1)/8;
    e.t=-1;e.tx=null;e.fx=e.x;e.fy=e.y;e.wander=1;e.home=[e.x,e.y];e.range=6;
    return {name:e.name,x:e.x,y:e.y,dx,dy};
  });
  try{
    await frame.waitForFunction(({name,x,y,dx,dy})=>{const e=Scene.find(e=>e.name===name);return e.tx===x+dx&&e.ty===y+dy&&e.fx!==x&&e.fy!==y;},start);
    const moving=await frame.evaluate(name=>{const e=Scene.find(e=>e.name===name);return Scene.debug().npcPose(e).direction;},start.name);
    expect([1,3,5,7]).toContain(moving);
    await frame.waitForFunction(name=>Scene.find(e=>e.name===name).tx==null,start.name);
    const blocked=await frame.evaluate(({name,dx,dy})=>{
      const {map}=Scene.debug(),e=Scene.find(e=>e.name===name),index=e.y*map.w+e.x+dx;
      window.__npcCornerFixture={index,old:map.solid[index]};map.solid[index]=1;e.t=-1;
      return {name,x:e.x,y:e.y};
    },start);
    await frame.waitForFunction(({name})=>Scene.find(e=>e.name===name).t>0,blocked);
    expect(await frame.evaluate(name=>{const e=Scene.find(e=>e.name===name);return {name,x:e.x,y:e.y};},start.name)).toEqual(blocked);
    expect(await frame.evaluate(name=>Scene.find(e=>e.name===name).tx,start.name)).toBeNull();
  }finally{await frame.evaluate(()=>{Math.random=window.__npcDiagonalRandom;delete window.__npcDiagonalRandom;const f=window.__npcCornerFixture;if(f)Scene.debug().map.solid[f.index]=f.old;delete window.__npcCornerFixture;});}
  expect(errors).toEqual([]);
});
