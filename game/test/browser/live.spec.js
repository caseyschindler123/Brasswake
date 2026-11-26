const { test, expect } = require('@playwright/test');
const { observeErrors, playerFlow } = require('./flow');
const {fullArrival}=require('./intro-helper');
const {screenshot}=require('./flow');
const selected = new Set(require('../live-suites').suitesFromLiveEnvironment());

async function dismissTravelTalk(page) {
  const coach = page.locator('#coach [data-a=coachok]');
  if (await coach.isVisible()) await coach.click();
  const leave = page.locator('#say [data-a=closesheet]');
  const speech = page.locator('#say-text');
  for (let i = 0; i < 5 && await speech.isVisible(); i++) {
    if (await leave.isVisible()) { await leave.click(); return; }
    await speech.click();
  }
}

async function holdTravelKey(page, key, ms, label) {
  await dismissTravelTalk(page);
  await expect(page.getByRole('group', { name: 'Movement joystick' })).toHaveAttribute('aria-disabled', 'false');
  await page.keyboard.down(key);
  try {
    return await page.evaluate(({ ms, label }) => new Promise(resolve => {
      let previous, elapsed = 0;
      const frame = now => {
        if (previous !== undefined) elapsed += Math.min(50, now - previous);
        previous = now;
        const near = document.querySelector('#ctx');
        const reached = !!label && !near.hidden && near.textContent === label && near.getClientRects().length > 0;
        if (reached || elapsed >= ms || !document.querySelector('#say').hidden) resolve(reached);
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }), { ms, label });
  } finally { await page.keyboard.up(key); }
}

async function townChartPosition(page) {
  await dismissTravelTalk(page);
  await page.locator('#nav [data-t=map]').click();
  const town = page.getByRole('button', { name: 'Town', exact: true });
  if (await town.getAttribute('aria-pressed') !== 'true') await town.click();
  await dismissTravelTalk(page);
  const position = await page.locator('.cmap-frame .me[title="You are here"]').evaluate(marker => {
    const [width, height] = marker.parentElement.style.aspectRatio.split('/').map(Number);
    return [marker.style.left, marker.style.top].map((percent, axis) =>
      Math.round(parseFloat(percent) * (axis ? height : width) / 100));
  });
  await page.locator('#nav [data-t=world]').click();
  return position;
}

async function walkToDojo(page) {
  // Step around the Marigold sign, follow the harbor road to the square,
  // and take the lane south of the dojo. Read the white player marker on
  // the Town chart to correct movement after speech or a key release.
  const path = [[10, 44], [20, 44], [20, 42], [24, 42], [24, 43], [42, 43], [42, 32], [56, 32]];
  for (const target of path) {
    let position = await townChartPosition(page);
    for (let attempt = 0; attempt < 10 && !position.every((coord, axis) => coord === target[axis]); attempt++) {
      const dx = target[0] - position[0], dy = target[1] - position[1];
      await holdTravelKey(page, dx ? (dx > 0 ? 'd' : 'a') : (dy > 0 ? 's' : 'w'),
        Math.min(4000, Math.max(450, (Math.abs(dx || dy) - .15) * 650)));
      position = await townChartPosition(page);
    }
    expect(position, 'Reach the next landmark on the Tallyport Town chart').toEqual(target);
  }
  const door = 'Go in: Dojo';
  expect(await holdTravelKey(page, 'w', 4500, door)).toBe(true);
  await page.getByRole('button', { name: door, exact: true }).tap();
  const specialist = 'Talk: Davy Pruitt';
  expect(await holdTravelKey(page, 'w', 5500, specialist)).toBe(true);
  await page.getByRole('button', { name: specialist, exact: true }).tap();
}

// Answer from the published wording. Each row is a way a player could apply
// the sorting lesson to one of Davy's questions.
const sortingAnswers = [
  [/^Show just the vendor names/, 'SELECT name FROM vendors ORDER BY name'],
  [/^Show each customer’s city and name, with names/, 'SELECT city, name FROM customers ORDER BY name DESC'],
  [/^Show the item name and price/, 'SELECT name, unit_price FROM items ORDER BY unit_price'],
  [/^Show each employee’s salary/, 'SELECT salary, name FROM employees ORDER BY salary DESC'],
  [/^Show the order date, status and order number/, 'SELECT order_date, status, order_id FROM orders ORDER BY order_date DESC'],
  [/^Show each vendor’s realm, rating and name/, 'SELECT realm, rating, name FROM vendors ORDER BY realm, rating DESC'],
  [/^Show each customer’s city and name\. Sort cities/, 'SELECT city, name FROM customers ORDER BY city DESC, name'],
  [/^Show category, price, name and quantity/, 'SELECT category, unit_price, name, stock_qty FROM items ORDER BY category, unit_price DESC, name'],
];

async function learnSorting(page, info) {
  await walkToDojo(page);
  const menu = page.locator('#sheet');
  await expect(menu).toContainText('Davy Pruitt');
  await menu.getByRole('button', { name: 'Explain and try it' }).click();
  const exercise = page.locator('#enc');
  await expect(exercise.getByRole('heading', { name: 'Sorting rows', exact: true })).toBeVisible();
  await expect(exercise.getByText('What it returns', { exact: true })).toBeVisible();
  await expect(exercise.locator('table.res').first()).toBeVisible();
  await screenshot(page, info, 'published-dojo-sorting-lesson');
  await exercise.getByRole('button', { name: 'Try it', exact: true }).click();
  await expect(exercise).toContainText('Free, untimed dojo practice');
  const question = (await exercise.locator('.ask').innerText()).trim();
  const answer = sortingAnswers.find(([pattern]) => pattern.test(question));
  expect(answer, 'Recognize the sorting task from its visible wording: ' + question).toBeDefined();
  await page.locator('#sql').fill(answer[1]);
  await page.locator('#kb [data-fn=run]').tap();
  await expect(exercise.getByRole('heading', { name: 'That worked', exact: true })).toBeVisible();
  await expect(exercise).toContainText('No health, supplies, gold or equipment were spent.');
  await screenshot(page, info, 'published-dojo-sorting-result');
  await exercise.locator('.q-head [data-a=qleave]').click();
  await expect(exercise).toBeHidden();
  await page.locator('#nav [data-t=ledger]').click();
  await dismissTravelTalk(page);
  await page.getByRole('button', { name: 'Lessons', exact: true }).click();
  const note = page.locator('#view .sql-concept', { hasText: 'Sorting rows' });
  await note.locator('summary').click();
  await expect(note).toContainText('Use ORDER BY when the order of the rows matters.');
  await expect(note.getByRole('button', { name: 'Practise this technique safely' })).toBeVisible();
}

if (selected.has('audio')) test('the published generated soundtrack and effects obey independent persistent controls', async ({ page }, info) => {
  const errors = observeErrors(page);
  await require('./audio-release').audioRelease(page, info, './?commit=' + process.env.BW_EXPECT_COMMIT);
  expect(errors).toEqual([]);
});

if (selected.has('offline')) test('the published game downloads, cold reopens offline, and restores a save file',async({page,context},info)=>{
  test.setTimeout(300000);
  await require('./offline-flow').offlineFlow(page,context,info,{url:'./',live:true});
});

if (selected.has('battle')) test('the published battle grades SQL and compares the wrong query', async ({ page }, info) => {
  const errors = observeErrors(page);
  await page.goto('./?commit=' + process.env.BW_EXPECT_COMMIT);
  await require('./battle-release').battleRelease(page, info);
  expect(errors).toEqual([]);
});

if (selected.has('arrival')) test('the published rescue reaches Tallyport and a dojo lesson through visible controls',async({page},info)=>{
  const expected=process.env.BW_EXPECT_COMMIT;expect(expected).toMatch(/^[a-f0-9]{40}$/);const errors=observeErrors(page);
  await page.goto('./?commit='+expected);await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="3"]').click();await page.locator('[data-a=begin]').click();
  await fullArrival(page,info,screenshot,{name:'Sea Traveller',origin:'dwarrowdeep',visibleOnly:true});
  await learnSorting(page,info);
  expect(await page.evaluate(()=>typeof window.__bw)).toBe('undefined');expect(errors).toEqual([]);
});

if (selected.has('arrival')) test('the published intro keeps character selection in its portrait menu and resumes a name draft',async({page},info)=>{
  const expected=process.env.BW_EXPECT_COMMIT;expect(expected).toMatch(/^[a-f0-9]{40}$/);const errors=observeErrors(page);
  await page.goto('./?commit='+expected);await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="0"]').click();await page.locator('[data-a=begin]').click();
  const rescue=page.locator('[data-a=boatskiprescue]');if(await rescue.isVisible())await rescue.click();
  await expect(page.locator('#boat-name')).toBeVisible();await page.locator('#boat-name').fill('Menu Traveller');
  await expect(page.locator('#onboard [data-a=boatmenu]')).toHaveCount(0);
  await page.getByRole('button',{name:'Character menu',exact:true}).click();await expect(page.locator('#sheet-body')).toContainText('Progress saves automatically');await screenshot(page,info,'published-intro-character-menu');
  await page.getByRole('button',{name:'Continue playing',exact:true}).click();await expect(page.locator('#sheet')).toBeHidden();await expect(page.locator('#boat-name')).toHaveValue('Menu Traveller');
  await page.getByRole('button',{name:'Character menu',exact:true}).click();await page.locator('#sheet').getByRole('button',{name:'Return to characters',exact:true}).click();
  await expect(page.locator('#title')).toBeVisible();await page.waitForLoadState('networkidle');await page.reload();await expect(page.locator('#artload')).toBeHidden({timeout:45000});await page.locator('[data-a=playslot]').first().click();
  await expect(page.locator('#boat-name')).toHaveValue('Menu Traveller');expect(await page.evaluate(()=>typeof window.__bw)).toBe('undefined');expect(errors).toEqual([]);
});

test('the exact deployed commit serves a working game', async ({ page, request }, info) => {
  const expected = process.env.BW_EXPECT_COMMIT;
  expect(expected, 'Set BW_EXPECT_COMMIT to the full commit to verify').toMatch(/^[a-f0-9]{40}$/);
  // test/live.js has already verified the live commit and HTML hash.
  const errors = observeErrors(page);
  await page.goto('./?commit=' + expected);
  await playerFlow(page, info);
  expect(await page.evaluate(() => typeof window.__bw)).toBe('undefined');
  expect(errors).toEqual([]);
});
