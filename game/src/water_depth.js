/* Piers and quay walls do not turn a working harbour into a shallow beach. */
const WaterDepth = (() => {
  function shallows(map) {
    const { w, h, t } = map, near = new Uint8Array(w * h);
    const natural = i => (t[i] < 2 || t[i] === 5 || t[i] === 9) && !(map.surface && map.surface[i]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!natural(i) || !((x && t[i - 1] === 4) || (x + 1 < w && t[i + 1] === 4) ||
          (y && t[i - w] === 4) || (y + 1 < h && t[i + w] === 4))) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && t[yy * w + xx] === 4) near[yy * w + xx] = 1;
      }
    }
    return near;
  }
  return { shallows };
})();
if (typeof module !== 'undefined') module.exports = WaterDepth;
