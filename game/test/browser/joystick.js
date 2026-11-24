const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');

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
