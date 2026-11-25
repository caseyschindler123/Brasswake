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
      const samples = [];let previous=null,maxDistanceError=0;
      const start = performance.now();
      function sample() {
        const point=[e.fx,e.fy,e.wd||0];
        if(previous)maxDistanceError=Math.max(maxDistanceError,Math.abs(point[2]-previous[2]-Math.hypot(point[0]-previous[0],point[1]-previous[1])));
        previous=point;
        if (e.tx != null) samples.push([e.fx, e.fy, npcPose(e).frame, ActorRig.distance(e), ActorRig.gait(!!e.npcRun).stride]);
        if (performance.now() - start > 8500 || new Set(samples.map(s => s[2])).size >= 3) resolve({samples,maxDistanceError});
        else requestAnimationFrame(sample);
      }
      sample();
    });
    return {
      positions: new Set(steps.samples.map(s => s.slice(0, 2).join(','))).size,
      frames: new Set(steps.samples.map(s => s[2])).size,
      maxDistanceError: steps.maxDistanceError,
      phaseMatches: steps.samples.every(([, , frame, distance, stride]) => frame === Math.floor(distance / stride * 64) % 64),
    };
  }, town.name);
  expect(motion.positions).toBeGreaterThan(2);
  expect(motion.frames).toBeGreaterThanOrEqual(3);
  expect(motion.maxDistanceError).toBeLessThan(1e-8);expect(motion.phaseMatches).toBe(true);

  await frame.waitForFunction(() => {
    const { npcFrame } = Scene.debug(), odalys = Scene.find(e => e.kind === 'npc' && e.r === 1 && e.i === 0);
    const guide = Scene.guideEnt() || Scene.guidePut(odalys.x, odalys.y + 2);
    const initial = { row: 0, source: 0, frame: 0 };
    return !!npcFrame(odalys.npcLook, initial) && !!npcFrame(guide.npcLook, initial);
  });
  const sprites = await frame.evaluate(() => {
    const { npcPose, npcFrame, npcCache } = Scene.debug();
    const actor = Scene.find(e => e.kind === 'npc' && e.r === 1 && e.i === 0);
    const guide = Scene.guideEnt(), look = actor.npcLook;
    const vectors = [[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]];
    const sheet = document.createElement('canvas');
    const size = 128, rootX = 64, rootY = 96;
    sheet.width = size * 4; sheet.height = 24 + size * 4;
    sheet.style.cssText = 'position:fixed;z-index:999;top:48%;left:50%;transform:translate(-50%,-50%);width:min(512px,calc(100vw - 24px));height:auto;background:#485362;border:2px solid #b5ad98;';
    const strip = sheet.getContext('2d'), views = [], frames = [];
    strip.fillStyle = '#f0e8d8'; strip.font = '14px sans-serif'; strip.fillText('Odalys Brine', 12, 21);
    function aligned(source, flip) {
      const display = document.createElement('canvas');
      display.width = display.height = size;
      const ctx = display.getContext('2d');
      if (flip) { ctx.translate(size, 0); ctx.scale(-1, 1); }
      ctx.drawImage(source, rootX - source.originX, rootY - source.originY);
      return display;
    }
    for (const [dx, dy] of vectors) {
      const pose = npcPose({ ...actor, fx: 0, fy: 0, tx: dx, ty: dy, wd: 0, gaitOffset: 0, npcRun: false });
      const display = aligned(npcFrame(look, pose), pose.flip);
      views.push(display.toDataURL());
      frames.push(pose);
      strip.drawImage(display, (pose.direction % 4) * size, 24 + (pose.direction >> 2) * size);
    }
    const south = frames[0], southFrame = npcFrame(look, south), base = aligned(southFrame, south.flip);
    const pixelDiff = (image, x, y, w, h) => {
      const a = base.getContext('2d').getImageData(x, y, w, h).data;
      const b = image.getContext('2d').getImageData(x, y, w, h).data;
      return a.reduce((n, value, i) => n + Math.abs(value - b[i]), 0);
    };
    const tone = aligned(npcFrame({ ...look, skin: 4, key: 'tone-sample' }, south), south.flip);
    const cloth = aligned(npcFrame({ ...look, cloth: '#5592ba', key: 'cloth-sample' }, south), south.flip);
    const walkSources = Array.from({ length: 8 }, (_, sample) => npcFrame(look, { ...south, frame: sample * 8 }));
    const walkFrames = walkSources.map(image => aligned(image, south.flip).toDataURL());
    const materialY = 24 + size * 2;
    strip.drawImage(base, 0, materialY); strip.drawImage(tone, size, materialY); strip.drawImage(cloth, size * 2, materialY);
    strip.drawImage(aligned(npcFrame(guide.npcLook, south), south.flip), size * 3, materialY);
    const side = frames[6];
    const runs = Array.from({ length: 64 }, (_, frame) => npcFrame(look, { ...side, row: side.row + 5, frame }));
    const headWidths = runs.map(image => image.anchor[2]);
    // Pair each airborne image with the next landing to compare the same lead foot.
    const grounded = [32, 0], airborne = [27, 59];
    const runPixels = Object.fromEntries([...grounded, ...airborne].map(frame => {
      const canvas = aligned(runs[frame], side.flip);
      return [frame, canvas.getContext('2d').getImageData(0, 0, size, size).data];
    }));
    const opaque = (frame, x, y) => x >= 0 && x < size && y >= 0 && y < size &&
      runPixels[frame][(y * size + x) * 4 + 3] > 160;
    const alignedPoint = (image, x, y) => {
      const left = rootX - image.originX + x;
      return [side.flip ? size - left : left, rootY - image.originY + y];
    };
    // Side-on projection still places the two feet in different depth lanes.
    // Compare the lowest visible pixel near each projected heel's landing column.
    const runBottom = (frame, supportX) => {
      for (let y = size - 1; y >= 0; y--) {
        for (let x = Math.max(0, Math.ceil(supportX - 2.5)); x <= Math.min(size - 1, Math.floor(supportX + 1.5)); x++) {
          if (opaque(frame, x, y)) return y + .5;
        }
      }
      return -1;
    };
    const soleVisible = (frame, pointX, pointY) => {
      for (let y = Math.floor(pointY) - 2; y <= Math.ceil(pointY) + 1; y++) {
        for (let x = Math.floor(pointX) - 2; x <= Math.ceil(pointX) + 1; x++) {
          if (Math.hypot(x + .5 - pointX, y + .5 - pointY) <= 2 && opaque(frame, x, y)) return true;
        }
      }
      return false;
    };
    for (const [i, frame] of [0, 27, 32, 59].entries()) {
      strip.drawImage(aligned(runs[frame], side.flip), i * size, 24 + size * 3);
    }
    const headTop = rootY - southFrame.originY + southFrame.anchor[0];
    const skinDelta = pixelDiff(tone, 0, headTop, size, 15);
    const clothDelta = pixelDiff(cloth, 0, headTop + 17, size, 22);
    const bootTop = rootY - 12;
    const bootDelta = pixelDiff(tone, 0, bootTop, size, size - bootTop);
    const bootPixels = base.getContext('2d').getImageData(0, bootTop, size, size - bootTop).data;
    const bootVisible = bootPixels.some((value, index) => index % 4 === 3 && value > 160);
    const gaitFramesMatch = walkSources.every((image, sample) => image.gait === 'walk' && image.gaitFrame === sample * 8) &&
      runs.every((image, frame) => image.gait === 'run' && image.gaitFrame === frame);
    const runFlight = grounded.map((frame, i) => {
      const landing = runs[frame], flight = runs[airborne[i]];
      const [columnX, groundY] = alignedPoint(landing, ...landing.supports[0]);
      const landingBottom = runBottom(frame, columnX);
      const flightBottom = runBottom(airborne[i], columnX);
      return {
        grounded: landing.flight === false && landing.supports.length === 1,
        airborne: flight.flight === true && flight.supports.length === 0,
        landingGap: Math.abs(groundY - landingBottom),
        visible: flightBottom >= 0,
        lift: landingBottom - flightBottom,
        feet: flight.feet.map(([x, y, projectedGroundY, height]) => ({
          height,
          lift: projectedGroundY - y,
          visible: soleVisible(airborne[i], ...alignedPoint(flight, x, y)),
        })),
      };
    });
    for (let i = 0; i < 180; i++) npcFrame({ ...look, key: 'eviction-sample-' + i }, south);
    document.body.append(sheet);
    sheet.id = 'npc-visual-evidence';
    return { directions: frames.map(f => f.direction), painted: new Set(views).size,
      walking: new Set(walkFrames).size, gaitFramesMatch, runHeadRange: Math.max(...headWidths) - Math.min(...headWidths),
      runFlight, skinDelta, clothDelta, bootDelta, bootVisible, cache: npcCache(),
      guideName: guide.name, guideLook: guide.npcLook, odalys: look };
  });
  expect(sprites.directions).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(sprites.painted).toBe(8);
  expect(sprites.walking).toBeGreaterThan(5);
  expect(sprites.gaitFramesMatch).toBe(true);
  expect(sprites.runHeadRange).toBeLessThan(2);
  for (const step of sprites.runFlight) {
    expect(step.grounded).toBe(true);
    expect(step.airborne).toBe(true);
    expect(step.landingGap).toBeLessThanOrEqual(2);
    expect(step.visible).toBe(true);
    expect(step.lift).toBeGreaterThanOrEqual(2);
    expect(step.feet).toHaveLength(2);
    for (const foot of step.feet) {
      expect(foot.height).toBeGreaterThanOrEqual(.06);
      expect(foot.lift).toBeGreaterThanOrEqual(2);
      expect(foot.visible).toBe(true);
    }
  }
  expect(sprites.skinDelta).toBeGreaterThan(500);
  expect(sprites.clothDelta).toBeGreaterThan(1000);
  expect(sprites.bootVisible).toBe(true);
  expect(sprites.bootDelta).toBe(0);
  expect(sprites.cache).toEqual({ frames: 160, limit: 160, materials:256, materialLimit:256 });
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
      const pose = npcPose({ ...e, tx: null, npcFacing: 6, ff });
      const image = npcFrame(e.npcLook, pose);
      return { row: pose.row, image: image.toDataURL(), gait: image.gait, headWidth: image.anchor[2],
        height: image.height, direction: pose.direction, lean: pose.lean, scale: pose.scale };
    });
  });
  expect(poses[0].gait).toBe('idle');
  expect(poses.slice(1, 5).every(p => p.row >= 10 && p.row < 19)).toBeTruthy();
  expect(new Set(poses.slice(1, 5).map(p => p.image)).size).toBe(4);
  expect(poses[5].lean).not.toBe(0);
  const [idle, hit] = [poses[0], poses[6]];
  expect(hit.row).toBe(20);
  expect(hit.gait).toBe('hit');
  expect(hit.direction).toBe(idle.direction);
  expect(hit.scale).toBe(1);
  expect(hit.image).not.toBe(idle.image);
  expect(Math.abs(hit.headWidth - idle.headWidth)).toBeLessThanOrEqual(2);
  expect(Math.abs(hit.height - idle.height)).toBeLessThanOrEqual(6);
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
