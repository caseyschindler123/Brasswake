const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');
const { drivePath } = require('./movement');

async function adventure(page) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  const frame = page.frames().find(f => f.url().includes('visual_test=1'));
  const coach = frame.locator('[data-a=coachok]');
  if (await coach.isVisible()) await coach.click();
  await frame.evaluate(() => {
    for (const e of Scene.ents()) if (e.wander) {
      e.wander = 0;
      e.tx = null;
      e.fx = e.x;
      e.fy = e.y;
    }
  });
  const stick = frame.getByRole('group', { name: 'Movement joystick' });
  await expect(stick).toHaveAttribute('aria-disabled', 'false');
  return { frame, stick };
}

const position = frame => frame.evaluate(() => Scene.pos());
const offset = (at, [x, y]) => [at[0] + x, at[1] + y];

async function emptyLane(frame) {
  return frame.evaluate(() => {
    const { world: m } = Scene.debug(), [cx, cy] = Scene.towns()[1];
    for (let y = cy - 22; y <= cy + 22; y++) for (let x = cx - 28; x <= cx + 28; x++) {
      const clear = (xx, yy) => {
        const i = yy * m.w + xx;
        return m.seen[i] && !m.solid[i] && !m.occ.has(i) && !m.ents.some(e => Math.abs(e.x - xx) < 1.5 && Math.abs(e.y - yy) < 1.5);
      };
      if ([0, 1, 2, 3, 4].every(d => clear(x + d, y) && clear(x + d, y + 1) && clear(x + d, y + 2))) {
        Scene.hop(x, y);
        return [x, y];
      }
    }
    throw Error('Missing unobstructed joystick test lane');
  });
}

function joystickPoint(box, dx, dy, fraction) {
  const radius = Math.min(box.width, box.height) / 2;
  return [box.x + box.width / 2 + dx * radius * fraction, box.y + box.height / 2 + dy * radius * fraction];
}

async function hold(page, box, dx, dy, fraction) {
  await page.mouse.move(...joystickPoint(box, 0, 0, 0));
  await page.mouse.down();
  if (fraction) await page.mouse.move(...joystickPoint(box, dx, dy, fraction));
}

async function pointerDriver(page, box, project) {
  if (project !== 'phone-chromium') return {
    start: () => hold(page, box, 0, 0, 0),
    move: (dx, dy, fraction) => page.mouse.move(...joystickPoint(box, dx, dy, fraction)),
    end: () => page.mouse.up()
  };
  const client = await page.context().newCDPSession(page);
  const place = (type, dx, dy, fraction) => {
    const [x, y] = joystickPoint(box, dx, dy, fraction);
    return client.send('Input.dispatchTouchEvent', { type, touchPoints: [{ id: 1, x, y }] });
  };
  return {
    start: () => place('touchStart', 0, 0, 0),
    move: (dx, dy, fraction) => place('touchMove', dx, dy, fraction),
    end: () => client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  };
}

async function settled(frame) {
  // Give an unintended queued step enough time to cross into the next cell.
  await frame.waitForTimeout(580);
  expect(await frame.evaluate(() => Scene.traveling())).toBe(false);
}

test('joystick · dead zone, walking and diagonal running use the stage control', async ({ page }, info) => {
  const errors = observeErrors(page), { frame, stick } = await adventure(page);
  const start = await emptyLane(frame), box = await stick.boundingBox();
  const stage = await frame.locator('#stage').boundingBox();
  const nav = await frame.locator('#nav').boundingBox();
  expect(box.x - stage.x).toBeGreaterThan(stage.width / 2);
  expect(box.y - stage.y).toBeGreaterThan(stage.height / 2);
  expect(box.y + box.height).toBeLessThanOrEqual(nav.y);
  const pointer = await pointerDriver(page, box, info.project.name);

  try {
    await pointer.start();
    await expect(stick).toHaveAttribute('data-mode', 'rest');
    await settled(frame);
    expect(await position(frame)).toEqual(start);
    await pointer.move(1, 0, .38);
    await expect(stick).toHaveAttribute('data-mode', 'walk');
    await expect.poll(() => frame.evaluate(() => Scene.traveling() && !Scene.debug().P.run)).toBe(true);
    await expect.poll(() => position(frame), { intervals: [20] }).toEqual(offset(start, [1, 0]));
  } finally { await pointer.end(); }
  await expect(stick).toHaveAttribute('data-mode', 'rest');
  await settled(frame);
  expect(await position(frame)).toEqual(offset(start, [1, 0]));

  const diagonal = Math.SQRT1_2;
  try {
    await pointer.start();
    await pointer.move(diagonal, diagonal, .84);
    await expect(stick).toHaveAttribute('data-mode', 'run');
    await expect.poll(() => frame.evaluate(() => Scene.traveling() && Scene.debug().P.run)).toBe(true);
    await expect.poll(() => position(frame), { intervals: [20] }).toEqual(offset(start, [2, 1]));
  } finally { await pointer.end(); }
  await settled(frame);
  expect(await position(frame)).toEqual(offset(start, [2, 1]));
  await screenshot(page, info, 'directional-joystick');
  expect(errors).toEqual([]);
});

async function tapCanvas(frame, coords, touch) {
  const position = await frame.evaluate(({ x, y }) => {
    const { cam, zoom } = Scene.debug();
    return { x: (x * 16 - cam.x) * zoom, y: (y * 16 - cam.y) * zoom };
  }, coords);
  const canvas = frame.locator('#stage canvas.over');
  if (touch) await canvas.tap({ position });
  else await canvas.click({ position });
}

test('joystick · taps interact only in reach and a bank modal blocks movement', async ({ page }, info) => {
  const errors = observeErrors(page), { frame, stick } = await adventure(page);
  const touch = info.project.use.hasTouch;
  const start = await emptyLane(frame);
  await frame.waitForTimeout(420);
  await tapCanvas(frame, { x: start[0] + 2.5, y: start[1] + .5 }, touch);
  await settled(frame);
  expect(await position(frame)).toEqual(start);

  const { distant, close, tap, key, target } = await frame.evaluate(() => {
    const { world: m } = Scene.debug(), actor = Scene.find(e => e.kind === 'banker' && e.r === 1);
    const legal = ([x, y]) => !m.solid[y * m.w + x] && !m.occ.has(y * m.w + x);
    const at = n => [[0, n], [0, -n], [n, 0], [-n, 0]].map(([x, y]) => [actor.x + x, actor.y + y]).find(legal);
    const close = at(1);
    const [key, target] = [['ArrowRight', 1, 0], ['ArrowLeft', -1, 0], ['ArrowDown', 0, 1], ['ArrowUp', 0, -1]]
      .map(([key, dx, dy]) => [key, [close[0] + dx, close[1] + dy]]).find(([, tile]) => legal(tile));
    return { distant: at(3), close, key, target, tap: { x: actor.fx + .5, y: actor.fy + .2 } };
  });
  await frame.evaluate(at => Scene.hop(...at), distant);
  await frame.waitForTimeout(420);
  await tapCanvas(frame, tap, touch);
  await expect(frame.locator('#toast')).toContainText('Move closer to interact.');
  await settled(frame);
  expect(await position(frame)).toEqual(distant);
  await expect(frame.locator('#sheet')).toBeHidden();

  await frame.evaluate(at => Scene.hop(...at), close);
  await frame.waitForTimeout(420);
  await tapCanvas(frame, tap, touch);
  await expect(frame.locator('#sheet')).toBeVisible();
  // Canvas interaction suppresses click-through to overlays for 450 ms.
  await frame.waitForTimeout(470);
  const coach = frame.locator('[data-a=coachok]');
  if (await coach.isVisible()) await coach.click();
  await expect(frame.locator('#coach')).toBeHidden();
  await expect(stick).toHaveAttribute('aria-disabled', 'true');
  // The sheet physically covers the thumb control. Native keys still reach the
  // scene's window, so they exercise the shared modal input guard.
  await frame.locator('body').evaluate(body => { body.tabIndex = -1; body.focus({ preventScroll: true }); });
  await page.keyboard.down(key);
  try { await settled(frame); } finally { await page.keyboard.up(key); }
  expect(await position(frame)).toEqual(close);
  await frame.locator('.sheet-x').click();
  await expect(stick).toHaveAttribute('aria-disabled', 'false');
  await frame.locator('body').evaluate(body => body.focus({ preventScroll: true }));
  await page.keyboard.down(key);
  try { await frame.waitForFunction(at=>Scene.pos().every((n,i)=>n===at[i]),target); } finally { await page.keyboard.up(key); }
  await expect.poll(() => position(frame)).toEqual(target);
  expect(errors).toEqual([]);
});

test('joystick · cancellation, capture loss and focus loss clear a held direction', async ({ page }) => {
  const errors = observeErrors(page), { frame, stick } = await adventure(page);
  const box = await stick.boundingBox();
  for (const stop of ['cancel', 'capture', 'blur']) {
    const start = await emptyLane(frame);
    await stick.evaluate(node => node.addEventListener('pointerdown', e => { node.dataset.testPointer = e.pointerId; }, { once: true }));
    try {
      await hold(page, box, 1, 0, .38);
      await expect(stick).toHaveAttribute('data-mode', 'walk');
      // Establish real movement before interrupting it. A completed tile while
      // the direction is still held is valid, regardless of browser/API speed.
      await frame.waitForFunction(start => Scene.traveling() && Scene.pos().some((n, i) => n !== start[i]), start);
      await stick.evaluate((node, stop) => {
        const pointerId = Number(node.dataset.testPointer);
        delete node.dataset.testStoppedAt;
        const event = stop === 'cancel' ? 'pointercancel' : stop === 'capture' ? 'lostpointercapture' : 'blur';
        const target = stop === 'blur' ? window : node;
        // The game's existing handler runs first. Record the exact delivered
        // event boundary, including deferred native lostpointercapture events.
        target.addEventListener(event, () => { node.dataset.testStoppedAt = JSON.stringify(Scene.pos()); }, { once: true });
        if (stop === 'cancel') node.dispatchEvent(new PointerEvent('pointercancel', { pointerId }));
        else if (stop === 'capture') node.releasePointerCapture(pointerId);
        else window.dispatchEvent(new Event('blur'));
      }, stop);
      if (stop === 'capture') await page.mouse.move(...joystickPoint(box, 1, 0, .42));
      await expect(stick).toHaveAttribute('data-mode', 'rest');
      await expect(stick).toHaveAttribute('data-test-stopped-at', /^\[/);
      const stoppedAt = JSON.parse(await stick.getAttribute('data-test-stopped-at'));
      await settled(frame);
      expect(await position(frame)).toEqual(stoppedAt);
    } finally { await page.mouse.up(); }
  }
  expect(errors).toEqual([]);
});

test('joystick · fixture routes centre stopped feet before the dojo dummy lane and retain fractional endpoints',async({page},info)=>{
  const errors=observeErrors(page),{frame,stick}=await adventure(page);
  await frame.evaluate(()=>{__bw.S.gd=3;__bw.S.tut=0;__bw.SH.dojo({r:1});});
  // Keep the real first-day instructor and dummy. Let the existing welcome
  // dialogue arrive before preparing the interrupted-movement position.
  await frame.waitForTimeout(900);await frame.evaluate(()=>__bw.ACT.closesheet());
  await expect(stick).toHaveAttribute('aria-disabled','false');
  expect(await frame.evaluate(()=>{const e=Scene.find(e=>e.kind==='dummy'&&e.i===9);return[e.x,e.y];})).toEqual([5,8]);
  await stick.evaluate(node=>{
    node.__routePointers=[];
    for(const type of ['pointerdown','pointercancel'])node.addEventListener(type,e=>node.__routePointers.push({type,trusted:e.isTrusted}));
  });
  await frame.evaluate(()=>Scene.hop(6,9));
  // Stop through the real control in the owned cell's left edge, where an
  // uncentred northward route collides with the dummy's radius clearance.
  await drivePath(frame,[[5.64,9]],false);
  expect(await position(frame)).toEqual([6,9]);
  const stopped=await frame.evaluate(()=>{const p=Scene.debug().P;return{fx:p.fx,fy:p.fy,wd:p.wd};});
  expect(stopped.fx).toBeGreaterThan(5.5);expect(stopped.fx).toBeLessThan(5.66);
  await drivePath(frame,[[6,8],[6,7]],false);
  expect(await position(frame)).toEqual([6,7]);
  const arrived=await frame.evaluate(()=>{const p=Scene.debug().P;return{fx:p.fx,fy:p.fy,wd:p.wd};});
  expect(Math.abs(arrived.fx-6)).toBeLessThanOrEqual(.12);
  expect(Math.abs(arrived.fy-7)).toBeLessThanOrEqual(.12);
  // Recentring adds real distance; the driver must not assign coordinates or wd.
  expect(arrived.wd-stopped.wd).toBeGreaterThan(2.25);
  expect(arrived.wd-stopped.wd).toBeLessThan(2.9);
  await screenshot(page,info,'dojo-fractional-lane');

  await frame.evaluate(()=>Scene.hop(6,9));
  await drivePath(frame,[[5.64,9]],false);
  const before=await frame.evaluate(()=>({fx:Scene.debug().P.fx,wd:Scene.debug().P.wd}));
  await drivePath(frame,[[6,9]],false);
  const centred=await frame.evaluate(()=>({fx:Scene.debug().P.fx,wd:Scene.debug().P.wd}));
  expect(await position(frame)).toEqual([6,9]);
  expect(Math.abs(centred.fx-6)).toBeLessThanOrEqual(.12);
  expect(centred.wd-before.wd).toBeGreaterThan(.25);

  await frame.evaluate(()=>Scene.hop(6,10));
  await drivePath(frame,[[7.25,10]],false);
  const fractional=await frame.evaluate(()=>[Scene.debug().P.fx,Scene.debug().P.fy]);
  expect(await position(frame)).toEqual([7,10]);
  expect(fractional[0]).toBeGreaterThanOrEqual(7.25);
  expect(fractional[0]).toBeLessThanOrEqual(7.37);
  expect(Math.abs(fractional[1]-10)).toBeLessThanOrEqual(.12);
  const events=await stick.evaluate(node=>node.__routePointers);
  expect(events.filter(e=>e.type==='pointerdown'&&e.trusted).length).toBeGreaterThanOrEqual(6);
  expect(events.filter(e=>e.type==='pointercancel').length).toBeGreaterThanOrEqual(6);
  await settled(frame);expect(await position(frame)).toEqual([7,10]);
  expect(errors).toEqual([]);
});


test('joystick · slower gaits keep travel, contact sounds and distance events synchronized',async({page},info)=>{
  const errors=observeErrors(page),{frame,stick}=await adventure(page),box=await stick.boundingBox();
  const driver=await pointerDriver(page,box,info.project.name);let holding=false;
  await frame.evaluate(()=>{
    for(const e of Scene.ents()){e.wander=0;e.tx=null;e.fx=e.x;e.fy=e.y;}
    window.__gaitSounds=[];window.__gaitMoved=[];window.__gaitOriginalSound=Sound.sfx;window.__gaitOriginalMoved=__bw.HOST.moved;
    Sound.sfx=(name,detail)=>{if(name==='step'){const p=Scene.debug().P,distance=ActorRig.distance(p),frame=ActorRig.phase(distance,p.run),image=(p.run?p.spr.r8:p.spr.w8)[p.d8||0][frame],gait=ActorRig.gait(p.run);__gaitSounds.push({wd:p.wd,run:p.run,frame,cycle:distance/gait.stride,grounded:!image.flight&&image.supports.length>0,offsets:gait.contacts,detail});}return __gaitOriginalSound(name,detail);};
    __bw.HOST.moved=(...args)=>{__gaitMoved.push(Scene.debug().P.wd);return __gaitOriginalMoved(...args);};
  });
  try{
    for(const [run,dx,dy]of [[false,1,0],[true,1,0],[true,1,1]]){
      await frame.evaluate(({dx,dy})=>{
        const {map:m}=Scene.debug(),[cx,cy]=Scene.towns()[1];
        const free=(x,y)=>{const i=y*m.w+x;return m.reg[i]===1&&m.seen[i]&&!m.solid[i]&&!m.occ.has(i);};
        for(let y=cy-32;y<cy+32;y++)for(let x=cx-40;x<cx+40;x++){
          if(!Array.from({length:12},(_,k)=>[x+k*dx,y+k*dy]).every(([xx,yy])=>free(xx,yy)&&free(xx+1,yy)&&free(xx,yy+1)))continue;
          Scene.hop(x,y);window.__gaitSounds=[];window.__gaitMoved=[];return;
        }
        throw Error('No clear gait lane');
      },{dx,dy});
      await frame.waitForFunction(()=>!Scene.debug().map.pending);
      await driver.start();holding=true;await driver.move(dx,dy,run?.8:.45);
      try{
        await frame.waitForFunction(()=>Scene.debug().P.moving);
        const start=await frame.evaluate(()=>({wd:Scene.debug().P.wd,time:Scene.tacticalTime()}));
        await frame.waitForFunction(t=>Scene.tacticalTime()-t>=1800,start.time);
        const end=await frame.evaluate(()=>({wd:Scene.debug().P.wd,time:Scene.tacticalTime(),run:Scene.debug().P.run,mul:__bw.HOST.runMul(),gait:ActorRig.gait(Scene.debug().P.run)}));
        expect(end.run).toBe(run);
        const speed=(end.wd-start.wd)/((end.time-start.time)/1000),multiplier=run?end.mul:1;
        // The approved 30 FPS source cycles take 31 walk or 21 run frames, with two steps per cycle.
        const sourceCadence=2*60*30/(run?21:31);
        expect(speed).toBeCloseTo(end.gait.stride*end.gait.cadence/120*multiplier,3);
        expect(speed/end.gait.stride*120).toBeCloseTo(sourceCadence*multiplier,3);
      }finally{if(holding){await driver.end();holding=false;}}
      await frame.waitForFunction(()=>!Scene.traveling());
      const stopped=await frame.evaluate(run=>({wd:Scene.debug().P.wd,sounds:__gaitSounds,moved:__gaitMoved,expected:ActorRig.contacts(0,Scene.debug().P.wd,run)}),run);
      expect(stopped.sounds.length).toBe(stopped.expected);expect(stopped.sounds.length).toBeGreaterThanOrEqual(3);
      expect(stopped.sounds.every(s=>s.run===run&&s.grounded&&s.offsets.some(offset=>(s.cycle-offset+1)%1<.1))).toBe(true);
      expect(stopped.moved.length).toBe(Math.floor(stopped.wd));
      await frame.waitForTimeout(160);expect(await frame.evaluate(()=>__gaitSounds.length)).toBe(stopped.sounds.length);
      await frame.evaluate(()=>Scene.hop(...Scene.pos()));expect(await frame.evaluate(()=>__gaitSounds.length)).toBe(stopped.sounds.length);
    }
    const settledTime=await frame.evaluate(()=>Scene.tacticalTime());await frame.waitForFunction(t=>Scene.tacticalTime()-t>=600,settledTime);
    await screenshot(page,info,'grounded-cadence');
  }finally{if(holding)await driver.end();await frame.evaluate(()=>{Sound.sfx=__gaitOriginalSound;__bw.HOST.moved=__gaitOriginalMoved;delete window.__gaitOriginalSound;delete window.__gaitOriginalMoved;});}
  expect(errors).toEqual([]);
});


test('joystick · painted bodies and fitted gear face the direction of travel',async({page},info)=>{
  const errors=observeErrors(page),{frame}=await adventure(page);
  const result=await frame.evaluate(async()=>{
    const base={...__bw.HOST.app(),combo:5,build:0,wpn:-1,shield:-1,hat:-1,gear:{cloak:'cloak-wool',hands:'hands-plated',feet:'feet-steel'}},
      directions=[0,7,6,5,4,3,2,1],body=ArtData.painted.combos[5],canvas=document.createElement('canvas');
    canvas.width=960;canvas.height=400;const g=canvas.getContext('2d');g.fillStyle='#eadbbd';g.fillRect(0,0,960,400);g.font='15px sans-serif';g.fillStyle='#302a21';
    let sprite;for(let n=0;n<100;n++){sprite=Scene.debug().humanSprite(base);if(sprite)break;await new Promise(r=>setTimeout(r,30));}if(!sprite)throw Error('Facing sprite unavailable');
    const failures=[];let checked=0;
    for(const [row,state]of ['walk','run'].entries())for(let direction=0;direction<8;direction++){
      const bank=body.states[state],expected=bank.frames[directions[direction]],images=state==='run'?sprite.r8:sprite.w8;
      for(const k of [0,6,12,18]){
        let image;for(let n=0;n<100;n++){image=images[direction][k];if(image?.gait===state&&!image.pendingParts)break;await new Promise(r=>setTimeout(r,30));}
        if(image?.gait!==state||image.pendingParts)throw Error('Facing frame unavailable');
        for(let foot=0;foot<2;foot++)for(let axis=0;axis<2;axis++){
          const actual=image.feet[foot][axis]-(axis?image.originY:image.originX),wanted=expected[k].feet[foot][axis]-expected[k].origin[axis];
          if(Math.abs(actual-wanted)>.001)failures.push({state,direction,k,foot,axis,actual,wanted});
        }
        if(k===6){const x=direction*120+60,y=row*200+180;g.fillText(state+' '+['S','SW','W','NW','N','NE','E','SE'][direction],direction*120+15,row*200+20);g.drawImage(image,x-image.originX*2,y-image.originY*2,image.width*2,image.height*2);}
        checked++;
      }
    }
    return{failures,checked,data:canvas.toDataURL()};
  });
  expect(result.failures).toEqual([]);expect(result.checked).toBe(64);
  const path=info.outputPath('painted-facing-directions.png');await require('node:fs/promises').writeFile(path,Buffer.from(result.data.split(',')[1],'base64'));await info.attach('painted-facing-directions',{path,contentType:'image/png'});
  await screenshot(page,info,'painted-facing-world');expect(errors).toEqual([]);
});
