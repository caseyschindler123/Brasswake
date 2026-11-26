const { expect } = require('@playwright/test');
const { skipArrival } = require('./intro-helper');
const { screenshot } = require('./flow');

/* Shared local-production/hosted flow: public controls, real audio/dependencies,
   read-only audio status, no local debug handles or prepared game state. */
async function audioRelease(page, info, url) {
  await page.goto(url);
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await page.locator('[data-a=newslot]').first().click();
  await page.locator('[data-a=pick][data-look="4"]').click();
  await page.locator('[data-a=begin]').click();
  await skipArrival(page, 'Audio Traveller');
  await page.locator('#nav [data-t=hero]').click();
  if (await page.locator('[data-a=coachok]').isVisible()) await page.locator('[data-a=coachok]').click();
  expect(await page.evaluate(() => typeof window.__bw)).toBe('undefined');
  const available = await page.evaluate(() => !!(window.AudioContext || window.webkitAudioContext));
  if (available) {
    await page.waitForFunction(() => Sound.playing() === 'm_tallyport', null, { timeout: 20000 });
    await page.waitForFunction(() => Sound.status().effects.cached.includes('s_click'), null, { timeout: 20000 });
    expect(await page.evaluate(() => Object.keys(Sound.SAMPLES).length)).toBe(72);
    const serial = await page.evaluate(() => Sound.status().effects.serial);
    await page.locator('[data-a=snd][data-k=mu]').click();
    expect(await page.evaluate(() => Sound.playing())).toBe(null);
    expect(await page.evaluate(() => Sound.status().effects.serial)).toBeGreaterThan(serial);
    expect(await page.evaluate(() => Sound.status().effects.lastSample)).toBe('s_click');
  } else await page.locator('[data-a=snd][data-k=mu]').click();
  await expect(page.locator('[data-a=snd][data-k=mu]')).toHaveText('Music: off');
  await expect(page.locator('[data-a=snd][data-k=fx]')).toHaveText('Effects: on');
  await screenshot(page, info, 'audio-effects-only');
  await page.locator('[data-a=snd][data-k=fx]').click();
  expect(await page.evaluate(() => Sound.status().effects.voices)).toBe(0);
  await page.locator('[data-a=snd][data-k=mu]').click();
  await expect(page.locator('[data-a=snd][data-k=fx]')).toHaveText('Effects: off');
  if (available) await page.waitForFunction(() => Sound.playing() === 'm_tallyport', null, { timeout: 20000 });
  await screenshot(page, info, 'audio-music-only');
  await page.waitForLoadState('networkidle');
  await page.reload();
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await page.locator('[data-a=playslot]').click();
  await page.locator('#nav [data-t=hero]').click();
  await expect(page.locator('[data-a=snd][data-k=mu]')).toHaveText('Music: on');
  await expect(page.locator('[data-a=snd][data-k=fx]')).toHaveText('Effects: off');
  expect(await page.evaluate(() => typeof window.__bw)).toBe('undefined');
}

module.exports = { audioRelease };
