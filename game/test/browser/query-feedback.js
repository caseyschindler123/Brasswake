const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');

async function dismiss(f) { const b = f.locator('[data-a=coachok]'); if (await b.isVisible()) await b.click(); }
async function fixture(page, tpl = 'b102', fast = false) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  const f = page.frames().find(f => f.url().includes('visual_test=1'));
  await f.evaluate(({ tpl, fast }) => {
    Sound.setMu(false); window.__bwFast = fast;
    const s = __bw.S; s.tut = 2; s.gd = 99; s.pages = { a1: 1 }; s.hp = __bw.maxHp();
    const e = Scene.find(e => e.kind === 'mon' && e.r === 1 && e.inst.tpl === tpl && !e.inst.elite);
    Scene.warp(e.x + 1, e.y); __bw.HOST.interact(e);
  }, { tpl, fast });
  await dismiss(f); await f.locator('[data-a=fpage][data-id=a1]').click(); await dismiss(f);
  return f;
}
async function submit(f, sql) {
  await f.locator('#sql').fill(sql); await f.locator('#kb [data-fn=run]').click();
  await f.waitForTimeout(450);
}
async function settled(f) { await f.waitForFunction(() => __bw.F && !__bw.F.busy, null, { timeout: 25000 }); }
async function next(f) { await f.locator('[data-a=fchoose]').click(); await f.locator('[data-a=fpage][data-id=a1]').click(); await dismiss(f); }
async function finish(f) {
  for (let i = 0; i < 8 && !await f.evaluate(() => __bw.F.over); i++) {
    await next(f); await submit(f, await f.evaluate(() => __bw.F.task.sql)); await settled(f);
  }
  expect(await f.evaluate(() => __bw.F.over)).toBe(true);
  await expect(f.locator('[data-a=floot]')).toBeVisible();
  await f.locator('[data-a=floot]').click(); await dismiss(f);
  await expect(f.locator('[data-a=lootall]')).toBeVisible();
  await f.locator('[data-a=lootall]').click();
}

for (const scenario of ['sorting', 'partial', 'extra', 'syntax']) test(`query feedback · played battle with ${scenario} correction`, async ({ page }, info) => {
  test.setTimeout(180000);
  const errors = observeErrors(page), f = await fixture(page, scenario === 'sorting' ? 'b101' : 'b102');
  const correct = await f.evaluate(() => __bw.F.task.sql);
  const wrong = scenario === 'sorting' ? correct.replace(/\b(ASC|DESC)\b/, d => d === 'ASC' ? 'DESC' : 'ASC') : scenario === 'partial' || scenario === 'extra' ? correct.replace(/LIMIT (\d+)/, (_, n) => 'LIMIT ' + (Number(n) + (scenario === 'extra' ? 1 : -1))) : correct.replace(/^SELECT/, 'SELEC');
  await submit(f, wrong);
  await expect(f.locator('.query-pair')).toBeVisible();
  expect(await f.evaluate(() => __bw.F.comparison.yours)).toBe(wrong);
  await expect(f.locator('.query-yours')).toContainText(scenario === 'syntax' ? 'SELEC' : wrong);
  await expect(f.locator('.query-solution b')).toHaveText('Corrected query');
  await expect(f.locator('.query-pair mark')).not.toHaveCount(0);
  const comparison = await f.evaluate(() => ({ solution: __bw.F.comparison.solution, ok: Engine.check(__bw.F.task, __bw.F.comparison.solution).ok }));
  expect(comparison.ok).toBe(true);
  if (scenario === 'syntax') {
    expect(await f.evaluate(() => __bw.F.round)).toBe(0);
    await expect(f.locator('.query-feedback')).toContainText('One free fix');
    const box = await f.locator('#kb [data-fn=run]').boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
    const pair = await f.locator('.query-pair').boundingBox(), area = await f.locator('#f-out').boundingBox();
    expect(pair.y + pair.height).toBeLessThanOrEqual(area.y + area.height);
    await screenshot(page, info, 'query-syntax-fix');
    await submit(f, correct); await settled(f);
    await expect(f.locator('.query-power')).toContainText('100% power');
  } else {
    // Feedback is present during the ordinary-speed animation, without an acknowledgement.
    await screenshot(page, info, 'query-' + scenario + '-animating');
    await settled(f);
    await expect(f.locator('.query-power')).toContainText(scenario === 'sorting' ? '85% power' : /[5-9]\d% power/);
    const box = await f.locator('[data-a=fchoose], [data-a=floot]').last().boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
    await screenshot(page, info, 'query-' + scenario + '-settled');
  }
  expect(await f.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await finish(f);
  expect(errors).toEqual([]);
});

test('query feedback · damage scales with result progress and wrong attacks cannot kill', async ({ page }, info) => {
  const errors = observeErrors(page), f = await fixture(page, 'b102', true);
  await f.evaluate(() => {
    __bw.F.foe.hp = __bw.F.foe.max = 10000; __bw.F.foe.swings = 0;
    for (const [id] of Progression.skills) __bw.S.skillModes[id] = 'lock';
  });
  const damage = [];
  for (const kind of ['full', 'half', 'wrong']) {
    if (kind !== 'full') await next(f);
    const sql = await f.evaluate(kind => kind === 'wrong' ? 'SELECT -987654321' : kind === 'half' ? __bw.F.task.sql.replace(/LIMIT (\d+)/, (_, n) => 'LIMIT ' + Math.ceil(Number(n) / 2)) : __bw.F.task.sql, kind);
    const before = await f.evaluate(() => { window.__feedbackRandom = Math.random; Math.random = () => .01; return __bw.F.foe.hp; });
    await submit(f, sql); await settled(f);
    damage.push(await f.evaluate(before => { Math.random = window.__feedbackRandom; return { dealt: before - __bw.F.foe.hp, power: __bw.F.queryPower, grade: __bw.F.res.grade }; }, before));
  }
  expect(damage[0].dealt).toBeGreaterThan(0); expect(damage[0].power).toBe(1);
  // Two integer-rounded swings allow at most one point per swing of rounding difference.
  expect(Math.abs(damage[1].dealt - damage[0].dealt * damage[1].power)).toBeLessThanOrEqual(2);
  expect(damage[1].dealt).toBeLessThan(damage[0].dealt);
  expect(damage[2]).toEqual({ dealt: 0, power: 0, grade: 'wrong' });
  await expect(f.locator('.query-feedback')).toContainText('No useful effect');
  await screenshot(page, info, 'query-zero-power');
  expect(errors).toEqual([]);
});

test('query feedback · long queries expand safely and the second syntax failure spends a turn', async ({ page }, info) => {
  const errors = observeErrors(page), f = await fixture(page, 'b102', true);
  const bad = '/* ' + 'a long harmless note '.repeat(16) + ' */\n' + (await f.evaluate(() => __bw.F.task.sql)).replace(/^SELECT/, 'SELEC');
  await submit(f, bad);
  await expect(f.locator('[data-a=fcompare]')).toHaveAttribute('aria-expanded', 'false');
  await f.locator('[data-a=fcompare]').click();
  await expect(f.locator('.query-yours pre')).toHaveText(bad);
  await expect(f.locator('[data-a=fcompare]')).toHaveAttribute('aria-expanded', 'true');
  await screenshot(page, info, 'query-expanded');
  await f.locator('[data-a=fcompare]').click();
  await submit(f, bad); await settled(f);
  expect(await f.evaluate(() => __bw.F.round)).toBe(1);
  expect(await f.evaluate(() => __bw.F.queryPower)).toBe(0);
  await expect(f.locator('.query-pair')).toBeVisible();
  await f.locator('[data-a=fcompare]').click();
  await expect(f.locator('.query-yours pre')).toHaveText(bad);
  const nextBox = await f.locator('[data-a=fchoose]').boundingBox();
  expect(nextBox.y + nextBox.height).toBeLessThanOrEqual(page.viewportSize().height);
  await screenshot(page, info, 'query-expanded-result-with-controls');
  expect(errors).toEqual([]);
});

test('query feedback · equivalent SQL gets full power and shape/shown answers retain protections', async ({ page }) => {
  const errors = observeErrors(page), f = await fixture(page, 'b102', true);
  await f.evaluate(() => { __bw.F.foe.hp = __bw.F.foe.max = 10000; __bw.F.foe.swings = 0; });
  await submit(f, 'SELECT * FROM (' + await f.evaluate(() => __bw.F.task.sql) + ') AS chosen_items');
  await settled(f);
  expect(await f.evaluate(() => __bw.F.queryPower)).toBe(1);
  await expect(f.locator('.query-pair')).toHaveCount(0);
  await next(f);
  await f.locator('[data-a=fhint]').click(); await f.waitForTimeout(500);
  await f.locator('[data-a=fhint]').click(); await f.waitForTimeout(500);
  await submit(f, await f.evaluate(() => __bw.F.task.sql)); await settled(f);
  expect(await f.evaluate(() => __bw.F.queryPower)).toBe(.6);
  await next(f); await f.locator('[data-a=fshow]').click(); await f.waitForTimeout(500);
  const before = await f.evaluate(() => JSON.stringify([__bw.S.sk, __bw.S.attr, __bw.S.skills]));
  await submit(f, await f.evaluate(() => __bw.F.task.sql)); await settled(f);
  expect(await f.evaluate(() => __bw.F.queryPower)).toBe(.05);
  expect(await f.evaluate(() => JSON.stringify([__bw.S.sk, __bw.S.attr, __bw.S.skills]))).toBe(before);
  expect(errors).toEqual([]);
});

test('query feedback · public save import and visible battle controls support release verification', async ({ page }, info) => {
  test.setTimeout(180000);
  const errors = observeErrors(page);
  await page.goto('/index.html?visual_test=1');
  // The local fixture server supplies SQL for this rehearsal; the hosted run
  // uses the production dependency and asserts the absence of debug handles.
  await require('./battle-release').battleRelease(page, info, { hosted: false });
  expect(errors).toEqual([]);
});
