const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');

async function dismiss(f) { const b = f.locator('[data-a=coachok]'); if (await b.isVisible()) await b.click(); }
async function choosePage(f, { needsMultiRowLimit = false, newConcept = false } = {}) {
  await f.waitForFunction(()=>__bw.Combat.descriptor('basic.swords').ready,null,{timeout:15000});
  await f.locator('#combat-bar [data-id="basic.swords"]').click();
  await dismiss(f);
  // Prepare an actual seeded curriculum question at the relevant boundary.
  // Actions still grade and resolve through the real SQL/combat controller.
  await f.evaluate(({needsMultiRowLimit,newConcept})=>{
    // The syntax/scroll case deliberately starts with an unseen concept.
    // Opening the initial random action may already have introduced LIMIT.
    if(newConcept)__bw.A.learning=Learning.fresh();
    const task=Array.from({length:64},(_,i)=>Learning.next(__bw.A.learning,{circle:1,family:window.feedbackFamily,seed:i+1})).find(t=>!needsMultiRowLimit||Number(/\bLIMIT\s+(\d+)$/i.exec(t?.sql||'')?.[1])>=3);
    if(!task)throw Error('No suitable real curriculum task');
    Object.keys(__bw.F.task).forEach(k=>delete __bw.F.task[k]);Object.assign(__bw.F.task,window.feedbackTip||task);
    __bw.Combat.cancel();__bw.Combat.begin('basic.swords');
  },{needsMultiRowLimit,newConcept});
  await dismiss(f);
}
async function game(page) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  return page.frames().find(f => f.url().includes('visual_test=1'));
}
async function fixture(page, tpl = 'b102', fast = false, options = {}) {
  const f = await game(page);
  await f.evaluate(({ tpl, fast, theft, withTip }) => {
    Sound.setMu(false); window.__bwFast = fast;
    const s = __bw.S; s.tut = 2; s.gd = 99; s.pages = { a1: 1 }; s.hp = __bw.maxHp();
    const sword=__bw.makeItem('common',1,'weapon','swords');s.inv.push(sword);s.eq.weapon=sword.id;s.sk.swords=60;
    const e = Scene.find(e => e.kind === 'mon' && e.r === 1 && e.inst.tpl === tpl && !e.inst.elite);
    if (theft) {
      s.pages.h1 = 1;
      Object.assign(e, { unseen: true, engaged: false, forced: false, chase: 0, agg: 0, pocketsEmpty: false });
    }
    Scene.warp(e.x + 1, e.y); e.wander=0;__bw.HOST.interact(e);window.feedbackFamily=tpl==='b101'?'sort':'limit';window.feedbackEnemy=e.id;
    if (withTip) {
      // Use Odalys's actual Ledger prompt in a disposable encounter.
      window.feedbackTip = FirstDay.tasks.find(t => t.tip && !t.practice);
      Learning.introduce(__bw.A.learning ||= Learning.fresh(), ['select']);
    }
  }, { tpl, fast, theft: options.theft, withTip: options.withTip });
  await dismiss(f); await choosePage(f, options);
  return f;
}
async function submit(f, sql) {
  if (sql !== undefined) await f.locator('#sql').fill(sql);
  await f.locator('#kb [data-fn=run]').click();
  await f.waitForTimeout(450);
}
async function settled(f) { await f.waitForFunction(() => __bw.F && !__bw.F.busy, null, { timeout: 25000 }); }
async function details(f){if(await f.locator('#combat-result [data-a=combatdetails]').isVisible())await f.locator('#combat-result [data-a=combatdetails]').click();}
async function next(f, question) { if(await f.locator('#sheet .sheet-x').isVisible())await f.locator('#sheet .sheet-x').click(); await choosePage(f, question); }
const resources = f => f.evaluate(() => {
  const s = __bw.S, fight = __bw.F;
  return {
    round: fight.round, foe: fight.foe.hp, shown: fight.shown, hint: fight.hint,
    hp: s.hp, mana: s.mana, stamina: s.stamina, bandages: s.bandages, prepared: s.prepared, tonics: s.tonics,
    streak: s.streak, correct: s.stats.ok, sk: s.sk, attr: s.attr, skills: s.skills
  };
});
async function finish(f) {
  // Complete the prepared comparison encounter with reproducible combat rolls.
  // Both sides still respond normally; the grading and feedback assertions
  // above this helper keep their original query and result coverage.
  await f.evaluate(() => { window.__feedbackFinishRandom = Math.random; Math.random = () => .01; });
  try {
    for (let i = 0; i < 8 && !await f.evaluate(() => __bw.F.over); i++) {
      await next(f); await submit(f, await f.evaluate(() => __bw.F.task.sql)); await settled(f);
    }
    expect(await f.evaluate(() => __bw.F.over)).toBe(true);
    expect(await f.evaluate(() => __bw.S.hp)).toBeGreaterThan(0);
    await expect(f.locator('[data-a=floot]')).toBeVisible();
  } finally {
    await f.evaluate(() => { Math.random = window.__feedbackFinishRandom; delete window.__feedbackFinishRandom; });
  }
  await f.locator('[data-a=floot]').click(); await dismiss(f);
  await expect(f.locator('[data-a=lootall]')).toBeVisible();
  await f.locator('[data-a=lootall]').click();
}

for (const scenario of ['sorting', 'partial', 'extra', 'syntax']) test(`query feedback · played battle with ${scenario} correction`, async ({ page }, info) => {
  test.setTimeout(180000);
  const errors = observeErrors(page), f = await fixture(page, scenario === 'sorting' ? 'b101' : 'b102', false, {
    needsMultiRowLimit: scenario === 'partial' || scenario === 'extra', newConcept: scenario === 'syntax'
  });
  const correct = await f.evaluate(() => __bw.F.task.sql);
  let wrong;
  if (scenario === 'sorting') {
    wrong = correct.replace(/(\bORDER BY\s+\w+)(?:\s+(ASC|DESC)\b)?/i, (_, first, dir) =>
      first + (dir?.toUpperCase() === 'DESC' ? ' ASC' : ' DESC'));
    expect(await f.evaluate(sql => Engine.grade(__bw.F.task, sql).why, wrong)).toBe('order');
  } else if (scenario === 'partial' || scenario === 'extra') {
    wrong = correct.replace(/\bLIMIT\s+(\d+)$/i, (_, n) => 'LIMIT ' + (Number(n) + (scenario === 'extra' ? 1 : -1)));
    expect(await f.evaluate(sql => Engine.grade(__bw.F.task, sql).why, wrong)).toBe('rowcount');
  } else wrong = correct.replace(/^SELECT/, 'SELEC');
  const before = scenario === 'syntax' && await resources(f);
  const question = f.locator('#fight .battle-question');
  if (scenario === 'syntax') {
    await expect(question.locator(':scope > details.first-technique')).toBeVisible();
    await question.locator(':scope > details.first-technique > summary').click();
    if (info.project.use.browserName === 'webkit' && info.project.use.isMobile) {
      // Playwright cannot send a mouse wheel in mobile WebKit.
      await question.evaluate(body=>body.scrollTop=body.scrollHeight);
    } else {
      await question.hover();
      await page.mouse.wheel(0, 1200);
    }
    await expect.poll(() => question.evaluate(body => body.scrollTop)).toBeGreaterThan(0);
  }
  await submit(f, wrong);
  if(scenario!=='syntax')await details(f);
  await expect(f.locator('.query-pair:visible')).toBeVisible();
  expect(await f.evaluate(() => __bw.F.comparison.yours)).toBe(wrong);
  await expect(f.locator('.query-yours:visible')).toContainText(scenario === 'syntax' ? 'SELEC' : wrong);
  await expect(f.locator('.query-pair mark')).not.toHaveCount(0);
  if (scenario === 'syntax') {
    expect(before.round).toBe(0);
    expect(await resources(f)).toEqual(before);
    expect(await f.evaluate(() => __bw.F.comparison.solution)).toBeUndefined();
    await expect(f.locator('.query-solution:visible')).toHaveCount(0);
    await expect(f.locator('.query-error')).toContainText(/SELEC.*syntax error/);
    await expect(f.locator('#sql')).toHaveValue(wrong);
    const repair = f.locator('.query-feedback:visible').getByText('One free fix', { exact: true });
    await expect(repair).toBeVisible();
    const headingBox = await repair.boundingBox(), questionBox = await question.boundingBox();
    expect(headingBox.y).toBeGreaterThanOrEqual(questionBox.y);
    expect(headingBox.y + headingBox.height).toBeLessThanOrEqual(questionBox.y + questionBox.height);
    const box = await f.locator('#kb [data-fn=run]').boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
    const pair = await f.locator('.query-pair:visible').boundingBox(), area = await f.locator('#f-out').boundingBox();
    expect(pair.y + pair.height).toBeLessThanOrEqual(area.y + area.height);
    await screenshot(page, info, 'query-syntax-fix');
    await submit(f, correct); await settled(f);await details(f);
    await expect(f.locator('.query-power')).toContainText('100% power');
  } else {
    await expect(f.locator('.query-solution b')).toHaveText('Corrected query');
    expect(await f.evaluate(() => Engine.check(__bw.F.task, __bw.F.comparison.solution).ok)).toBe(true);
    // Feedback is present during the ordinary-speed animation, without an acknowledgement.
    await screenshot(page, info, 'query-' + scenario + '-animating');
    await settled(f);
    await expect(f.locator('.query-power')).toContainText(scenario === 'sorting' ? '85% power' : /[5-9]\d% power/);
    const box = await f.locator('#sheet .sheet-x, #fight [data-a=floot]').last().boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
    await screenshot(page, info, 'query-' + scenario + '-settled');
  }
  expect(await f.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await finish(f);
  expect(errors).toEqual([]);
});

test('query feedback · comparison completion survives unfavorable rolls and restores randomness', async ({ page }) => {
  const errors = observeErrors(page), f = await fixture(page, 'b102', true);
  await f.evaluate(() => {
    window.__feedbackOriginalRandom = Math.random;
    window.__feedbackMisses = () => .999;
    Math.random = window.__feedbackMisses;
  });
  try {
    await submit(f, await f.evaluate(() => __bw.F.task.sql)); await settled(f);
    expect(await f.evaluate(() => !!__bw.F.over)).toBe(false);
    await finish(f);
    expect(await f.evaluate(() => Math.random === window.__feedbackMisses)).toBe(true);
  } finally {
    await f.evaluate(() => {
      Math.random = window.__feedbackOriginalRandom;
      delete window.__feedbackOriginalRandom; delete window.__feedbackMisses;
    });
  }
  expect(errors).toEqual([]);
});

test('query feedback · damage scales with result progress and wrong attacks cannot kill', async ({ page }, info) => {
  const errors = observeErrors(page), f = await fixture(page, 'b102', true);
  await f.evaluate(() => {
    __bw.F.ent.combat.hp=__bw.F.ent.combat.max=__bw.F.foe.hp=__bw.F.foe.max=10000; __bw.F.ent.combat.profile.attackTime=100;
    for (const [id] of Progression.skills) __bw.S.skillModes[id] = 'lock';
  });
  const damage = [];
  for (const kind of ['full', 'half', 'wrong']) {
    if (kind !== 'full') await next(f, { needsMultiRowLimit: kind === 'half' });
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
  await details(f);await expect(f.locator('.query-feedback:visible')).toContainText('No useful effect');
  await screenshot(page, info, 'query-zero-power');
  expect(errors).toEqual([]);
});

test('query feedback · long queries expand safely and the second syntax failure spends a turn', async ({ page }, info) => {
  const errors = observeErrors(page), f = await fixture(page, 'b102', true);
  await f.evaluate(() => { __bw.S.streak = 3; });
  const bad = '/* ' + 'a long harmless note '.repeat(16) + ' */\n' + (await f.evaluate(() => __bw.F.task.sql)).replace(/^SELECT/, 'SELEC');
  const before = await resources(f);
  await submit(f, bad);
  expect(await resources(f)).toEqual(before);
  await expect(f.locator('#sql')).toHaveValue(bad);
  await expect(f.locator('.query-solution:visible')).toHaveCount(0);
  await expect(f.locator('[data-a=fcompare]:visible')).toHaveAttribute('aria-expanded', 'false');
  await f.locator('[data-a=fcompare]:visible').click();
  await expect(f.locator('.query-yours:visible pre')).toHaveText(bad);
  await expect(f.locator('.query-solution:visible')).toHaveCount(0);
  await expect(f.locator('#sql')).toHaveValue(bad);
  await expect(f.locator('[data-a=fcompare]:visible')).toHaveAttribute('aria-expanded', 'true');
  await screenshot(page, info, 'query-expanded');
  await f.locator('[data-a=fcompare]:visible').click();
  await submit(f, bad); await settled(f);
  const after = await resources(f);
  expect(after.round).toBe(before.round + 1);
  expect(after.streak).toBe(0);
  expect(await f.evaluate(() => __bw.F.queryPower)).toBe(0);
  await expect(f.locator('.query-solution:visible')).toHaveCount(0);
  await details(f);
  await expect(f.locator('.query-pair:visible')).toBeVisible();
  await f.locator('[data-a=fcompare]:visible').click();
  await expect(f.locator('.query-yours:visible pre')).toHaveText(bad);
  await expect(f.locator('.query-solution:visible')).toHaveCount(0);
  await details(f);
  const nextBox = await f.locator('#sheet .sheet-x').boundingBox();
  expect(nextBox.y + nextBox.height).toBeLessThanOrEqual(page.viewportSize().height);
  await screenshot(page, info, 'query-expanded-result-with-controls');
  expect(errors).toEqual([]);
});

test('query feedback · equivalent SQL gets full power and shape/shown answers retain protections', async ({ page }) => {
  const errors = observeErrors(page), f = await fixture(page, 'b102', true);
  await f.evaluate(() => { __bw.F.ent.combat.hp=__bw.F.ent.combat.max=__bw.F.foe.hp=__bw.F.foe.max=10000; __bw.F.ent.combat.profile.attackTime=100; });
  const reference = await f.evaluate(() => __bw.F.task.sql);
  const equivalent = 'SELECT * FROM (' + reference + ') AS chosen_items';
  await f.locator('#sql').fill(equivalent);
  const unassisted = await resources(f);
  await f.locator('[data-a=queryhelp]').click();
  const confirm = f.locator('[data-a=fshowconfirm]');
  await expect(f.locator('#kb [data-a=fshow]')).toHaveCount(1);
  await f.locator('#kb [data-a=fshow]').click();
  await expect(confirm).toBeVisible();
  await expect(f.locator('#sheet-body')).toContainText('only 5% power');
  await expect(f.locator('#sheet-body')).toContainText('no skill or attribute practice');
  await expect(f.locator('#sheet-body')).not.toContainText(reference);
  await page.keyboard.press('Control+Enter');
  await expect(confirm).toBeVisible();
  expect(await resources(f)).toEqual(unassisted);
  await expect(f.locator('#f-hint code')).toHaveCount(0);
  await f.locator('#sheet-body [data-a=closesheet]').click();
  await expect(confirm).toBeHidden();
  await expect(f.locator('#sql')).toHaveValue(equivalent);
  expect(await resources(f)).toEqual(unassisted);
  await submit(f);
  await settled(f);
  expect(await f.evaluate(() => __bw.F.queryPower)).toBe(1);
  await expect(f.locator('.query-pair:visible')).toHaveCount(0);
  await next(f);
  await f.locator('[data-a=queryhelp]').click();
  await f.locator('#kb [data-a=fhint]').click();
  await expect(f.locator('#kb [data-a=fshow]')).toHaveCount(1);
  await f.locator('#kb [data-a=fhint]').click();
  await expect(f.locator('#kb [data-a=fshow]')).toHaveCount(1);
  await submit(f, await f.evaluate(() => __bw.F.task.sql)); await settled(f);
  expect(await f.evaluate(() => __bw.F.queryPower)).toBe(.6);
  await next(f);
  await f.locator('[data-a=queryhelp]').click();
  await f.locator('#kb [data-a=fshow]').click();
  await confirm.click();
  await expect(confirm).toBeHidden();
  await expect(f.locator('#kb .query-reference .fh code')).toHaveText(await f.evaluate(() => __bw.F.task.sql));
  const before = await f.evaluate(() => JSON.stringify([__bw.S.sk, __bw.S.attr, __bw.S.skills]));
  await submit(f, await f.evaluate(() => __bw.F.task.sql)); await settled(f);
  expect(await f.evaluate(() => __bw.F.queryPower)).toBe(.05);
  expect(await f.evaluate(() => JSON.stringify([__bw.S.sk, __bw.S.attr, __bw.S.skills]))).toBe(before);
  expect(errors).toEqual([]);
});

test('query feedback · a shown attack cannot switch into theft before committing the exchange', async ({ page }) => {
  const errors = observeErrors(page), f = await fixture(page, 'b104', true, { theft: true });
  await f.locator('[data-a=queryhelp]').click();
  await f.locator('#kb [data-a=fshow]').click();
  await f.locator('[data-a=fshowconfirm]').click();
  const before=await resources(f);expect(before.shown).toBe(1);
  await f.locator('[data-a=combatback]').click();
  await expect(f.locator('#combat-context [data-id=steal]')).toBeVisible();
  await f.locator('#combat-context [data-id=steal]').click();
  await expect(f.locator('#toast')).toContainText('before switching to theft');
  expect(await f.evaluate(()=>__bw.F)).toBeNull();
  await f.locator('#combat-bar [data-id="basic.swords"]').click();
  expect(await f.evaluate(()=>({act:__bw.F.act,stage:__bw.F.st,pocketsEmpty:__bw.F.ent.pocketsEmpty}))).toEqual({act:'fight',stage:'prompt',pocketsEmpty:false});
  expect(await resources(f)).toEqual(before);
  expect(errors).toEqual([]);
});

test('query feedback · a contextual tip preserves full power and excludes readiness evidence', async ({ page }) => {
  const errors = observeErrors(page), f = await fixture(page, 'b102', true, { withTip: true });
  const task = await f.evaluate(() => {
    const { sql, fingerprint, newTeaching } = __bw.F.task;
    __bw.F.ent.combat.hp=__bw.F.ent.combat.max=__bw.F.foe.hp=__bw.F.foe.max=10000;
    __bw.F.ent.combat.profile.attackTime=100;
    return { sql, fingerprint, newTeaching };
  });
  expect(task.newTeaching).toBe(false);
  await f.locator('[data-a=queryhelp]').click();
  await expect(f.locator('#kb .query-reference')).toContainText(await f.evaluate(()=>__bw.F.task.tip));
  await submit(f, task.sql);
  await settled(f);
  expect(await f.evaluate(key => {
    const learning = __bw.A.learning;
    return { power: __bw.F.queryPower, recorded: learning.recent.some(entry => entry.key === key),
      scored: !!learning.evidence.select?.attempts.some(entry => entry.key === key) };
  }, task.fingerprint)).toEqual({ power: 1, recorded: true, scored: false });
  expect(errors).toEqual([]);
});

test('query feedback · a requested contract answer gives reduced pay without SQL practice or keys', async ({ page }) => {
  const errors = observeErrors(page), f = await game(page);
  await f.evaluate(() => {
    const { A: account, S: character } = __bw;
    character.gold = 100;
    character.hints = 0;
    character.eq = {};
    delete character.done.c103;
    delete character.seen.c103;
    delete account.paid.c103;
    delete account.cmds.c103;
    __bw.START.contract({ id: 'c103' });
  });
  await f.locator('[data-a=qturn]').click();
  await f.locator('#enc [data-a=help]').click();
  const hint = f.locator('#kb [data-a=hint]');
  for (const label of ['Hint · free', 'Answer shape · 14 gold', 'Show answer · 30 gold']) {
    await expect(hint).toHaveText(label);
    await hint.click();
  }
  await expect(f.locator('#kb .hintbox').last()).toContainText('ORDER BY unit_price DESC');
  await f.locator('#kb [data-fn=ldone]').click();
  const sqlPractice = () => f.evaluate(() => ({
    gold: __bw.S.gold, hints: __bw.S.hints, skills: __bw.S.skills, commands: __bw.A.cmds, completed: __bw.S.done.c103
  }));
  const before = await sqlPractice();
  expect(before.gold).toBe(56);
  expect(before.commands.c103).toBe(1);
  await submit(f, await f.evaluate(() => __bw.Q.task.sql));
  await expect(f.locator('#enc')).toContainText('Exercise done');
  const after = await sqlPractice();
  expect(after.gold - before.gold).toBe(6);
  expect(after.completed.hint).toBe(3);
  expect(after.skills).toEqual(before.skills);
  expect(after.commands).toEqual(before.commands);
  expect(after.hints).toBe(before.hints);
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
