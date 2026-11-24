const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');
const { drivePath } = require('./movement');

const action = (frame, name, extra = '') => frame.locator(`[data-a=${name}]${extra}`);
const position = frame => frame.evaluate(() => Scene.pos());
const row = (x, y, count, dx) => Array.from({ length: count }, (_, i) => [x + dx * i, y]);

for(const heavy of [false,true])test(`Backstab · Hide displays its actual ${heavy?'heavy armor':'light armor'} odds before practice`,async({page},info)=>{
  const errors=observeErrors(page),{frame}=await fixture(page);
  if(heavy)await frame.evaluate(()=>{const armor=__bw.makeItem('rare',1,'armor');__bw.S.inv.push(armor);__bw.ACT.equip({id:armor.id});});
  await action(frame,'conceal').click();await dismiss(frame);
  await expect(frame.locator('#enc')).toContainText((heavy?'41':'61')+'% if the query is correct');
  await expect(frame.locator('#enc')).toContainText('0% if it’s wrong');
  if(heavy)await expect(frame.locator('#enc')).toContainText('Heavy armor lowers concealment by 20 percentage points');
  await screenshot(page,info,'hide-armor-odds');
  await frame.locator('#sql').fill(await frame.evaluate(()=>__bw.Q.task.sql));
  // The roll is just above the advertised threshold, but below the threshold
  // that the newly earned Hiding gain would produce if applied prematurely.
  await withRoll(frame,heavy ? .412 : .612,async()=>{await frame.locator('#kb [data-fn=run]').click();await expect(frame.locator('#enc')).toContainText('Try again');});
  expect(await frame.evaluate(()=>__bw.S.sk.hiding)).toBeGreaterThan(40);
  expect(await frame.evaluate(()=>__bw.CONCEAL.hidden)).toBe(false);
  expect(errors).toEqual([]);
});
const wrongAnswer = 'SELECT -987654321 AS unrelated_result';

async function move(frame, path, run) {
  await expect(frame.getByRole('group', { name: 'Movement joystick' })).toHaveAttribute('aria-disabled', 'false');
  await drivePath(frame, path, run);
}

async function dismiss(frame) {
  const coach = action(frame, 'coachok');
  if (await coach.isVisible()) await coach.click();
}

async function fixture(page, { kind = 'mon', region = 1 } = {}) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  const frame = page.frames().find(f => f.url().includes('visual_test=1'));
  const lane = await frame.evaluate(({ kind, region }) => {
    Sound.setMu(false);
    window.__bwFast = true;
    const s = __bw.S, blade = __bw.makeItem('common', 1, 'weapon', 'fencing');
    blade.stats = {};
    s.inv = [blade];
    s.eq = { weapon: blade.id };
    s.pages = { a1: 1, h1: 1 };
    s.sk = { fencing: 40, hiding: 40, stealth: 10 };
    s.skillModes = { stealth: 'lock' };
    s.stamina = 35;
    s.hp = __bw.maxHp();
    if (kind === 'keeper') {
      __bw.DP.enter(1);
      __bw.DP.floor(Dungeons.get(1).floors.length - 1);
    }
    const map = Scene.debug().map;
    for (const actor of map.ents) {
      actor.wander = 0;
      actor.agg = 0;
      actor.alert = 0;
      actor.fx = actor.x;
      actor.fy = actor.y;
      actor.tx = null;
    }
    const target = Scene.find(e => e.kind === kind && e.r === region &&
      (kind !== 'mon' || e.inst.tpl[0] === 'b' && !e.inst.lair));
    if (!target) throw Error('Missing ' + kind);
    if (kind === 'mon') target.inst.elite = true;
    const bounds = kind === 'keeper' ? map.layout.rooms.find(r => r.id === target.room) : null;
    const town = Scene.towns()[region];
    const [x0, x1, y0, y1] = bounds
      ? [bounds.x, bounds.x + bounds.w, bounds.y, bounds.y + bounds.h]
      : [town[0] - 46, town[0] + 46, town[1] - 38, town[1] + 38];
    const length = kind === 'keeper' ? 13 : 17;
    const clear = (x, y) => {
      const i = y * map.w + x, occupant = map.occ.get(i);
      return x > 0 && x < map.w - 1 && y > 0 && y < map.h - 1 &&
        !map.solid[i] && (!occupant || occupant === target) &&
        (bounds || (map.seen[i] && map.reg[i] === region && !map.blds.some(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)));
    };
    for (let y = y0; y < y1; y++) for (let x = x0; x + length <= x1; x++) {
      if (!Array.from({ length }, (_, i) => clear(x + i, y)).every(Boolean)) continue;
      if (map.ents.some(e => e !== target && ['mon', 'boss', 'guard', 'keeper', 'rival'].includes(e.kind) &&
        Math.hypot(e.x - (x + 2), e.y - y) < 6.5)) continue;
      if (map.ents.some(e => e !== target && !e.hidden &&
        Math.abs(e.x - (x + 1)) + Math.abs(e.y - y) <= 1)) continue;
      Scene.hallMove(target, x, y);
      target.dir = 'l';
      Scene.hop(x + 2, y);
      window.backstabFixtureTarget = target;
      return { x, y, length };
    }
    throw Error('No open pursuit lane for ' + kind);
  }, { kind, region });
  await dismiss(frame);
  return { frame, lane };
}

async function withRoll(frame, value, perform) {
  await frame.evaluate(value => {
    window.backstabTestRandom = Math.random;
    Math.random = () => value;
  }, value);
  try { await perform(); }
  finally {
    await frame.evaluate(() => {
      Math.random = window.backstabTestRandom;
      delete window.backstabTestRandom;
    });
  }
}

async function submit(frame, context, next, sql) {
  await dismiss(frame);
  await expect(frame.locator('#sql')).toBeVisible();
  const text = sql ?? await frame.evaluate(context => __bw[context].task.sql, context);
  await frame.locator('#sql').fill(text);
  await withRoll(frame, 0, async () => {
    await frame.locator('#kb [data-fn=run]').click();
    await expect(next).toBeVisible();
  });
}

async function beginHide(frame, lane) {
  expect(await position(frame)).toEqual([lane.x + 2, lane.y]);
  await expect.poll(() => frame.evaluate(() => Scene.observed())).toBe(false);
  await expect(action(frame, 'conceal')).toHaveText('Hide · SQL');
  await action(frame, 'conceal').click();
  await expect(frame.locator('#sql')).toBeVisible();
}

async function finishHideAndApproach(frame, lane) {
  await submit(frame, 'Q', frame.locator('#enc .q-foot [data-a=qleave]'));
  await expect(frame.locator('#enc')).toContainText('You are concealed.');
  await frame.locator('#enc .q-foot [data-a=qleave]').click();
  const reveal = action(frame, 'conceal');
  await expect(reveal).toHaveText(/Reveal · [1-9]\d* steps/);
  const available = Number((await reveal.textContent()).match(/\d+/)[0]);
  await move(frame, [[lane.x + 1, lane.y]], false);
  expect(await position(frame)).toEqual([lane.x + 1, lane.y]);
  await expect(reveal).toHaveText(`Reveal · ${available - 1} steps`);
  await expect(frame.locator('#ctx')).toContainText('Backstab ready');
}

async function hideAndApproach(frame, lane) {
  await beginHide(frame, lane);
  await finishHideAndApproach(frame, lane);
}

async function engage(frame, examiner = false) {
  await frame.locator('#ctx').click();
  if (examiner) await action(frame, 'start', '[data-k=boss]').click();
  await expect(frame.locator('#fight')).toBeVisible();
  await dismiss(frame);
  expect(await frame.evaluate(() => __bw.F.ent === window.backstabFixtureTarget)).toBe(true);
}

const combatState = frame => frame.evaluate(() => ({
  foe: __bw.F.foe.hp, max: __bw.F.foe.max, round: __bw.F.round, hp: __bw.S.hp,
  hidden: __bw.CONCEAL.hidden, stamina: __bw.S.stamina, q: __bw.S.stats.q,
  sk: { ...__bw.S.sk }, attr: { ...__bw.S.attr }, sql: structuredClone(__bw.S.skills),
  gold: __bw.S.gold, kills: __bw.S.stats.kills,
  marks: Object.keys(__bw.S.boss).length,
}));

test('Backstab · real concealed rear walk at Stealth 10 unlocks two Fencing thrusts', async ({ page }, info) => {
  const errors = observeErrors(page), { frame, lane } = await fixture(page);
  await hideAndApproach(frame, lane);
  const context = frame.locator('#ctx');
  await expect(context).toBeVisible();
  await expect(context).toHaveText('Backstab ready');
  const targetName = await frame.evaluate(() => window.backstabFixtureTarget.name);
  await expect(context).toHaveAccessibleName(/Backstab ready/i);
  expect(await context.getAttribute('aria-label')).toContain(targetName);
  expect(await context.evaluate(button => {
    const range = document.createRange();
    range.selectNodeContents(button);
    const label = range.getBoundingClientRect(), control = button.getBoundingClientRect();
    return label.width > 0 && label.left >= control.left && label.right <= control.right;
  })).toBe(true);
  await screenshot(page, info, 'backstab-ready');
  await engage(frame);
  const ready = action(frame, 'fbackstab');
  await expect(ready).toBeEnabled();
  await expect(frame.locator('#fight')).toContainText('Two rapid Fencing strikes');
  expect((await ready.boundingBox()).y).toBeLessThan((await action(frame, 'fpage').first().boundingBox()).y);
  await screenshot(page, info, 'backstab-first-action');
  const initial = await combatState(frame);
  expect(initial.sk.stealth).toBe(10);
  await ready.click();
  await expect(frame.locator('#fight .f-head b')).toHaveText('Backstab');
  await submit(frame, 'F', action(frame, 'fchoose'));
  const result = await combatState(frame);
  expect(result.stamina).toBe(initial.stamina - 8 + 4);
  expect(result.hidden).toBe(false);
  expect(result.round).toBe(1);
  expect(result.sk.fencing).toBeGreaterThan(initial.sk.fencing);
  expect(result.sk.tactics).toBeGreaterThan(0);
  expect(result.sk.anatomy).toBeGreaterThan(0);
  expect(result.hp).toBeLessThan(initial.hp);
  const hits = (await frame.locator('#e-sw .hit').allTextContents()).map(Number);
  expect(hits).toHaveLength(2);
  expect(hits.every(hit => hit >= 25)).toBe(true);
  expect(initial.foe - result.foe).toBe(hits[0] + hits[1]);
  await expect(frame.locator('#e-sw .rd')).toHaveCount(1);
  await expect(frame.locator('#e-sw .ouch')).toHaveCount(2);
  await screenshot(page, info, 'backstab-thrusts');
  await action(frame, 'fchoose').click();
  await expect(ready).toBeDisabled();
  await expect(frame.locator('#fight')).toContainText('Hide before approaching.');
  expect(errors).toEqual([]);
});

for (const method of ['wrong', 'shown', 'low stamina']) {
  test(`Backstab · ${method} cannot award a bonus thrust or RPG gain`, async ({ page }) => {
    const errors = observeErrors(page), { frame, lane } = await fixture(page);
    await hideAndApproach(frame, lane);
    await engage(frame);
    await action(frame, 'fbackstab').click();
    await dismiss(frame);
    if (method === 'shown') await action(frame, 'fshow').click();
    if (method === 'low stamina') await frame.evaluate(() => { __bw.S.stamina = 7; });
    const before = await combatState(frame);
    if (method === 'low stamina') {
      // Stamina falls after opening the query in this prepared fixture, exercising the commit guard.
      await submit(frame, 'F', action(frame, 'fbackstab'));
      await expect(action(frame, 'fbackstab')).toBeDisabled();
      await expect(frame.locator('#fight')).toContainText('Backstab needs 8 stamina.');
      expect(await combatState(frame)).toEqual(before);
    } else {
      const sql = method === 'wrong' ? wrongAnswer : undefined;
      await submit(frame, 'F', action(frame, 'fchoose'), sql);
      const after = await combatState(frame);
      expect(after.sk).toEqual(before.sk);
      expect(after.attr).toEqual(before.attr);
      expect(after.sql).toEqual(before.sql);
      expect(after.hidden).toBe(false);
      expect(after.stamina).toBe(before.stamina - 4);
      const damage = before.foe - after.foe;
      // Pinned low rolls let ordinary wrong-answer hits land. Their damage stays at base Fencing size.
      expect(damage).toBeGreaterThan(0);
      expect(damage).toBeLessThan(32);
      await expect(frame.locator('#e-sw .rd')).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });
}

for (const method of ['wrong', 'shown']) {
  test(`Backstab · lethal ${method} answer heals on victory without awarding training`, async ({ page }) => {
    const errors = observeErrors(page), { frame, lane } = await fixture(page);
    await hideAndApproach(frame, lane);
    await engage(frame);
    const bandage = await frame.evaluate(() => {
      __bw.F.foe.hp = 1;
      __bw.S.hp = __bw.maxHp() - 20;
      return Progression.bandage(__bw.S);
    });
    await action(frame, 'fbackstab').click();
    await dismiss(frame);
    if (method === 'shown') await action(frame, 'fshow').click();
    const before = await combatState(frame);
    await submit(frame, 'F', action(frame, 'floot'), method === 'wrong' ? wrongAnswer : undefined);
    const result = await combatState(frame);
    expect(await frame.evaluate(() => ({ grade: __bw.F.res.grade, shown: !!__bw.F.shown })))
      .toEqual(method === 'wrong' ? { grade: 'wrong', shown: false } : { grade: 'correct', shown: true });
    expect(result.foe).toBeLessThanOrEqual(0);
    expect(result.kills).toBe(before.kills + 1);
    expect(result.hp).toBe(before.hp + bandage);
    expect(result.sk).toEqual(before.sk);
    expect(result.attr).toEqual(before.attr);
    expect(result.sql).toEqual(before.sql);
    expect(errors).toEqual([]);
  });
}

async function disengage(frame) {
  await withRoll(frame, 0, async () => {
    await action(frame, 'flee').click();
    await expect(frame.locator('#fight')).toBeHidden();
  });
}

test('Backstab · Examiner pursuit, escape and re-entry keep wounds and the next SQL phase', async ({ page }, info) => {
  test.setTimeout(90000);
  const errors = observeErrors(page), { frame, lane } = await fixture(page, { kind: 'boss' });
  const { x, y, length } = lane;
  await hideAndApproach(frame, lane);
  await engage(frame, true);
  const full = await combatState(frame);
  await action(frame, 'fbackstab').click();
  await expect(frame.locator('#fight .ask')).toContainText('lead_time_days');
  await submit(frame, 'F', action(frame, 'fchoose'));
  const wounded = await combatState(frame);
  expect(wounded.foe).toBeLessThan(full.foe);
  expect(wounded.foe).toBeGreaterThan(0);
  await disengage(frame);
  await move(frame, row(x + 2, y, length - 2, 1), true);
  expect(await position(frame)).toEqual([x + length - 1, y]);
  await expect.poll(() => frame.evaluate(() => {
    const e = window.backstabFixtureTarget;
    return Math.hypot(e.x - e.pursuitAnchor[0], e.y - e.pursuitAnchor[1]);
  })).toBeGreaterThan(0);
  await frame.waitForFunction(() => window.backstabFixtureTarget.returning, null, { timeout: 10000 });
  expect(await frame.evaluate(() => {
    const e = window.backstabFixtureTarget;
    return Math.hypot(e.x - e.pursuitAnchor[0], e.y - e.pursuitAnchor[1]);
  })).toBeLessThanOrEqual(8);
  await frame.waitForFunction(({ x, y }) => {
    const e = window.backstabFixtureTarget;
    return e.x === x && e.y === y && e.tx == null && !e.returning && e.chase === 0;
  }, { x, y }, { timeout: 15000 });
  const preKill = await frame.evaluate(() => ({ gold: __bw.S.gold, kills: __bw.S.stats.kills, marks: Object.keys(__bw.S.boss).length }));
  expect(preKill).toEqual({ gold: full.gold, kills: full.kills, marks: full.marks });

  await move(frame, row(x + length - 2, y, length - 3, -1), true);
  await beginHide(frame, lane);
  const paused = await frame.evaluate(() => {
    const readWallClock = Date.now;
    window.restoreBackstabWallClock = () => { Date.now = readWallClock; };
    const wall = readWallClock(), active = Scene.tacticalTime();
    Date.now = () => readWallClock() + 180000;
    return { wall, active };
  });
  let resumed;
  try {
    // Keep the offset until re-entry so wall-clock expiry would drop the wound.
    await frame.waitForTimeout(250);
    const inQuestion = await frame.evaluate(() => ({ wall: Date.now(), active: Scene.tacticalTime() }));
    expect(inQuestion.wall - paused.wall).toBeGreaterThanOrEqual(180000);
    expect(inQuestion.active).toBe(paused.active);
    await finishHideAndApproach(frame, lane);
    expect(await frame.evaluate(() => Scene.tacticalTime())).toBeGreaterThan(paused.active);
    await frame.locator('#ctx').click();
    await expect(frame.locator('#enc')).toContainText(wounded.foe + ' health');
    await action(frame, 'start', '[data-k=boss]').click();
    await dismiss(frame);
    resumed = await combatState(frame);
    expect(resumed.foe).toBe(wounded.foe);
    expect(resumed.round).toBe(wounded.round);
    await action(frame, 'fbackstab').click();
    await expect(frame.locator('#fight .ask')).toContainText('unit_price');
  } finally {
    await frame.evaluate(() => {
      window.restoreBackstabWallClock();
      delete window.restoreBackstabWallClock;
    });
  }
  await screenshot(page, info, 'backstab-resumed-examiner');
  await submit(frame, 'F', action(frame, 'fchoose'));
  const second = await combatState(frame);
  expect(second.foe).toBeLessThan(resumed.foe);
  expect(second.foe).toBeGreaterThan(0);
  expect(second.gold).toBe(full.gold);
  expect(second.kills).toBe(full.kills);
  await disengage(frame);
  await action(frame, 'conceal').click();
  await expect(frame.locator('#toast')).toContainText('Break their line of sight or get farther away');
  expect(await frame.evaluate(() => __bw.Q)).toBe(null);
  await expect(frame.locator('#fight')).toBeVisible();
  const caught = await combatState(frame);
  expect(caught.foe).toBe(second.foe);
  expect(caught.round).toBe(second.round);
  expect(caught.hp).toBeLessThan(second.hp);
  await action(frame, 'fpage', '[data-id=a1]').click();
  await submit(frame, 'F', action(frame, 'fdone'));
  const won = await combatState(frame);
  expect(won.foe).toBeLessThanOrEqual(0);
  expect(won.marks).toBe(full.marks + 1);
  expect(won.kills).toBe(full.kills + 1);
  expect(won.gold).toBeGreaterThan(full.gold);
  expect(errors).toEqual([]);
});

test('Backstab · keeper pursuit stays in the dungeon and returns to its anchor', async ({ page }) => {
  test.setTimeout(90000);
  const errors = observeErrors(page), { frame, lane } = await fixture(page, { kind: 'keeper' });
  await hideAndApproach(frame, lane);
  await engage(frame);
  await action(frame, 'fbackstab').click();
  await submit(frame, 'F', action(frame, 'fchoose'));
  const wounded = await combatState(frame);
  await disengage(frame);
  await expect.poll(() => frame.evaluate(() => window.backstabFixtureTarget.chase)).toBeGreaterThan(0);
  await move(frame, row(lane.x + 2, lane.y, lane.length - 2, 1), true);
  expect(await position(frame)).toEqual([lane.x + lane.length - 1, lane.y]);
  await frame.waitForFunction(() => window.backstabFixtureTarget.returning, null, { timeout: 10000 });
  expect(await frame.evaluate(() => window.backstabFixtureTarget.x - window.backstabFixtureTarget.pursuitAnchor[0])).toBeLessThanOrEqual(8);
  await frame.waitForFunction(({ x, y }) => {
    const e = window.backstabFixtureTarget;
    return e.x === x && e.y === y && e.tx == null && !e.returning;
  }, lane, { timeout: 15000 });
  await move(frame, row(lane.x + lane.length - 2, lane.y, lane.length - 2, -1), true);
  await engage(frame);
  expect(await frame.evaluate(() => ({ kind: __bw.F.kind, keeper: __bw.F.keeper, claimed: __bw.DP.current().keeper })))
    .toEqual({ kind: 'dungeon', keeper: 1, claimed: false });
  expect((await combatState(frame)).foe).toBe(wounded.foe);
  expect(errors).toEqual([]);
});

test('Backstab · pursuit entry cannot bypass the Council marks or main-character gate', async ({ page }) => {
  const errors = observeErrors(page), { frame, lane } = await fixture(page, { kind: 'boss', region: 8 });
  await move(frame, [[lane.x + 1, lane.y]], false);
  await frame.locator('#ctx').click();
  await expect(action(frame, 'start', '[data-k=boss]')).toBeDisabled();
  await action(frame, 'cardno').click();
  const hp = await frame.evaluate(() => __bw.S.hp);
  for (const main of [true, false]) {
    await frame.evaluate(main => {
      if (!main) {
        __bw.A.main = (__bw.A.cur + 1) % 5;
        __bw.S.boss = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map(r => [r, Date.now()]));
      }
      // Seed pursuit on this otherwise inaccessible examiner to exercise the contact entry.
      Scene.chase(window.backstabFixtureTarget, 20);
    }, main);
    await expect(frame.locator('#toast')).toContainText(main ? 'requires the other seven marks' : 'Only the main character');
    await expect(frame.locator('#fight')).toBeHidden();
    expect(await frame.evaluate(() => __bw.S.hp)).toBe(hp);
  }
  expect(errors).toEqual([]);
});

test('Backstab · switching character clears pursuit and wounds from the previous owner', async ({ page }, info) => {
  const errors = observeErrors(page), { frame, lane } = await fixture(page);
  const reserve = await frame.evaluate(({ x, y, length }) => {
    __bw.save();
    const a = __bw.A, slot = (a.cur + 1) % a.slots.length;
    a.slots[slot] = { ...structuredClone(a.slots[a.cur]), name: 'Reserve tester', pos: [x + length - 1, y] };
    return slot;
  }, lane);
  await hideAndApproach(frame, lane);
  await engage(frame);
  const before = await combatState(frame);
  await action(frame, 'fbackstab').click();
  await submit(frame, 'F', action(frame, 'fchoose'));
  expect((await combatState(frame)).foe).toBeLessThan(before.max);
  await disengage(frame);
  await move(frame, row(lane.x + 2, lane.y, 5, 1), true);
  expect(await frame.evaluate(() => window.backstabFixtureTarget.chase)).toBeGreaterThan(0);
  await frame.locator('#nav [data-t=hero]').click();
  await dismiss(frame);
  await action(frame, 'reset').click();
  await action(frame, 'playslot', `[data-i="${reserve}"]`).click();
  await expect(frame.locator('#title')).toBeHidden();
  expect(await frame.evaluate(() => ({
    name: __bw.S.name, chase: window.backstabFixtureTarget.chase, hunt: !!window.backstabFixtureTarget.hunt,
  }))).toEqual({ name: 'Reserve tester', chase: 0, hunt: false });

  expect(await frame.evaluate(() => {
    const e = window.backstabFixtureTarget;
    // The fixture freezes ordinary wandering. Settle the pursuit's in-flight
    // tile before compressing travel; otherwise the frozen sprite can remain
    // more than interaction distance from its occupied grid tile.
    Scene.hallMove(e, e.x, e.y);
    const {map}=Scene.debug();
    const at=[[e.x+1,e.y],[e.x-1,e.y],[e.x,e.y+1],[e.x,e.y-1]].find(([x,y])=>
      !map.solid[y*map.w+x]&&!map.occ.has(y*map.w+x)&&
      !map.ents.some(other=>other!==e&&!other.hidden&&!other.empty&&
        Math.abs(other.x-x)+Math.abs(other.y-y)<=1&&Math.hypot(other.fx-x,other.fy-y)<=1.001));
    if(!at)throw Error('No unambiguous adjacent return tile for the same live creature');
    Scene.hop(...at);
    return Scene.ents().includes(e);
  })).toBe(true);
  // Scene.hop compresses fixture travel, while the native nearby control is
  // refreshed by Scene's next animation step. Do not click its stale target.
  await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(frame.locator('#ctx')).toHaveAccessibleName(await frame.evaluate(() => 'Engage: '+window.backstabFixtureTarget.name));
  await engage(frame);
  const clean = await combatState(frame);
  expect(clean.foe).toBe(before.max);
  expect(clean.round).toBe(0);
  await screenshot(page,info,'backstab-owner-clean');
  expect(errors).toEqual([]);
});
