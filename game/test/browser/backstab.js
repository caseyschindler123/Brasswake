const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');
const { drivePath } = require('./movement');

const action = (frame, name, extra = '') => frame.locator(`[data-a=${name}]${extra}`);
const position = frame => frame.evaluate(() => Scene.pos());
const row = (x, y, count, dx) => Array.from({ length: count }, (_, i) => [x + dx * i, y]);

for(const heavy of [false,true])test(`Backstab · Hide displays its actual ${heavy?'heavy armor':'light armor'} odds before practice`,async({page},info)=>{
  const errors=observeErrors(page),{frame}=await fixture(page);
  if(heavy)await frame.evaluate(()=>{const armor=__bw.makeItem('rare',1,'armor');__bw.S.inv.push(armor);__bw.ACT.equip({id:armor.id});});
  await action(frame,'combatbegin','[data-id=hide]').click();await dismiss(frame);
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
  expect(await frame.evaluate(()=>!!__bw.F)).toBe(false);
  await expect(frame.getByRole('group', { name: 'Movement joystick' })).toHaveAttribute('aria-disabled', 'false');
  await drivePath(frame, path, run);
}

async function dismiss(frame) {
  const coach = action(frame, 'coachok');
  if (await coach.isVisible()) await coach.click();
}

async function showAnswer(frame) {
  await action(frame, 'queryhelp').click();
  await action(frame, 'fshow').click();
  await action(frame, 'fshowconfirm').click();
}

async function fixture(page, { kind = 'mon', region = 1, elite = true, fencing = 40 } = {}) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  const frame = page.frames().find(f => f.url().includes('visual_test=1'));
  const lane = await frame.evaluate(({ kind, region, elite, fencing }) => {
    Sound.setMu(false);
    window.__bwFast = true;
    const s = __bw.S, blade = __bw.makeItem('common', 1, 'weapon', 'fencing');
    blade.stats = {};
    s.inv = [blade];
    s.eq = { weapon: blade.id };
    s.pages = { h1: 1 };
    s.sk = { fencing, hiding: 40, stealth: 10 };
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
      actor.tx = actor.ty = null;actor.combat=undefined;
    }
    const target = Scene.find(e => e.kind === kind && e.r === region &&
      (kind !== 'mon' || e.inst.tpl[0] === 'b' && !e.inst.lair));
    if (!target) throw Error('Missing ' + kind);
    if (kind === 'mon') target.inst.elite = elite;
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
      target.dir = 'l';target.home=[x,y];target.pursuitAnchor=[x,y];target.combat=undefined;
      Scene.hop(x + 2, y);
      window.backstabFixtureTarget = target;
      return { x, y, length };
    }
    throw Error('No open pursuit lane for ' + kind);
  }, { kind, region, elite, fencing });
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
    await frame.waitForFunction(context=>context==='Q'?__bw.Q?.step==='result':__bw.F?.st==='after',context);
  });
}

async function beginHide(frame, lane) {
  expect(await position(frame)).toEqual([lane.x + 2, lane.y]);
  await expect.poll(() => frame.evaluate(() => Scene.observed())).toBe(false);
  await expect(action(frame,'combatbegin','[data-id=hide]')).toContainText('Hide');
  await action(frame,'combatbegin','[data-id=hide]').click();
  await expect(frame.locator('#sql')).toBeVisible();
}

async function finishHideAndApproach(frame, lane) {
  await submit(frame, 'Q', frame.locator('#enc .q-foot [data-a=qleave]'));
  await expect(frame.locator('#enc')).toContainText('You are concealed.');
  await frame.locator('#enc .q-foot [data-a=qleave]').click();
  const reveal = action(frame,'combatbegin','[data-id=hide]');
  await expect(reveal).toContainText('Reveal');
  const available = await frame.evaluate(()=>__bw.CONCEAL.steps);
  const before = await frame.evaluate(() => {
    const p = Scene.debug().P;
    return { distance: p.wd || 0, remainder: p.footDistance || 0 };
  });
  // Release before the target cell centre: input polling can overshoot a
  // little, and physically touching the observer correctly breaks hiding.
  await move(frame, [[lane.x + 1.25, lane.y]], false);
  // A return walk can stop between centres. If this short approach has not
  // completed a real footstep, take another concealed walk out and back.
  if (await frame.evaluate(() => Scene.debug().P.wd || 0) - before.distance + before.remainder < 1) {
    await move(frame, [[lane.x + 2, lane.y], [lane.x + 1.25, lane.y]], false);
  }
  expect(await position(frame)).toEqual([lane.x + 1, lane.y]);
  const distance = await frame.evaluate(() => Scene.debug().P.wd || 0) - before.distance;
  const spent = Math.floor(before.remainder + distance + 1e-7);
  expect(spent).toBeGreaterThanOrEqual(1);
  expect(await frame.evaluate(()=>__bw.CONCEAL.steps)).toBe(available-spent);
  await expect(frame.locator('#ctx')).toContainText('Backstab ready');
}

async function hideAndApproach(frame, lane) {
  await beginHide(frame, lane);
  await finishHideAndApproach(frame, lane);
}

async function engage(frame,examiner=false){
  await frame.locator('#ctx').click();if(examiner)await action(frame,'start','[data-k=boss]').click();await dismiss(frame);
  expect(await frame.evaluate(()=>__bw.Combat.snapshot().target?.id)).toBe(await frame.evaluate(()=>backstabFixtureTarget.id));
}
// A victory retires the active target into F.body; inspect its retained result,
// rather than the reset combat state attached to the corpse.
const combatState=frame=>frame.evaluate(()=>({foe:__bw.F?.over&&(__bw.F.ent===backstabFixtureTarget||__bw.F.body===backstabFixtureTarget)?__bw.F.foe.hp:backstabFixtureTarget.combat.hp,max:backstabFixtureTarget.combat.max,round:__bw.F?.over&&(__bw.F.ent===backstabFixtureTarget||__bw.F.body===backstabFixtureTarget)?__bw.F.round:backstabFixtureTarget.combat.queries,hp:__bw.S.hp,hidden:__bw.CONCEAL.hidden,stamina:__bw.S.stamina,bandages:__bw.S.bandages,q:__bw.S.stats.q,sk:{...__bw.S.sk},attr:{...__bw.S.attr},sql:structuredClone(__bw.S.skills),gold:__bw.S.gold,kills:__bw.S.stats.kills,marks:Object.keys(__bw.S.boss).length,clock:Scene.tacticalTime()}));
async function beginBackstab(frame){await frame.waitForFunction(()=>__bw.Combat.descriptor('backstab').ready);await action(frame,'combatbegin','[data-id=backstab]').click();await expect(frame.locator('#fight #sql')).toBeVisible();await dismiss(frame);}
async function finishAction(frame,sql){await submit(frame,'F',null,sql);return combatState(frame);}
async function waitAttack(frame){await frame.waitForFunction(()=>__bw.Combat.snapshot().recovery.ready);}
// A chasing actor reserves its next integer tile before its visible feet arrive.
// Finish recovery first, then follow current feet with short native walking legs;
// never let a later readiness wait turn an in-range approach into a stale one.
async function approachLiveContact(frame) {
  await waitAttack(frame);
  for (let leg = 0; leg < 3; leg++) {
    const state = await frame.evaluate(() => {
      const { P, map } = Scene.debug(), e = backstabFixtureTarget;
      const contact = Scene.debug().interactionDistance(e);
      if (Number.isFinite(contact) && contact <= 1.1 && e.tx == null) return { ready: true };
      const dx = P.fx - e.fx, dy = P.fy - e.fy;
      const directions = Math.abs(dx) >= Math.abs(dy)
        ? [[Math.sign(dx) || 1, 0], [0, Math.sign(dy) || 1]]
        : [[0, Math.sign(dy) || 1], [Math.sign(dx) || 1, 0]];
      const point = directions.map(([x, y]) => [e.fx + x * .95, e.fy + y * .95]).find(([x, y]) => {
        const cx = Math.round(x), cy = Math.round(y), i = cy * map.w + cx;
        return cx > 0 && cy > 0 && cx < map.w && cy < map.h && !map.solid[i] && !map.occ.has(i);
      });
      if (!point) throw Error('No clear native approach to the moving Examiner');
      return { ready: false, point };
    });
    if (state.ready) break;
    await move(frame, [state.point], false);
  }
  const contact = await frame.evaluate(() => ({
    distance: Scene.debug().interactionDistance(backstabFixtureTarget), limit: InteractionRules.reach,
    lineOfFire: Scene.combatFacts(backstabFixtureTarget).lineOfFire, settled: backstabFixtureTarget.tx == null
  }));
  expect(Number.isFinite(contact.distance)).toBe(true);
  expect(contact.distance).toBeLessThanOrEqual(contact.limit);
  expect(contact.lineOfFire).toBe(true);
  expect(contact.settled).toBe(true);
}
async function noHints(frame){await action(frame,'queryhelp').click();await expect(frame.locator('#kb')).toContainText('No hints are available');await expect(action(frame,'fhint')).toHaveCount(0);await expect(action(frame,'fshow')).toHaveCount(0);await frame.locator('#kb [data-fn=ldone]').click();}


test('Backstab · real concealed rear walk at Stealth 10 unlocks two Fencing thrusts',async({page},info)=>{
  const errors=observeErrors(page),{frame,lane}=await fixture(page);await hideAndApproach(frame,lane);await engage(frame);await waitAttack(frame);await beginBackstab(frame);const initial=await combatState(frame);expect(initial.sk.stealth).toBe(10);expect(await frame.evaluate(()=>Object.keys(__bw.S.pages).some(id=>/^a[1-8]r?$/.test(id)))).toBe(false);await finishAction(frame);
  const result=await combatState(frame),hits=await frame.evaluate(()=>__bw.F.strikes);expect(hits).toHaveLength(2);expect(hits.every(n=>n>=25)).toBe(true);expect(initial.foe-result.foe).toBe(hits.reduce((a,b)=>a+b,0));expect(result.hidden).toBe(false);expect(result.round).toBe(1);expect(result.sk.fencing).toBeGreaterThan(initial.sk.fencing);expect(result.sk.tactics).toBeGreaterThan(0);expect(result.sk.anatomy).toBeGreaterThan(0);
  expect(result.stamina).toBeCloseTo(initial.stamina-8+(result.clock-initial.clock)/1000*LiveStaminaRate,1);await screenshot(page,info,'backstab-live-thrusts');await frame.evaluate(()=>__bw.Combat.cancel());expect(await frame.evaluate(()=>__bw.Combat.descriptor('backstab').eligible)).toBe(false);expect(errors).toEqual([]);
});
const LiveStaminaRate=3;
for(const method of ['wrong','shown','low stamina'])test('Backstab · '+method+' cannot award a bonus thrust or RPG gain',async({page})=>{
  const errors=observeErrors(page),{frame,lane}=await fixture(page,{elite:method!=='shown'});await hideAndApproach(frame,lane);await engage(frame);await beginBackstab(frame);if(method==='shown')await showAnswer(frame);else await noHints(frame);if(method==='low stamina')await frame.evaluate(()=>__bw.S.stamina=7);const before=await combatState(frame);
  if(method==='low stamina'){await frame.locator('#sql').fill(await frame.evaluate(()=>__bw.F.task.sql));await frame.locator('#kb [data-fn=run]').click();await expect(frame.locator('#toast')).toContainText('stamina');expect(await combatState(frame)).toEqual(before);}
  else{await finishAction(frame,method==='wrong'?wrongAnswer:undefined);const after=await combatState(frame);expect(after.sk).toEqual(before.sk);expect(after.attr).toEqual(before.attr);expect(after.sql).toEqual(before.sql);expect(after.hidden).toBe(false);expect(after.round).toBe(before.round+1);expect(after.stamina).toBeCloseTo(before.stamina-8+(after.clock-before.clock)/1000*3,1);if(method==='wrong'){expect(after.foe).toBe(before.foe);expect(await frame.evaluate(()=>__bw.F.strikes)).toEqual([]);}else{expect(before.foe-after.foe).toBeGreaterThan(0);expect(before.foe-after.foe).toBeLessThan(32);}}
  expect(errors).toEqual([]);
});
for(const method of ['wrong','shown'])test('Backstab · '+method+' answer preserves damage and training protections',async({page})=>{
  const errors=observeErrors(page),{frame,lane}=await fixture(page,{elite:method!=='shown'});await hideAndApproach(frame,lane);await engage(frame);await frame.evaluate(()=>{backstabFixtureTarget.combat.hp=1;__bw.S.hp=__bw.maxHp()-20;});await beginBackstab(frame);if(method==='shown')await showAnswer(frame);const before=await combatState(frame);await finishAction(frame,method==='wrong'?wrongAnswer:undefined);const after=await combatState(frame);
  if(method==='wrong'){expect(after.foe).toBe(before.foe);expect(after.kills).toBe(before.kills);expect(await frame.evaluate(()=>__bw.F.queryPower)).toBe(0);expect(await frame.evaluate(()=>__bw.Combat.active())).toBe(true);}else{expect(after.foe).toBeLessThanOrEqual(0);expect(after.kills).toBe(before.kills+1);expect(after.hp).toBe(before.hp);}expect(after.bandages).toBe(before.bandages);expect(after.sk).toEqual(before.sk);expect(after.attr).toEqual(before.attr);expect(after.sql).toEqual(before.sql);expect(errors).toEqual([]);
});

test('Backstab · cancelling SQL beside an unchanged target restores native context', async ({ page }, info) => {
  const errors = observeErrors(page), { frame, lane } = await fixture(page, { kind: 'boss' });
  // This is a practiced player's cancellation, independent of first-fight coaching.
  await frame.evaluate(() => Object.assign(__bw.S.seen, { fight: 1, fprompt: 1 }));
  await move(frame, [[lane.x + 1.25, lane.y]], false);
  const context = frame.locator('#ctx'), name = await frame.evaluate(() => backstabFixtureTarget.name);
  await expect(context).toBeVisible();
  await expect(context).toHaveAccessibleName('Face: ' + name);
  await context.click();
  await action(frame, 'start', '[data-k=boss]').click();
  await expect(context).toBeVisible();
  const result = await frame.evaluate(() => {
    const read = () => ({ at: Scene.pos(), target: [backstabFixtureTarget.fx, backstabFixtureTarget.fy],
      hp: __bw.S.hp, mana: __bw.S.mana, stamina: __bw.S.stamina, q: __bw.S.stats.q,
      gold: __bw.S.gold, kills: __bw.S.stats.kills, marks: Object.keys(__bw.S.boss).length });
    // Opening from a paused interaction must not need an intermediate SQL HUD
    // frame before cancelling. This is Scene's normal interaction pause.
    Scene.pause();
    const before = read();
    // Exercise a rapid real begin/cancel before the next world frame. The HUD
    // must restore visibility even when its nearest-target label is unchanged.
    const opened = __bw.Combat.begin('basic.fencing');
    const prompt = __bw.F?.st, hiddenWhileWriting = document.querySelector('#ctx').hidden;
    const cancelled = __bw.Combat.cancel();
    return { opened, prompt, hiddenWhileWriting, cancelled, before, after: read(), fight: __bw.F, query: __bw.Q };
  });
  expect(result).toMatchObject({ opened: true, prompt: 'prompt', hiddenWhileWriting: true, cancelled: true, fight: null, query: null });
  expect(result.after).toEqual(result.before);
  await expect(context).toBeVisible();
  await expect(context).toHaveAccessibleName('Face: ' + name);
  await screenshot(page, info, 'cancelled-sql-context');
  await context.click();
  await expect(frame.locator('#enc h1')).toHaveText(name);
  expect(errors).toEqual([]);
});

test('Backstab · Examiner pursuit and brief re-entry keep wounds and committed SQL phase',async({page},info)=>{
  test.setTimeout(90000);const errors=observeErrors(page),{frame,lane}=await fixture(page,{kind:'boss',fencing:44});await hideAndApproach(frame,lane);await engage(frame,true);const full=await combatState(frame);await beginBackstab(frame);await expect(frame.locator('#fight .ask')).toContainText('lead_time_days');await noHints(frame);await finishAction(frame);const wounded=await combatState(frame);expect(wounded.foe).toBeGreaterThan(0);expect(wounded.foe).toBeLessThan(full.foe);
  await frame.evaluate(()=>__bw.Combat.cancel());await move(frame,[[lane.x+5,lane.y]],true);expect(await frame.evaluate(()=>backstabFixtureTarget.combat.phase)).toBe('chase');expect((await combatState(frame)).foe).toBe(wounded.foe);expect((await combatState(frame)).round).toBe(1);
  await approachLiveContact(frame);expect(await frame.evaluate(()=>Scene.observed())).toBe(true);expect(await frame.evaluate(()=>__bw.Combat.begin('hide'))).toBe(false);await frame.locator('#ctx').click();await expect(frame.locator('#enc')).toContainText(wounded.foe+' health');expect(await frame.evaluate(()=>({gold:__bw.S.gold,kills:__bw.S.stats.kills,marks:Object.keys(__bw.S.boss).length}))).toEqual({gold:full.gold,kills:full.kills,marks:full.marks});await action(frame,'start','[data-k=boss]').click();await action(frame,'combatbegin','[data-id="basic.fencing"]').click();await dismiss(frame);expect(await frame.evaluate(()=>__bw.F.round)).toBe(1);expect(await frame.evaluate(()=>__bw.F.task.ret)).toBe('name, unit_price');
  const paused=await frame.evaluate(()=>{window.backstabWall=Date.now;Date.now=()=>backstabWall()+180000;return {clock:Scene.tacticalTime(),round:backstabFixtureTarget.combat.queries};});try{await frame.waitForTimeout(250);expect(await frame.evaluate(()=>({clock:Scene.tacticalTime(),round:backstabFixtureTarget.combat.queries}))).toEqual(paused);}finally{await frame.evaluate(()=>{Date.now=backstabWall;delete window.backstabWall;});}
  await screenshot(page,info,'backstab-live-examiner-reentry');await finishAction(frame);for(let n=0;n<5&&!await frame.evaluate(()=>__bw.F?.over);n++){await frame.evaluate(()=>__bw.Combat.cancel());await waitAttack(frame);await frame.evaluate(()=>__bw.Combat.begin('basic.fencing'));await finishAction(frame);}const won=await combatState(frame);expect(won.foe).toBeLessThanOrEqual(0);expect(won.marks).toBe(full.marks+1);expect(won.kills).toBe(full.kills+1);expect(won.gold).toBeGreaterThan(full.gold);expect(errors).toEqual([]);
});

// This prepared short room uses an eight-tile leash; the shared default24 rule
// is covered by pure rules. Supply every route cell to the native driver's budget.
test('Backstab · keeper pursuit stays in the dungeon and full return restores its anchor health',async({page})=>{
  test.setTimeout(90000);const errors=observeErrors(page),{frame,lane}=await fixture(page,{kind:'keeper'});await frame.evaluate(()=>{__bw.Combat.selectTarget(backstabFixtureTarget);backstabFixtureTarget.combat.profile.leash=8;backstabFixtureTarget.combat.profile.range=1.35;});await hideAndApproach(frame,lane);await engage(frame);await beginBackstab(frame);await finishAction(frame);const wounded=await combatState(frame);expect(wounded.foe).toBeLessThan(wounded.max);await frame.evaluate(()=>__bw.Combat.cancel());await move(frame,row(lane.x+2,lane.y,lane.length-2,1),true);expect(await position(frame)).toEqual([lane.x+lane.length-1,lane.y]);
  await expect.poll(()=>frame.evaluate(()=>{const e=backstabFixtureTarget;return {phase:e.combat.phase,active:__bw.Combat.active(),leash:e.combat.profile.leash,anchor:e.pursuitAnchor,position:[e.fx,e.fy],player:Scene.pos()};})).toMatchObject({phase:expect.stringMatching(/^(return|idle)$/),active:false});await frame.waitForFunction(({x,y})=>backstabFixtureTarget.x===x&&backstabFixtureTarget.y===y&&backstabFixtureTarget.tx==null&&!backstabFixtureTarget.returning,lane,{timeout:15000});const returned=await combatState(frame);expect(returned.foe).toBe(returned.max);expect(returned.round).toBe(0);expect(returned.kills).toBe(wounded.kills);expect(returned.gold).toBe(wounded.gold);expect(await frame.evaluate(()=>({dungeon:Scene.inDungeonMap(),claimed:__bw.DP.current().keeper}))).toEqual({dungeon:true,claimed:false});expect(errors).toEqual([]);
});

test('Backstab · pursuit entry cannot bypass the Council marks or main-character gate',async({page})=>{
  const errors=observeErrors(page),{frame}=await fixture(page,{kind:'boss',region:8});await frame.evaluate(()=>__bw.Combat.selectTarget(backstabFixtureTarget));const hp=await frame.evaluate(()=>__bw.S.hp);for(const main of [true,false]){await frame.evaluate(main=>{if(!main){__bw.A.main=(__bw.A.cur+1)%5;__bw.S.boss=Object.fromEntries([1,2,3,4,5,6,7].map(r=>[r,Date.now()]));}__bw.Combat.begin('basic.fencing');},main);await expect(frame.locator('#toast')).toContainText(main?'requires the other seven marks':'Only the main character');expect(await frame.evaluate(()=>__bw.F)).toBeNull();expect(await frame.evaluate(()=>__bw.S.hp)).toBe(hp);}expect(errors).toEqual([]);
});

test('Backstab · switching character clears pursuit and wounds from the previous owner',async({page},info)=>{
  const errors=observeErrors(page),{frame,lane}=await fixture(page);const reserve=await frame.evaluate(({x,y,length})=>{__bw.save();const a=__bw.A,slot=(a.cur+1)%a.slots.length;a.slots[slot]={...structuredClone(a.slots[a.cur]),uid:'reserve-owner',name:'Reserve tester',pos:[x+length-1,y]};return slot;},lane);await hideAndApproach(frame,lane);await engage(frame);const initial=await combatState(frame);await beginBackstab(frame);await finishAction(frame);expect((await combatState(frame)).foe).toBeLessThan(initial.max);await frame.evaluate(()=>__bw.Combat.cancel());expect(await frame.evaluate(()=>__bw.Combat.active())).toBe(true);
  await frame.locator('#nav [data-t=hero]').click();await dismiss(frame);await action(frame,'reset').click();await action(frame,'playslot','[data-i="'+reserve+'"]').click();await expect(frame.locator('#title')).toBeHidden();expect(await frame.evaluate(()=>__bw.S.name)).toBe('Reserve tester');expect(await frame.evaluate(()=>({chase:backstabFixtureTarget.chase,hunt:!!backstabFixtureTarget.hunt}))).toEqual({chase:0,hunt:false});
  await frame.evaluate(()=>{const e=backstabFixtureTarget;Scene.hallMove(e,e.x,e.y);Scene.hop(e.x+1,e.y);__bw.Combat.selectTarget(e);});const clean=await combatState(frame);expect(clean.foe).toBe(initial.max);expect(clean.round).toBe(0);expect(await frame.evaluate(()=>__bw.CONCEAL.hidden)).toBe(false);await screenshot(page,info,'backstab-live-owner-clean');expect(errors).toEqual([]);
});
