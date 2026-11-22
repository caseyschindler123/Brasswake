const { test, expect } = require('@playwright/test');
const { observeErrors, playerFlow } = require('./flow');

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
