const { test, expect } = require('@playwright/test');
const Worlds = require('../../src/character_worlds');
const SqlEd = require('../../src/sqled');
const { open: openDev } = require('./dev-helper');
const { observeErrors, screenshot } = require('./flow');
const { speech } = require('./first-day-helper');

const action = (page, name, panel = '') => page.locator(panel + ' [data-a="' + name + '"]');
const run = page => page.locator('#kb [data-fn="run"]');
const lesson = page => page.locator('#enc .q-body');
const sheet = page => page.locator('#sheet');
const sqlTokens = sql => SqlEd.tokens(sql).filter(([type]) => type !== 'ws')
  .map(([type, value]) => [type, type === 'w' ? value.toUpperCase() : value]);

async function expectSql(pre, sql) {
  await expect(pre).toBeVisible();
  expect(sqlTokens(await pre.textContent())).toEqual(sqlTokens(sql));
}

async function prepareHall(page, region) {
  await page.waitForFunction(() => !!Engine.runRead('SELECT 1').rows?.length, null, { timeout: 10000 });
  await page.evaluate(r => __bw.SH.dojo({ r }), region);
  await page.waitForFunction(r => Scene.inHall() === r && Scene.region() === r, region, { timeout: 8000 });
}

async function meet(page, index) {
  const expected = await page.evaluate(i => {
    const region = Scene.inHall();
    const student = Scene.find(e => e.kind === 'student' && e.i === i);
    if (!student) throw Error('Missing specialist ' + region + '.' + i);
    const spec = Learning.specialists(region)[i];
    __bw.HOST.interact(student);
    return { ...spec, name: student.name };
  }, index);
  await expect(sheet(page).getByRole('heading', { level: 2, name: expected.title, exact: true })).toBeVisible();
  await expect(sheet(page)).toContainText(expected.name);
  return expected;
}

async function explain(page, specialist) {
  const concept = specialist.concepts[0];
  await page.locator('#sheet [data-a="learnconcept"][data-id="' + concept + '"]').click();
  const expected = await page.evaluate(id => {
    const c = Learning.CONCEPTS.find(c => c.id === id);
    const { task, specialist } = __bw.Q;
    return { title: c.title, code: c.code, exampleRead: /^\s*(SELECT|WITH)\b/i.test(c.code),
      specialist, task: { sql: task.sql, kind: task.kind, concepts: task.concepts, ask: task.ask } };
  }, concept);
  expect(expected.specialist).toBe(specialist.id);
  expect(expected.task.concepts).toContain(concept);
  await expect(lesson(page).getByRole('heading', { level: 2, name: expected.title, exact: true })).toBeVisible();
  await expectSql(lesson(page).locator('[data-lesson-example]'), expected.code);
  if (expected.exampleRead) {
    await expect(lesson(page).getByText('What it returns', { exact: true })).toBeVisible();
    await expect(lesson(page).locator('table.res').first()).toBeVisible();
  }
  await expect(action(page, 'qturn', '#enc')).toBeEnabled();
  return expected.task;
}

async function tryQuestion(page, task) {
  await action(page, 'qturn', '#enc').click();
  await expect(lesson(page).locator('.ask')).toHaveText(task.ask);
  await expect(lesson(page)).toContainText('Free, untimed dojo practice');
}

async function answer(page, sql) {
  await page.locator('#sql').fill(sql);
  await run(page).click();
}

async function leavePractice(page) {
  await action(page, 'qleave', '#enc .q-head').click();
  await expect(page.locator('#enc')).toBeHidden();
}

async function vendorRecords(page) {
  return page.evaluate(() => {
    const sql = 'SELECT * FROM vendors ORDER BY vendor_id';
    return { original: Engine.runRead(sql), sandbox: Engine.runSandbox(sql) };
  });
}

for (const region of [1, 2, 3, 4, 5, 6, 7, 8]) {
  test('dojo learning · all three specialists teach and grade in region ' + region, async ({ page }, info) => {
    test.setTimeout(90000);
    const errors = observeErrors(page);
    await openDev(page);
    // Place the character in the production hall for these isolated teaching checks.
    await prepareHall(page, region);
    if (region === 1) {
      await page.evaluate(() => __bw.HOST.interact(Scene.find(e => e.kind === 'master')));
      await speech(page, '#say [data-a="learninghub"]');
      await expect(sheet(page)).toContainText('free and untimed');
      await expect(action(page, 'learnspecialist', '#sheet')).toHaveCount(3);
      await action(page, 'learnspecialist', '#sheet').nth(2).click();
      await expect(sheet(page).getByRole('heading', { level: 2, name: 'Removing duplicates', exact: true })).toBeVisible();
    }

    const original = region === 8 ? await vendorRecords(page) : null;
    for (let index = 0; index < 3; index++) {
      const specialist = await meet(page, index);
      const task = await explain(page, specialist);
      if (index === 0 && (region === 1 || region === 8)) {
        await expect(page.locator('#toast > div')).toHaveCount(0);
        await lesson(page).locator('[data-lesson-example]').scrollIntoViewIfNeeded();
        await screenshot(page, info, 'specialist-worked-example-region-' + region);
      }
      await tryQuestion(page, task);
      await answer(page, task.sql);
      await expect(lesson(page)).toContainText('That worked');
      await expect(lesson(page)).toContainText('You 1 · specialist 0');
      const state = await page.evaluate(() => ({
        kind: __bw.Q.kind, score: __bw.Q.practiceScore, fight: !!__bw.F, tournament: !!__bw.DU
      }));
      expect(state).toEqual({ kind: 'learning', score: [1, 0], fight: false, tournament: false });
      if (region === 8 && index === 0) {
        expect(task.kind).toBe('dml');
        expect(original.original.rows.length).toBeGreaterThan(0);
        expect(await vendorRecords(page)).toEqual(original);
        await screenshot(page, info, 'safe-write-practice-result');
      }
      await leavePractice(page);
    }
    expect(errors).toEqual([]);
  });
}

const protectedState = page => page.evaluate(() => {
  const s = __bw.S;
  return JSON.parse(JSON.stringify({
    hp: s.hp, mana: s.mana, stamina: s.stamina, gold: s.gold,
    equipment: s.eq, inventory: s.inv, food: s.food, tonics: s.tonics,
    mats: s.mats, bank: s.bank, stats: s.stats, attributes: s.attr, skills: s.sk,
    remains: s.remains, death: s.deathPending, streak: s.streak, best: s.best,
    tournament: s.djb, dojo: s.dj, prizes: __bw.A.djp, rpgDeath: s.dead
  }));
});
const mastery = page => page.evaluate(() => JSON.parse(JSON.stringify({
  evidence: __bw.A.learning.evidence, ready: __bw.A.learning.ready, sqlPractice: __bw.S.skills
})));

test('dojo learning · help preserves a draft, disclosure earns no readiness, and a loss costs nothing', async ({ page }, info) => {
  test.setTimeout(90000);
  const errors = observeErrors(page);
  await openDev(page);
  await page.evaluate(() => {
    Dev.resources({ hp: 17, mana: 5, stamina: 6, gold: 41 });
    __bw.S.streak = 7;
    __bw.S.best = 11;
  });
  await prepareHall(page, 1);
  const specialist = await meet(page, 0);
  const task = await explain(page, specialist);
  await tryQuestion(page, task);
  const before = await protectedState(page);
  const beforeMastery = await mastery(page);
  const draft = 'SELECT 42 AS my_draft';
  await page.locator('#sql').fill(draft);
  await action(page, 'help', '#enc').click();
  await expect(sheet(page)).toContainText('count as assisted practice');
  const show = action(page, 'learnshow', '#sheet');
  await expect(show).toHaveCount(1);
  await show.click();
  await expect(sheet(page).getByRole('heading', { level: 2, name: 'One answer to study', exact: true })).toBeVisible();
  await expectSql(sheet(page).locator('pre.code'), task.sql);
  await sheet(page).getByRole('button', { name: 'Back to my query', exact: true }).click();
  await expect(page.locator('#sql')).toHaveValue(draft);

  await answer(page, task.sql);
  await expect(lesson(page)).toContainText('You worked through that with help');
  await expect(lesson(page)).toContainText('You 0 · specialist 0');
  expect(await mastery(page)).toEqual(beforeMastery);

  for (let losses = 1; losses <= 3; losses++) {
    await action(page, 'learnnext', '#enc').click();
    await answer(page, 'SELECT -987654321 AS unrelated_result');
    await expect(lesson(page)).toContainText('You 0 · specialist ' + losses);
  }
  await expect(lesson(page)).toContainText('The bout is finished');
  expect(await protectedState(page)).toEqual(before);
  const afterLossMastery = await mastery(page);
  expect(afterLossMastery.sqlPractice).toEqual(beforeMastery.sqlPractice);
  await expect(page.locator('#toast > div')).toHaveCount(0);
  await screenshot(page, info, 'free-bout-loss');
  await page.getByRole('button', { name: 'Start another bout' }).click();
  const fresh = await page.evaluate(() => ({
    sql: __bw.Q.task.sql, score: __bw.Q.practiceScore, assisted: __bw.Q.assisted
  }));
  expect(fresh).toMatchObject({ score: [0, 0], assisted: false });
  await answer(page, fresh.sql);
  await expect(lesson(page)).toContainText('You 1 · specialist 0');
  expect(await protectedState(page)).toEqual(before);
  expect((await mastery(page)).sqlPractice).not.toEqual(afterLossMastery.sqlPractice);
  expect(errors).toEqual([]);
});

function twoWorlds() {
  const account = Worlds.fresh();
  const saved = name => ({ v: 8, wv: 3, name, path: 'warrior', look: 0, tut: 3, gd: -1,
    g: 'done', hp: 29, tabs: { hero: 1 }, seen: { hero: 1 } });
  Object.assign(account.worlds[0], { cur: 0, main: 0 });
  account.worlds[0].slots[0] = saved('Original learner');
  account.worlds[0].slots[1] = saved('Next character');
  Object.assign(account.worlds[1], { cur: 0, main: 0 });
  account.worlds[1].slots[0] = saved('Different world');
  return JSON.parse(JSON.stringify(account));
}

test('dojo learning · switching characters and worlds retires the previous practice draft', async ({ page }) => {
  test.setTimeout(75000);
  const errors = observeErrors(page);
  await page.addInitScript(account => {
    if (!localStorage.getItem('brasswake.acct.v9')) localStorage.setItem('brasswake.acct.v9', JSON.stringify(account));
  }, twoWorlds());
  await page.goto('/index.html?visual_test=1');
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await page.locator('[data-a="playslot"][data-i="0"]').click();
  await expect(page.locator('#hud')).toContainText('Original learner');
  const startDraft = async () => {
    await prepareHall(page, 1);
    const specialist = await meet(page, 0);
    await action(page, 'learnpractice', '#sheet').click();
    await page.locator('#sql').fill('SELECT 12345 AS abandoned_draft');
    expect(await page.evaluate(() => __bw.Q.specialist)).toBe(specialist.id);
    const owner = await page.evaluate(() => __bw.Q.owner.uid);
    // Invoke the real return action because the activity's panel covers the Hero navigation.
    await page.evaluate(() => __bw.ACT.reset());
    await expect(page.locator('#title')).toBeVisible();
    return owner;
  };
  const checkRetired = async (expectedName, world, staleOwner) => {
    await expect(page.locator('#enc')).toBeHidden();
    await expect(page.locator('#hud')).toContainText(expectedName);
    const active = await page.evaluate(() => ({
      q: __bw.Q, world: __bw.A.world, owner: __bw.S.uid, sql: document.querySelector('#enc #sql')?.value ?? ''
    }));
    expect(active).toMatchObject({ q: null, world, sql: '' });
    expect(active.owner).not.toBe(staleOwner);
    await prepareHall(page, 1);
    await meet(page, 0);
    await action(page, 'learnpractice', '#sheet').click();
    await expect(page.locator('#sql')).toHaveValue('');
    await leavePractice(page);
  };

  const firstOwner = await startDraft();
  await page.locator('[data-a="playslot"][data-i="1"]').click();
  await checkRetired('Next character', 0, firstOwner);
  const secondOwner = await startDraft();
  await page.locator('[data-a="worldpick"][data-i="1"]').click();
  await page.locator('[data-a="playslot"][data-i="0"]').click();
  await checkRetired('Different world', 1, secondOwner);
  expect(errors).toEqual([]);
});

async function holdUntil(page, key, condition, target) {
  const stopped = page.evaluate(({ key, condition, target }) => new Promise(resolve => {
    const end = performance.now() + 6000;
    const tick = () => {
      const { P, interactionTarget } = Scene.debug();
      const reached = condition === 'x' ? (P.fx - target.x) * target.side >= .9 :
        interactionTarget?.id === target.id && !document.querySelector('#ctx').hidden;
      if (reached || performance.now() >= end) {
        window.dispatchEvent(new KeyboardEvent('keyup', { key }));
        resolve(reached);
      } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { key, condition, target });
  await page.keyboard.down(key);
  try {
    expect(await stopped).toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
}

test('world interaction · native WASD reaches either side of the dungeon exit at short heights', async ({ page }, info) => {
  test.setTimeout(75000);
  const errors = observeErrors(page);
  if (!info.project.use.hasTouch) await page.setViewportSize({ width: 800, height: 600 });
  await openDev(page);
  for (const side of [-1, 1]) {
    const stairs = await page.evaluate(() => {
      Dev.teleport({ region: 1, dungeon: 0 });
      const e = Scene.find(e => e.kind === 'dtravel' && e.to < 0);
      return { name: e.name, id: e.id, x: e.x, y: e.y };
    });
    const stick = page.locator('#movement-joystick');
    await expect(stick).toHaveAttribute('aria-disabled', 'false');
    if (side === -1) {
      const at = await page.evaluate(() => {
        const editor = document.createElement('div');
        editor.contentEditable = 'true';
        editor.id = 'movement-test-editor';
        editor.style.cssText = 'position:fixed;left:0;top:0;z-index:1000;background:white;color:black';
        document.body.append(editor);
        editor.focus();
        const { P } = Scene.debug();
        return [P.fx, P.fy];
      });
      await page.keyboard.down('ArrowUp');
      await page.keyboard.press('w');
      try {
        await page.evaluate(() => new Promise(resolve => {
          let frames = 0;
          const wait = () => ++frames >= 8 ? resolve() : requestAnimationFrame(wait);
          requestAnimationFrame(wait);
        }));
        expect(await page.evaluate(() => [Scene.debug().P.fx, Scene.debug().P.fy])).toEqual(at);
        await expect(page.locator('#movement-test-editor')).toHaveText('w');
      } finally {
        await page.keyboard.up('ArrowUp');
        await page.locator('#movement-test-editor').evaluate(el => el.remove());
      }
    }

    await holdUntil(page, side < 0 ? 'a' : 'd', 'x', { x: stairs.x, side });
    await holdUntil(page, 'w', 'target', { id: stairs.id });
    const ctx = page.locator('#ctx');
    await expect(ctx).toBeVisible();
    await expect(ctx).toContainText(stairs.name);
    expect(await page.evaluate(() => Scene.pos())).toEqual([stairs.x + side, stairs.y + 1]);
    const box = await ctx.boundingBox(), stage = await page.locator('#stage').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(stage.x);
    expect(box.y).toBeGreaterThanOrEqual(stage.y);
    expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width);
    expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height);
    if (side === -1) {
      await expect(page.locator('#toast > div')).toHaveCount(0);
      await screenshot(page, info, 'short-viewport-side-stair-control');
      const label = await page.evaluate(id => {
        const found = Scene.debug().labels.find(item => item.e.id === id);
        return found && { x: found.x, y: found.y - 6 };
      }, stairs.id);
      expect(label).toBeTruthy();
      const canvas = page.locator('#stage canvas.over');
      if (info.project.use.hasTouch) await canvas.tap({ position: label });
      else await canvas.click({ position: label });
    } else {
      if (info.project.use.hasTouch) await ctx.tap();
      else await ctx.click();
    }
    await speech(page, '#say [data-a="dtravel"]');
    await expect.poll(() => page.evaluate(() => Scene.inDungeon())).toBe(false);
  }
  expect(errors).toEqual([]);
});
