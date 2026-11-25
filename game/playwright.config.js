require('./test/browser-path');
const { defineConfig } = require('@playwright/test');
const live = process.env.BW_LIVE === '1';
const localURL = 'http://localhost:' + (process.env.BW_TEST_PORT || 8781);
const phone = { viewport: { width: 390, height: 720 }, deviceScaleFactor: 1,
  isMobile: true, hasTouch: true };
const sceneProfiles=process.env.BW_SCENE_PROFILES?JSON.parse(process.env.BW_SCENE_PROFILES):require('./test/scope-policy').PROFILES;
if(!Array.isArray(sceneProfiles)||!sceneProfiles.length||sceneProfiles.some(p=>!require('./test/scope-policy').PROFILES.includes(p)))throw Error('Invalid capture profiles');

module.exports = defineConfig({
  testDir: './test/browser',
  testMatch: live ? 'live.spec.js' : 'ui.spec.js',
  timeout: live ? 180000 : 60000,
  expect: { timeout: 15000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.BW_UI_WORKERS ? Number(process.env.BW_UI_WORKERS) : 2,
  outputDir: live ? 'test-results-live' : 'test-results',
  reporter: [['list'], ['html', { outputFolder: live ? 'playwright-report-live' : 'playwright-report', open: 'never' }]],
  use: {
    baseURL: live ? process.env.BW_BASE_URL : localURL,
    actionTimeout: 15000,
    navigationTimeout: 45000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: live ? [{ name: 'live-phone-chromium', use: { browserName: 'chromium', ...phone } }] : [
    { name: 'phone-chromium', grepInvert:sceneProfiles.includes('phone-chromium')?undefined:/visual scene:/, use: { browserName: 'chromium', ...phone } },
    { name: 'phone-webkit', grepInvert:sceneProfiles.includes('phone-webkit')?undefined:/visual scene:/, use: { browserName: 'webkit', ...phone } },
    { name: 'desktop-chromium', grepInvert:sceneProfiles.includes('desktop-chromium')?undefined:/visual scene:/, use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
  webServer: live ? undefined : {
    command: 'node test/server.js',
    url: localURL + '/__health',
    reuseExistingServer: false,
    timeout: 15000,
  },
});
