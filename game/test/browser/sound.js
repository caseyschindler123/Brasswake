const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { screenshot } = require('./flow');
const audioSource = fs.readFileSync(path.join(__dirname, '../../src/audio.js'), 'utf8');
const effectSource = fs.readFileSync(path.join(__dirname, '../../src/effects.js'), 'utf8');

async function fixture(page) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  const f = page.frames().find(f => f.url().includes('visual_test=1'));
  await f.evaluate(() => {
    window.__sounds = []; const fn = Sound.sfx;
    Sound.sfx = (name, detail) => { __sounds.push({ name, detail }); fn(name, detail); };
    Scene.pause();
  });
  return f;
}

test('every effect and all spell variants render audio or safely handle unavailable audio', async ({ page }) => {
  const result = await page.evaluate(async ({ audioSource, effectSource }) => {
    const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const getEffects = new Function(effectSource + '; return Effects;');
    const make = (ctx, preference) => {
      const listeners = {}, store = {};
      const Sound = new Function('Effects', 'window', 'navigator', 'document', 'localStorage', 'setInterval', audioSource + '; return Sound;')(
        getEffects(), { AudioContext: ctx ? function () { return new Proxy(ctx, { get(target, key) { if (key === 'state') return 'running'; const v = Reflect.get(target, key, target); return typeof v === 'function' ? v.bind(target) : v; } }); } : undefined }, {},
        { addEventListener(k, fn) { listeners[k] = fn; } }, { getItem: () => preference || null, setItem(k, v) { store[k] = v; } }, () => 1);
      listeners.pointerdown(); return { Sound, store };
    };
    if (!AC) { const { Sound } = make(null); for (const name of Sound.effects()) Sound.sfx(name); Sound.setFx(false); return { unavailable: true, state: Sound.state(), muted: !Sound.pref().fx }; }
    const jobs = make(null).Sound.effects().map(name => ({ name }));
    for (const s of getEffects().spells()) for (const rare of [false, true]) for (const name of ['cast', 'spellHit']) jobs.push({ name, detail: { ...s, rare } });
    for (const family of ['bird', 'small', 'beast', 'dragon', 'spirit', 'stone', 'insect', 'wet', 'bow', 'swing']) jobs.push({ name: 'creature', detail: family });
    const output = [];
    for (const job of [...jobs, { name: 'combat-burst', combo: true }, { name: 'cast', muted: true }]) {
      const ctx = new AC(1, 96000, 48000), { Sound, store } = make(ctx);
      if (job.muted) Sound.setFx(false);
      if (job.combo) { Sound.sfx('cast', getEffects().spell(4, true)); Sound.sfx('spellHit', getEffects().spell(5, true)); Sound.sfx('hurt'); Sound.sfx('win'); Sound.sfx('heal'); Sound.sfx('coins'); }
      else Sound.sfx(job.name, job.detail);
      const d = (await ctx.startRendering()).getChannelData(0);
      let peak = 0, energy = 0; for (const x of d) { peak = Math.max(peak, Math.abs(x)); energy += x * x; }
      if (!Number.isFinite(energy) || peak >= 1 || (job.muted ? energy !== 0 : energy === 0)) throw Error(JSON.stringify({ job, peak, energy }));
      if (job.muted && !Object.values(store).some(v => JSON.parse(v).fx === 0)) throw Error('Mute was not persisted');
      output.push({ name: job.name, id: job.detail?.id, peak });
    }
    return { count: output.length, maxPeak: Math.max(...output.map(x => x.peak)) };
  }, { audioSource, effectSource });
  if (result.unavailable) expect(result).toEqual({ unavailable: true, state: 'none', muted: true });
  else { expect(result.count).toBeGreaterThan(60); expect(result.maxPeak).toBeLessThan(1); }
});

test('sound controls unlock supported audio and persist effects mute across reload', async ({ page }) => {
  let f = await fixture(page);
  await f.locator('#nav [data-t=hero]').click();
  if (await f.locator('[data-a=coachok]').isVisible()) await f.locator('[data-a=coachok]').click();
  await f.locator('[data-a=snd][data-k=fx]').click();
  await expect(f.locator('[data-a=snd][data-k=fx]')).toHaveText('Effects: off');
  const state = await f.evaluate(() => ({ available: !!(window.AudioContext || window.webkitAudioContext), state: Sound.state() }));
  if (state.available) expect(state.state).toBe('running'); else expect(state.state).toBe('none');
  await page.reload(); await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  f = page.frames().find(f => f.url().includes('visual_test=1'));
  expect(await f.evaluate(() => Sound.pref().fx)).toBe(0);
});

test('spell flight defers impact, misses fizzle, healing stays separate, and map changes clear effects', async ({ page }, info) => {
  const f = await fixture(page);
  const results = await f.evaluate(() => {
    const out = [];
    const e = Scene.find(e => e.kind === 'mon' && e.r === 1);
    for (let c = 1; c <= 8; c++) for (const rare of [false, true]) {
      Scene.debug().advanceEffects(3); __sounds.length = 0;
      Scene.FX.swing('me', e, 'spell', Effects.spell(c, rare)); Scene.FX.hit(e, '7');
      const before = { sounds: __sounds.map(x => x.name), floats: Scene.debug().effects.floats.length };
      Scene.debug().advanceEffects(.13);
      const flying = Scene.debug().effects.shots.length;
      Scene.debug().advanceEffects(.14);
      out.push({ id: Effects.spell(c).id, rare, before, flying, sounds: __sounds.map(x => x.name), phase: Scene.debug().effects.slashes.at(-1).phase });
    }
    Scene.debug().advanceEffects(3); __sounds.length = 0;
    Scene.FX.swing('me', e, 'spell', Effects.spell(5)); Scene.FX.hit(e, 'miss'); Scene.debug().advanceEffects(.3);
    const miss = { sounds: __sounds.map(x => x.name), phase: Scene.debug().effects.slashes.at(-1).phase };
    __sounds.length = 0; const p = Scene.debug().P; p.flash = 0;
    Scene.FX.heal(); Scene.FX.hit('me', '+8');
    const heal = { sounds: __sounds.map(x => x.name), flash: p.flash };
    Scene.FX.swing('me', e, 'spell', Effects.spell(8)); Scene.hop(p.x, p.y);
    const cleared = Scene.debug().effects.shots.length + Scene.debug().effects.slashes.length;
    return { out, miss, heal, cleared };
  });
  expect(new Set(results.out.map(x => x.id)).size).toBe(8);
  for (const r of results.out) { expect(r.before).toEqual({ sounds: ['cast'], floats: 0 }); expect(r.flying).toBe(1); expect(r.sounds).toEqual(['cast', 'spellHit']); expect(r.phase).toBe('impact'); }
  expect(results.miss).toEqual({ sounds: ['cast', 'miss'], phase: 'fizzle' });
  expect(results.heal).toEqual({ sounds: ['heal'], flash: 0 }); expect(results.cleared).toBe(0);
  // Review the actual renderer with all eight silhouettes at phone-readable scale.
  await f.evaluate(() => {
    Scene.pause();
    const c = document.createElement('canvas'); c.width = 390; c.height = 720;
    c.style.cssText = 'position:fixed;inset:0;width:390px;height:720px;z-index:99999'; document.body.append(c);
    const g = c.getContext('2d'); g.fillStyle = '#24332e'; g.fillRect(0, 0, 390, 720); g.fillStyle = '#f2e4c7'; g.font = '18px Georgia'; g.fillText('Spell images · cast / flight / impact', 14, 27);
    const names = ['Spark', 'Frost Dart', 'Sunlance', 'Chain Bolt', 'Fireball', 'Crystal Shard', 'Blizzard', 'Rewrite'];
    for (let i = 0; i < 8; i++) { const y = 72 + i * 80; g.fillStyle = '#f2e4c7'; g.font = '14px Georgia'; g.fillText(names[i] + (i % 2 ? ' · rare' : ''), 14, y - 8);
      ['cast', 'flight', 'impact'].forEach((phase, k) => { g.save(); g.translate(65 + k * 125, y + 22); g.scale(2, 2); Effects.drawMagic(g, Effects.spell(i + 1, i % 2), phase, phase === 'impact' ? .3 : .5); g.restore(); });
    }
  });
  await screenshot(page, info, 'magic-gallery');
});

test('game events select actual weapons, activity outcomes, transactions, and chase death cues', async ({ page }) => {
  const f = await fixture(page);
  const result = await f.evaluate(() => {
    const e = Scene.find(e => e.kind === 'mon' && e.r === 1); __bw.S.sk.magery = 100; __bw.S.sk.fencing = 60; __bw.S.eq.weapon = null;
    __sounds.length = 0; Scene.FX.swing('me', e, 'hit'); const physical = __sounds.at(-1).name;
    const families = ['Rat', 'Wolf', 'Gull', 'Spider', 'Stone Golem'].map(name => { Scene.FX.swing({ ...e, name }, 'me', 'hit'); return __sounds.at(-1).detail; });
    __sounds.length = 0; __bw.ACT.buytonic({ c: '1' }); const buy = __sounds.map(x => x.name);
    __sounds.length = 0; __bw.ACT.buytonic({ c: '999999' }); const refused = __sounds.map(x => x.name);
    __bw.ACT.closesheet(); __bw.S.hp = 1; e.chase = 5; __sounds.length = 0; __bw.HOST.ambush(e);
    return { physical, families, buy, refused, death: __sounds.filter(x => x.name === 'death').length };
  });
  expect(result.physical).toBe('thrust'); expect(result.families).toEqual(['small', 'beast', 'bird', 'insect', 'stone']);
  expect(result.buy).toEqual(['coins']); expect(result.refused).toEqual([]); expect(result.death).toBe(1);
});

test('magic remains readable during an actual fight', async ({ page }, info) => {
  const f = await fixture(page);
  await f.evaluate(() => {
    const e = Scene.find(e => e.kind === 'mon' && e.r === 1 && e.inst.tpl === 'b102' && !e.inst.elite);
    Scene.warp(e.x - 3, e.y); __bw.HOST.interact(e);
  });
  await f.waitForTimeout(900);
  if (await f.locator('[data-a=coachok]').isVisible()) await f.locator('[data-a=coachok]').click();
  await f.evaluate(() => {
    Scene.pause(); const e = __bw.F.ent;
    Scene.FX.swing('me', e, 'spell', Effects.spell(5)); Scene.FX.hit(e, '12', '#ffe9a0');
    Scene.debug().advanceEffects(.13); Scene.debug().draw();
  });
  await screenshot(page, info, 'fireball-flight');
  await f.evaluate(() => { Scene.debug().advanceEffects(.14); Scene.debug().advanceEffects(.07); Scene.debug().draw(); });
  await screenshot(page, info, 'fireball-impact');
});

test('crafting and fishing outcomes and walked room crossings have contextual sounds', async ({ page }) => {
  const f = await fixture(page);
  const result = await f.evaluate(() => {
    const random = Math.random, crafts = [], fish = [];
    __bw.S.pages.c1 = 1; __bw.S.mats[1] = 200; __bw.S.sk.smith = __bw.S.sk.alchemy = 80;
    try {
      for (const [id, roll] of [['uncommon', .01], ['tonic', .01], ['tonic', .999]]) {
        __bw.ACT.craft({ id }); document.querySelector('#sql').value = __bw.Q.task.sql;
        Math.random = () => roll; __sounds.length = 0; __bw.ACT.run(); crafts.push(__sounds.map(x => x.name)); Math.random = random; __bw.ACT.qleave();
      }
      const e = Scene.find(e => e.kind === 'fish' && e.r === 1);
      for (const roll of [.01, .999]) {
        __bw.setCE(e); __sounds.length = 0; __bw.ACT.cast({ i: '0' }); const cast = __sounds.map(x => x.name);
        document.querySelector('#sql').value = __bw.FI.task.sql; Math.random = () => roll; __sounds.length = 0; __bw.ACT.run(); fish.push({ cast, outcome: __sounds.map(x => x.name) }); Math.random = random; __bw.ACT.fileave();
      }
    } finally { Math.random = random; }
    Scene.pause();
    const { map } = Scene.debug();
    // Keep live occupancy and collision, but prevent patrols from changing the
    // availability of the selected doorway between setup and the walking step.
    for (const e of map.ents) if (e.wander) {
      e.wander = 0; e.tx = null; e.fx = e.x; e.fy = e.y;
    }
    const open = ([x, y]) => {
      const i = y * map.w + x;
      return map.seen[i] && !map.solid[i] && !map.occ.has(i) && map.t[i] !== 4;
    };
    const taverns = map.blds.filter(b => b.enter && b.slot === 'tavern' && b.modular && b.room.fl === 'floor');
    for (const room of taverns.sort((a, b) => a.r - b.r)) {
      const world = p => [room.x + p.x, room.y + p.y];
      for (const d of room.plan.doors) {
        const [outside, door, inside] = [d.outside, d, d.inside].map(world);
        const far = [outside[0] * 2 - door[0], outside[1] * 2 - door[1]];
        if (![far, outside, door, inside].every(open)) continue;
        Scene.load(far, room.r);
        return { crafts, fish, far, outside, door, roomId: room.plan.id };
      }
    }
    throw new Error('No unoccupied wood-floored tavern entrance');
  });
  expect(result.crafts[0]).toContain('smith'); expect(result.crafts[1]).toContain('alchemy'); expect(result.crafts[2]).toContain('craftFail');
  for (const fish of result.fish) expect(fish.cast).toContain('fishCast');
  expect(result.fish[0].outcome).toContain('fishCatch'); expect(result.fish[1].outcome).toContain('fishEmpty');
  await f.waitForFunction(() => !Scene.debug().map.pending);
  const start = await f.evaluate(id => {
    Scene.debug().draw();
    const room = Scene.debug().map.blds.find(b => b.plan?.id === id);
    const before = { position: Scene.pos(), inside: room.inside };
    __sounds.length = 0;
    Scene.resume();
    return before;
  }, result.roomId);
  expect(start).toEqual({ position: result.far, inside: false });
  const dx = result.door[0] - result.outside[0], dy = result.door[1] - result.outside[1];
  expect(Math.abs(dx) + Math.abs(dy)).toBe(1);
  const key = dx > 0 ? 'ArrowRight' : dx < 0 ? 'ArrowLeft' : dy > 0 ? 'ArrowDown' : 'ArrowUp';
  await f.locator('body').evaluate(body => { body.tabIndex = -1; body.focus({ preventScroll: true }); });
  for (const at of [result.outside, result.door]) {
    await page.keyboard.down(key);
    try {
      await f.waitForFunction(() => Scene.traveling(), null, { timeout: 3500 });
    } finally {
      await page.keyboard.up(key);
    }
    await expect.poll(() => f.evaluate(() => Scene.pos())).toEqual(at);
    await f.waitForFunction(() => !Scene.traveling());
  }
  await f.waitForFunction(() => __sounds.some(x => x.name === 'door'), null, { timeout: 5000 });
  expect(await f.evaluate(() => Scene.pos())).toEqual(result.door);
  const steps = await f.evaluate(() => { Scene.pause(); return __sounds.filter(x => x.name === 'step'); });
  expect(steps.some(x => x.detail === 'wood')).toBe(true);
});
