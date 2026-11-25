const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
require('./browser-path');
const {chromium} = require('playwright');

const baseURL = new URL(process.argv[2] || 'http://localhost:8885');
if (baseURL.hostname !== 'localhost') throw Error('The captures need the localhost visual fixture.');
const output = path.resolve(process.argv[3] || path.join(__dirname, '../../work/world-architecture/dungeon-captures'));
const profiles = {
  phone: {viewport: {width: 390, height: 720}, deviceScaleFactor: 1, isMobile: true, hasTouch: true},
  desktop: {viewport: {width: 1280, height: 800}, deviceScaleFactor: 1}
};

async function saveView(page, frame, folder, name) {
  await frame.waitForFunction(() => !Scene.debug().map.pending);
  // The transient 3.2s location banner sits over a portal at phone scale.
  await frame.waitForTimeout(3500);
  const file = name + '.png';
  await page.screenshot({path: path.join(folder, file), animations: 'disabled'});
  return file;
}

async function surface(frame, region) {
  return frame.evaluate(r => {
    const stairs = Scene.find(e => e.kind === 'stairs' && e.r === r);
    if (!stairs) throw Error('Missing surface entrance for ' + r);
    Scene.load([stairs.x + 1, stairs.y + 2],r);
    return {x: stairs.x, y: stairs.y};
  }, region);
}

async function floor(frame, region, level, view) {
  return frame.evaluate(({r, level, view}) => {
    const lab = Dungeons.get(r);
    if (view === 'entrance') {
      if (!__bw.DG) __bw.DP.enter(r, false);
      if (level) __bw.DP.floor(level);
    }
    const {map} = Scene.debug();
    if (!map.dungeonFloor || map.r !== r || map.f !== level) throw Error('Wrong staged dungeon floor.');
    // Keep the normal draw path and avoid combat interrupting a still capture.
    for (const e of map.ents) {
      if (!['mon','keeper','guard'].includes(e.kind)) continue;
      Object.assign(e, {agg: 0, wander: 0, tx: null, fx: e.x, fy: e.y});
    }
    const stairs = map.ents.filter(e => e.kind === 'dtravel');
    const recesses = map.props.filter(p => p.recess);
    const entrance = stairs.find(e => e.to < level);
    const descent = stairs.find(e => e.to > level);
    const display = recesses.find(p => p.recess.y === map.layout.rooms[0].y + map.layout.rooms[0].h);
    if (view === 'descent') {
      if (!descent) throw Error('No descent on representative floor.');
      Scene.hop(descent.x + 1, descent.y + 2);
    }
    if (view === 'display') {
      if (!display) throw Error('No display near representative entrance.');
      const y = display.recess.y;
      const location = [[display.x, y - 2], [display.x + 1, y - 2], [display.x - 1, y - 2]]
        .find(([x, y]) => !map.solid[y * map.w + x] && !map.occ.has(y * map.w + x));
      if (!location) throw Error('No clear staging spot beside a display.');
      Scene.hop(...location);
    }
    const point = e => e && {id: e.id, x: e.x, y: e.y, destination: e.to};
    return {region: r, name: lab.name, floor: level + 1, label: map.layout.name,
      mapTiles: [map.w, map.h], arrival: map.entry, entrance: point(entrance), descent: point(descent) ?? null,
      displays: recesses.length, nearbyDisplay: display?.recess ?? null};
  }, {r: region, level, view});
}

async function paintedPortal(frame, point) {
  await frame.waitForFunction(({x, y}) => Scene.find(e => e.x === x && e.y === y && ['stairs','dtravel'].includes(e.kind))?.obj?.source, point);
  return frame.evaluate(({x, y}) => {
    const {obj: a} = Scene.find(e => e.x === x && e.y === y && ['stairs','dtravel'].includes(e.kind));
    const {cam, zoom} = Scene.debug();
    const anchor = [(x * 16 + 8 - cam.x) * zoom, ((y + 1) * 16 - cam.y) * zoom];
    const logicalSize = [a.c.width / 3, a.c.height / 3];
    return {logicalSize, sourceSize: [a.source.width, a.source.height],
      screenBounds: [anchor[0] - a.ax * zoom, anchor[1] - a.ay * zoom, ...logicalSize.map(n => n * zoom)]};
  }, point);
}

async function capture(browser, name, options) {
  const folder = path.join(output, name);
  await fs.mkdir(folder, {recursive: true});
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  const record = {profile: name, viewport: options.viewport, regions: [], errors};
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  try {
    await page.goto(new URL('/__visual?scene=tallyport', baseURL).href);
    await page.locator('body[data-ready=tallyport]').waitFor({timeout: 45000});
    const frame = page.frames().find(f => f.url().includes('visual_test=1'));
    assert.ok(frame);
    await frame.evaluate(() => Sound.setMu(false));
    const release = await page.request.get(new URL('/release.json', baseURL).href);
    assert.ok(release.ok());
    record.build = await release.json();

    for (let r = 1; r <= 8; r++) {
      const entry = {region: r, floors: []};
      record.regions.push(entry);
      const coords = await surface(frame, r);
      const surfaceFile = await saveView(page, frame, folder, 'r' + r + '-surface');
      entry.surface = {...coords, screenshot: surfaceFile, art: await paintedPortal(frame, coords)};

      const count = await frame.evaluate(r => Dungeons.get(r).floors.length, r);
      for (let level = 0; level < count; level++) {
        const data = await floor(frame, r, level, 'entrance');
        entry.floors.push(data);
        data.screenshot = await saveView(page, frame, folder, 'r' + r + '-f' + (level + 1) + '-ascent');
        data.entrance.art = await paintedPortal(frame, data.entrance);
        if (level === 0) {
          await floor(frame, r, level, 'display');
          data.displayScreenshot = await saveView(page, frame, folder, 'r' + r + '-display');
          await floor(frame, r, level, 'descent');
          data.descent.screenshot = await saveView(page, frame, folder, 'r' + r + '-descent');
          data.descent.art = await paintedPortal(frame, data.descent);
        }
      }
      await frame.evaluate(() => __bw.DP.exit());
      console.log(name + ' region ' + r + ' captured (' + count + ' floors)');
    }
    assert.equal(record.regions.flatMap(r => r.floors).length, 28);
    assert.deepEqual(errors, []);
  } catch(error) {
    record.failure = String(error.stack || error);
    await page.screenshot({path: path.join(folder, 'failure.png')});
    throw error;
  } finally {
    await fs.writeFile(path.join(folder, 'evidence.json'), JSON.stringify(record, null, 2) + '\n');
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch();
  try {
    const results = await Promise.allSettled(Object.entries(profiles).map(([name, options]) => capture(browser, name, options)));
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(result.reason);
        process.exitCode = 1;
      }
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
