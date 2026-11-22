const fs = require('node:fs');
const path = require('node:path');
const { defineConfig } = require('@playwright/test');
const base = require('../playwright.config');

const game = path.resolve(__dirname, '..');
const work = path.resolve(game, '../work');
const dist = process.env.BW_EXPEDITION_DIST;
const port = Number(process.env.BW_EXPEDITION_PORT);
const workers = Number(process.env.BW_UI_WORKERS ?? 8);

if (!dist || !path.isAbsolute(dist) || path.dirname(dist) !== work || !path.basename(dist).startsWith('dungeon-expedition-') || !fs.existsSync(path.join(dist, 'release.json'))) {
  throw new Error('Run test/dungeon-expeditions.js to create an expedition snapshot');
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('BW_EXPEDITION_PORT must be a valid local port');
if (!Number.isSafeInteger(workers) || workers < 1) throw new Error('BW_UI_WORKERS must be a positive integer');
const projects = base.projects.filter(project => project.name === 'phone-chromium');
if (projects.length !== 1) throw new Error('Expected one phone-chromium project in the base test configuration');

const baseURL = `http://localhost:${port}`;
module.exports = defineConfig({
  ...base,
  testDir: path.join(game, 'test/browser'),
  projects,
  workers,
  outputDir: path.join(game, 'test-results-expeditions'),
  reporter: [['list'], ['json', { outputFile: path.join(work, 'dungeon-expedition-report.json') }]],
  use: { ...base.use, baseURL },
  webServer: {
    ...base.webServer,
    cwd: game,
    url: `${baseURL}/__health`,
    env: { BW_DIST: dist, BW_TEST_PORT: String(port) }
  }
});
