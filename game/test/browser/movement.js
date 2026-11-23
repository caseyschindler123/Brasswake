/* Drive the actual thumb control along a prepared collision-checked fixture route. */
async function drivePath(frame, path, run = true) {
  for (let i = 0; i < path.length;) {
    const from = await frame.evaluate(() => Scene.pos());
    const dx = Math.sign(path[i][0] - from[0]), dy = Math.sign(path[i][1] - from[1]);
    if (!dx && !dy) { i++; continue; }
    let end = i;
    while (end + 1 < path.length && path[end + 1][0] - path[end][0] === dx && path[end + 1][1] - path[end][1] === dy) end++;
    const target = path[end];
    const base = frame.locator('.movement-joystick');
    const box = await base.boundingBox();
    if (!box) throw Error('Movement joystick is not visible');
    if (await base.getAttribute('aria-disabled') === 'true') return;
    const page = typeof frame.page === 'function' ? frame.page() : frame;
    const mouse = page.mouse, x = box.x + box.width / 2, y = box.y + box.height / 2;
    const distance = box.width / 2 * (run ? .84 : .38);
    await mouse.move(x, y);
    await mouse.down();
    try {
      await mouse.move(x + dx * distance, y + dy * distance);
      const deadline = Date.now() + (end - i + 2) * (run ? 600 : 900) + 1200;
      let last = from.join(','), progressed = Date.now(), reached = false;
      while (Date.now() < deadline) {
        await frame.waitForTimeout(40);
        const status = await frame.evaluate(() => ({ at: Scene.pos(), interrupted: !!(__bw.F || __bw.SB || __bw.Q) }));
        const [px, py] = status.at;
        if ((dx ? (px - target[0]) * dx >= 0 : px === target[0]) && (dy ? (py - target[1]) * dy >= 0 : py === target[1])) { reached = true; break; }
        if (status.interrupted) return;
        const position = status.at.join(',');
        if (position !== last) { last = position; progressed = Date.now(); }
        else if (Date.now() - progressed > 1000) return;
      }
      if (!reached) return;
    } finally { await mouse.up(); }
    i = end + 1;
  }
}
module.exports = { drivePath };
