const fs = require('node:fs/promises');
const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');

const weapons = [
  'Short sword', 'Longsword', 'Greatsword', 'Broad axe', 'Battle axe', 'Mace', 'War hammer', 'Spear',
  'Quarterstaff', 'Oak staff', 'Crystal staff', 'Bone staff', 'Iron staff', 'Wand', 'Dagger',
  'Curved blade', 'Throwing knife', 'Short bow', 'Longbow', 'Crossbow',
].map((name, i) => [i < 17 ? i : i + 8, name]);

async function equipment(page) {
  await page.goto('/__visual?scene=paperdoll');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'paperdoll', { timeout: 45000 });
  return page.frames().find(frame => frame.url().includes('visual_test=1'));
}

test('paper doll grips preserve the fingers and fit every weapon and offhand on each figure', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await equipment(page);
  const { failures, sheets } = await frame.evaluate(async ({ weapons, makeSheets }) => {
    const canvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height });
    const figure = canvas(300, 450), bare = canvas(300, 450), isolated = canvas(364, 514);
    const g = figure.getContext('2d', { willReadFrequently: true });
    const q = isolated.getContext('2d', { willReadFrequently: true });
    const b = bare.getContext('2d', { willReadFrequently: true });
    const draw = g.drawImage.bind(g);
    // Replay just the weapon draw on a larger canvas. Its real opaque pixels
    // expose clipping and show which original fingers cover the grip.
    g.drawImage = (im, ...rect) => {
      if (im.src?.endsWith('/hb/wx.webp')) {
        const transform = g.getTransform();
        q.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e + 32, transform.f + 32);
        q.drawImage(im, ...rect);
        q.resetTransform();
      }
      draw(im, ...rect);
    };
    document.body.append(bare);
    bare.style.display = 'none';
    const look = { ...__bw.HOST.app(), hair: -1, hat: -1, beard: -1, wpn: -1, shield: -1, glow: null, fx: null };
    const items = weapons.map(([wpn, name]) => ({ wpn, name }));
    for (const [offset, name] of ['Round shield', 'Kite shield', 'Buckler', 'Glass orb', 'Spellbook'].entries()) {
      items.push({ shield: 20 + offset, name });
    }
    const failures = [], plates = [];
    for (let combo = 1; combo <= 10; combo++) {
      const appearance = { ...look, combo };
      if (!Scene.drawDoll(bare, appearance)) {
        const deadline = performance.now() + 5000;
        while (b.getImageData(150, 50, 1, 1).data[3] === 0 && performance.now() < deadline) {
          await new Promise(requestAnimationFrame);
        }
      }
      if (b.getImageData(150, 50, 1, 1).data[3] === 0) {
        failures.push({ combo, issue: 'base figure never loaded' });
        continue;
      }
      const base = b.getImageData(0, 0, 300, 450).data;
      b.clearRect(0, 0, 300, 450);
      for (const [index, { name, ...item }] of items.entries()) {
        q.clearRect(0, 0, 364, 514);
        const drawn = Scene.drawDoll(figure, { ...appearance, ...item });
        const gear = q.getImageData(0, 0, 364, 514).data;
        const armed = g.getImageData(0, 0, 300, 450).data;
        let visible = 0, preserved = 0, clipped = 0;
        const fingerBand = item.wpn != null ? [61, 91] : [207, 240];
        for (let y = 0; y < 514; y++) for (let x = 0; x < 364; x++) {
          const source = (y * 364 + x) * 4;
          if (gear[source + 3] < 180) continue;
          const fx = x - 32, fy = y - 32;
          if (fx < 6 || fx >= 294 || fy < 6 || fy >= 444) {
            clipped++;
            continue;
          }
          const p = (fy * 300 + fx) * 4;
          const same = armed[p] === base[p] && armed[p + 1] === base[p + 1] &&
            armed[p + 2] === base[p + 2] && armed[p + 3] === base[p + 3];
          if (!same) visible++;
          if (same && base[p + 3] > 240 && fx >= fingerBand[0] && fx <= fingerBand[1] && fy >= 209 && fy <= 245) preserved++;
        }
        const heldByFingers = item.wpn != null || item.shield >= 23;
        if (!drawn || visible < 100 || (heldByFingers && preserved < 3) || clipped) {
          failures.push({ combo, name, drawn, visible, preserved, clipped });
        }
        if (!makeSheets) continue;
        const plate = Math.floor(index / 2);
        if (!plates[plate]) {
          const sheet = canvas(750, (index === items.length - 1 ? 2 : 4) * 237), s = sheet.getContext('2d');
          s.fillStyle = '#302824';
          s.fillRect(0, 0, sheet.width, sheet.height);
          plates[plate] = sheet;
        }
        const s = plates[plate].getContext('2d'), x = (combo - 1) % 5 * 150;
        const y = ((index % 2) * 2 + Math.floor((combo - 1) / 5)) * 237;
        s.fillStyle = '#eee2cd';
        s.font = '13px sans-serif';
        if (x === 0) s.fillText(name + ' · Body ' + (combo <= 5 ? '1' : '2'), 8, y + 15);
        s.drawImage(figure, x, y + 12, 150, 225);
      }
    }
    bare.remove();
    return { failures, sheets: plates.map(plate => plate.toDataURL()) };
  }, { weapons, makeSheets: info.project.name === 'phone-chromium' });
  await Promise.all(sheets.map((sheet, i) =>
    fs.writeFile(info.outputPath('arming-matrix-' + (i + 1) + '.png'), Buffer.from(sheet.split(',')[1], 'base64'))));
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});

async function waitForDolls(frame) {
  await frame.waitForFunction(() => {
    const [hero, appearance] = ['doll', 'doll2'].map(id => document.getElementById(id));
    return hero && appearance && hero.getContext('2d').getImageData(150, 50, 1, 1).data[3] > 0 &&
      hero.toDataURL() === appearance.toDataURL();
  });
}

test('paper doll in hero and appearance reflects equip, unequip, legacy gear and reload', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await equipment(page);
  const current = id => frame.locator(id).evaluate(cv => cv.toDataURL());
  await waitForDolls(frame);
  const loading = await frame.evaluate(async () => {
    const preview = document.querySelector('#doll2');
    const warm = __bw.HOST.app(), pending = { ...warm, combo: 10, wpn: 9 };
    const deferred = !Scene.drawDoll(preview, pending);
    Scene.drawDoll(preview, warm);
    const current = preview.toDataURL();
    const probe = preview.cloneNode();
    const deadline = performance.now() + 5000;
    let loaded = Scene.drawDoll(probe, pending);
    while (!loaded && performance.now() < deadline) {
      await new Promise(requestAnimationFrame);
      loaded = Scene.drawDoll(probe, pending);
    }
    await new Promise(resolve => setTimeout(resolve, 350));
    return { deferred, loaded, preserved: preview.toDataURL() === current };
  });
  expect(loading).toEqual({ deferred: true, loaded: true, preserved: true });
  await frame.evaluate(() => {
    const { S, ACT } = __bw;
    ACT.unequip({ s: 'weapon' });
    ACT.unequip({ s: 'shield' });
    ACT.looks();
    S.inv.push({ id: 'arming-staff', slot: 'weapon', name: 'Oak Staff', w: 'magery', v: 9,
      rarity: 'epic', ic: 'w_magery_1', stats: { dmg: 6 } });
    S.inv.push({ id: 'arming-sword', slot: 'weapon', name: 'Iron Sword', w: 'swords',
      rarity: 'common', ic: 'w_swords_1', stats: { dmg: 6 } });
    S.inv.push({ id: 'arming-shield', slot: 'shield', name: 'Iron Shield', rarity: 'common',
      ic: 'hq21', off: 20, stats: { def: 2 } });
  });
  await waitForDolls(frame);
  const bare = await current('#doll');

  await frame.evaluate(() => { __bw.ACT.equip({ id: 'arming-staff' }); __bw.ACT.looks(); });
  await waitForDolls(frame);
  const staff = await current('#doll');
  expect(staff === bare).toBe(false);
  expect(await frame.evaluate(() => __bw.HOST.app().wpn)).toBe(9);
  await screenshot(page, info, 'arming-appearance-staff');

  await frame.evaluate(() => { __bw.ACT.unequip({ s: 'weapon' }); __bw.ACT.looks(); });
  await waitForDolls(frame);
  expect((await current('#doll')) === bare).toBe(true);

  await frame.evaluate(() => { __bw.ACT.equip({ id: 'arming-staff' }); __bw.ACT.looks(); });
  await waitForDolls(frame);
  expect((await current('#doll')) === staff).toBe(true);

  await frame.evaluate(() => {
    __bw.ACT.equip({ id: 'arming-sword' });
    __bw.ACT.equip({ id: 'arming-shield' });
  });
  await expect(frame.locator('#doll')).toBeVisible();
  await frame.waitForFunction(() => document.querySelector('#doll').getContext('2d').getImageData(150, 50, 1, 1).data[3] > 0);
  const sword = await current('#doll');
  expect(sword === bare || sword === staff).toBe(false);
  expect(await frame.evaluate(() => [__bw.HOST.app().wpn, __bw.HOST.app().shield])).toEqual([0, 20]);
  await screenshot(page, info, 'arming-hero-sword-and-shield');

  // The fixture's parent clears saves on navigation, so reload the game frame.
  await page.evaluate(() => { document.querySelector('iframe').onload = null; });
  await frame.goto('/index.html?visual_test=1');
  await expect(frame.locator('#artload')).toBeHidden({ timeout: 45000 });
  await frame.locator('[data-a=playslot]').click();
  await expect(frame.locator('#title')).toBeHidden();
  await frame.evaluate(() => { __bw.ACT.tab({ t: 'hero' }); __bw.ACT.looks(); });
  await waitForDolls(frame);
  expect((await current('#doll2')) === sword).toBe(true);
  expect(errors).toEqual([]);
});
