const { expect } = require('@playwright/test');
const { screenshot } = require('./flow');
const { skipArrival } = require('./intro-helper');

// Public save import prepares post-tutorial access, Strike and a nearby location.
// Starting combat stats/resources remain; battle actions, SQL and comparison
// expansion use visible controls without localhost debug handles.
async function battleRelease(page, info, { hosted = true } = {}) {
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await page.locator('[data-a=newslot]').first().click();
  await page.locator('[data-a=pick][data-look="0"]').click();
  await page.locator('[data-a=begin]').click();
  await skipArrival(page, 'Battle Review');
  await expect(page.locator('#onboard')).toBeHidden();
  await expect(page.locator('.movement-joystick')).toHaveAttribute('aria-disabled', 'false');
  const at = await page.evaluate(() => {
    const e = Scene.find(e => e.kind === 'boss' && e.r === 1);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const p = [e.x + dx, e.y + dy], safe = Scene.safePosition(p, 1);
      if (safe[0] !== p[0] || safe[1] !== p[1]) continue;
      if (Scene.find(other => other !== e && !other.hidden && Math.abs(other.x - p[0]) + Math.abs(other.y - p[1]) <= 1)) continue;
      return p;
    }
    throw Error('No clear approach to the First Circle Examiner');
  });
  await page.locator('#nav [data-t=hero]').click();
  const coach = page.locator('[data-a=coachok]'); if (await coach.isVisible()) await coach.click();
  await page.locator('[data-a=export]').click();
  const account = JSON.parse(Buffer.from(await page.locator('#savebox').inputValue(), 'base64').toString('utf8'));
  const world = account.worlds[account.world], hero = world.slots[world.cur]; hero.pos = at; hero.region = 1; hero.gd = 99; hero.tut = 2; hero.pages.a1 = 1;
  await page.locator('.sheet-x').click(); await page.locator('[data-a=import]').click();
  await page.locator('#savebox').fill(Buffer.from(JSON.stringify(account)).toString('base64'));
  await page.locator('[data-a=doimport]').click();
  await page.locator('#nav [data-t=world]').click();
  if (await coach.isVisible()) await coach.click();
  await page.waitForFunction(at => Scene.pos()?.every((v, i) => v === at[i]), at);
  await expect(page.locator('.movement-joystick')).toHaveAttribute('aria-disabled', 'false');
  await expect(page.locator('#ctx')).toBeVisible();
  await page.waitForTimeout(500); await page.locator('#ctx').click();
  await expect(page.locator('[data-a=start][data-k=boss]')).toBeVisible();
  await page.locator('[data-a=start][data-k=boss]').click();
  if (await coach.isVisible()) await coach.click();
  await page.locator('[data-a=fpage][data-id=a1]').click();
  if (await coach.isVisible()) await coach.click();
  await page.locator('#sql').fill('SELECT -987654321 AS unrelated_result');
  await page.locator('#kb [data-fn=run]').click();
  await expect(page.locator('.query-power')).toContainText('0% power');
  await expect(page.locator('.query-yours')).toContainText('SELECT -987654321');
  await expect(page.locator('.query-solution')).toContainText(/Corrected query|One correct solution/);
  await expect(page.locator('[data-a=fchoose]')).toBeVisible({ timeout: 25000 });
  const expand = page.locator('[data-a=fcompare]');
  if (await expand.isVisible()) { await expand.click(); await expect(expand).toHaveAttribute('aria-expanded', 'true'); }
  await screenshot(page, info, 'released-battle-comparison');
  if (hosted) expect(await page.evaluate(() => typeof window.__bw)).toBe('undefined');
}
module.exports = { battleRelease };
