const { test, expect } = require('@playwright/test');
const { screenshot } = require('./flow');
async function dismissCoach(frame) { const b = frame.locator('[data-a=coachok]'); if (await b.isVisible()) await b.click(); }

async function fixture(page) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  const f = page.frames().find(f => f.url().includes('visual_test=1'));
  await f.evaluate(() => Scene.pause());
  return f;
}

test('all 28 music files decode with valid loops and audible finite samples', async ({ page }) => {
  test.setTimeout(180000);
  const f = await fixture(page);
  const result = await f.evaluate(async () => {
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const AC = Offline || window.AudioContext || window.webkitAudioContext;
    if (!AC) return { available: false, count: Object.keys(Sound.MUSIC).length };
    const ctx = Offline ? new AC(2, 1, 44100) : new AC({ sampleRate: 44100 }), rows = [];
    for (const [id, meta] of Object.entries(Sound.MUSIC)) {
      const response = await fetch('art/mu/' + id + (meta.loop === false ? '.wav' : '.mp3'));
      if (!response.ok) throw Error(id + ': HTTP ' + response.status);
      const b = await ctx.decodeAudioData(await response.arrayBuffer());
      if (meta.loop !== false && b.duration < meta.b) throw Error(id + ': invalid loop end ' + b.duration + ' < ' + meta.b);
      // PCM cues retain exact frames on every decoder; metadata is rounded to microseconds.
      if (meta.loop === false && Math.abs(b.duration - meta.b) > 1 / b.sampleRate) throw Error(id + ': cue duration ' + b.duration + ' disagrees with ' + meta.b);
      if (meta.loop !== false && b.duration - meta.b < .85) throw Error(id + ': missing decoder safety tail');
      let energy = 0, peak = 0;
      for (let c = 0; c < b.numberOfChannels; c++) {
        const d = b.getChannelData(c);
        for (let k = 0; k < d.length; k += 127) { if (!Number.isFinite(d[k])) throw Error(id + ': non-finite sample'); energy += d[k] * d[k]; peak = Math.max(peak, Math.abs(d[k])); }
      }
      if (!(energy > .01 && peak < 1)) throw Error(id + ': silence or clipping: ' + energy + ', ' + peak);
      rows.push({ id, duration: b.duration, peak });
    }
    if (ctx.close) await ctx.close();
    return { available: true, count: rows.length, rows };
  });
  expect(result.count).toBe(28);
  if (!result.available) {
    expect(await f.evaluate(() => !!(window.AudioContext || window.webkitAudioContext))).toBe(false);
  } else expect(result.rows.every(r => r.peak > 0 && r.peak < 1)).toBe(true);
});

test('scene contexts distinguish eight towns, wilderness, eight dungeons, dojo and tavern', async ({ page }) => {
  const f = await fixture(page);
  const result = await f.evaluate(() => {
    const towns = [], wild = [], dungeons = [];
    for (let r = 1; r <= 8; r++) {
      const t = Scene.towns()[r]; Scene.load([t[0], t[1] + 3], r);
      towns.push(Sound.trackFor(Scene.musicContext()));
      const m = Scene.debug().map;
      const i = m.reg.findIndex((region, k) => region === r && !m.solid[k] && m.t[k] !== 4 && !m.occ.has(k)
        && (Math.abs(k % m.w - t[0]) > 40 || Math.abs(Math.floor(k / m.w) - t[1]) > 40));
      if (i < 0) throw Error('No wilderness fixture for ' + r);
      Scene.warp(i % m.w, Math.floor(i / m.w)); wild.push(Sound.trackFor(Scene.musicContext()));
      Scene.load([t[0], t[1] + 3], r);
      const e = Scene.find(e => e.kind === 'stairs' && e.r === r); __bw.setCE(e); __bw.START.dungeon();
      dungeons.push(Sound.trackFor(Scene.musicContext()));
    }
    const t = Scene.towns()[1]; Scene.load([t[0], t[1] + 3], 1);
    const room = Scene.debug().map.blds.find(b => b.enter && b.slot === 'tavern');
    Scene.load([room.x + room.room.door, room.y + room.h - 2], 1); const tavern = Sound.trackFor(Scene.musicContext());
    Scene.enterHall(1, []); const dojo = Sound.trackFor(Scene.musicContext()); Scene.pause();
    return { towns, wild, dungeons, tavern, dojo };
  });
  expect(new Set(result.towns).size).toBe(8); expect(new Set(result.dungeons).size).toBe(8);
  expect(result.wild).toEqual(['m_wild_coast', 'm_wild_coast', 'm_wild_fields', 'm_wild_fields', 'm_wild_stone', 'm_wild_stone', 'm_wild_north', 'm_wild_north']);
  expect(result.tavern).toBe('m_tavern'); expect(result.dojo).toBe('m_dojo');
});

test('a gesture starts actual music, contexts crossfade, and music mute persists', async ({ page }, info) => {
  test.setTimeout(120000);
  let f = await fixture(page);
  await f.locator('#nav [data-t=hero]').click(); await dismissCoach(f);
  await expect(f.locator('[data-a=snd][data-k=mu]')).toHaveText('Music: on');
  const available = await f.evaluate(() => !!(window.AudioContext || window.webkitAudioContext));
  if (available) {
    await f.waitForFunction(() => Sound.playing() === 'm_tallyport', null, { timeout: 20000 });
    await f.evaluate(() => {
      __bw.ACT.closesheet(); const t = Scene.towns()[2]; Scene.load([t[0], t[1] + 3], 2); Scene.pause();
    });
    await f.waitForFunction(() => Sound.playing() === 'm_brackwater', null, { timeout: 20000 });
    await f.evaluate(() => { const e = Scene.find(e => e.kind === 'casino' && e.r === 2); __bw.HOST.interact(e); });
    await f.waitForFunction(() => Sound.playing() === 'm_cards', null, { timeout: 20000 });
    await f.evaluate(() => { __bw.ACT.closesheet(); const e = Scene.find(e => e.kind === 'mon' && e.r === 2); Scene.warp(e.x + 1, e.y); __bw.HOST.interact(e); });
    await f.waitForFunction(() => Sound.playing() === 'm_combat', null, { timeout: 20000 });
    await f.evaluate(() => { __bw.ACT.fdone(); const e = Scene.find(e => e.kind === 'boss' && e.r === 2); __bw.setCE(e); __bw.START.boss(); });
    await f.waitForFunction(() => Sound.playing() === 'm_examiner', null, { timeout: 20000 });
    expect(await f.evaluate(() => Sound.status().cached.length)).toBeLessThanOrEqual(2);
    await f.evaluate(() => { __bw.ACT.fdone(); Sound.setFx(false); Sound.sfx('win'); });
    await f.waitForFunction(() => Sound.playing() === 'm_victory', null, { timeout: 20000 });
    await f.waitForFunction(() => Sound.playing() === Sound.trackFor(Scene.musicContext()), null, { timeout: 20000 });
    await f.evaluate(() => Sound.sfx('death'));
    await f.waitForFunction(() => Sound.playing() === 'm_death', null, { timeout: 20000 });
    await f.evaluate(() => { Sound.setFx(true); __bw.ACT.tab({ t: 'hero' }); });
  } else expect(await f.evaluate(() => Sound.state())).toBe('none');
  await dismissCoach(f);
  await f.locator('[data-a=snd][data-k=mu]').click();
  await expect(f.locator('[data-a=snd][data-k=mu]')).toHaveText('Music: off');
  await expect(f.locator('[data-a=snd][data-k=fx]')).toHaveText('Effects: on');
  expect(await f.evaluate(() => Sound.playing())).toBe(null);
  await screenshot(page, info, 'soundtrack-settings');
  await page.reload(); await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  f = page.frames().find(f => f.url().includes('visual_test=1'));
  expect(await f.evaluate(() => Sound.pref().mu)).toBe(0);
});
