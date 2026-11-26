/* Material finishes for the painted equipment layers. */
const EquipmentView = (() => {
  const unit = value => Math.max(0, Math.min(1, value));
  const transition = (value, low, high) => unit((value - low) / (high - low));
  const validHex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  const rgb = hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
  const luma = (r, g, b) => .2126 * r + .7152 * g + .0722 * b;
  const stops = [0, 48, 128, 205, 255];
  const cache = new Map();

  function toneRamp(palette) {
    if (!palette || ![palette.shadow, palette.mid, palette.light].every(validHex)) return null;
    const key = [palette.shadow, palette.mid, palette.light].join('|');
    if (cache.has(key)) return cache.get(key);
    const colors = [[0, 0, 0], rgb(palette.shadow), rgb(palette.mid), rgb(palette.light), [255, 255, 255]];
    const ramp = Array.from({ length: 256 }, (_, light) => {
      const segment = stops.findIndex((stop, i) => i > 0 && light <= stop) - 1;
      const weight = transition(light, stops[segment], stops[segment + 1]);
      return colors[segment].map((value, channel) => value * (1 - weight) + colors[segment + 1][channel] * weight);
    });
    if (cache.size >= 32) cache.delete(cache.keys().next().value);
    cache.set(key, ramp);
    return ramp;
  }

  function surface(r, g, b, light, family, protectSkin) {
    const max = Math.max(r, g, b);
    const saturation = max ? (max - Math.min(r, g, b)) / max : 0;
    const warm = r - g >= 19 && g - b >= 10;
    if (protectSkin && warm) return 0;
    const neutral = 1 - transition(saturation, .12, .31);
    if (family === 'metal') return 1 - transition(saturation, .095, .24);
    if (family === 'cloth') return neutral * transition(light, 32, 62);
    if (family === 'glass' || family === 'crystal') return Math.max(neutral, transition(b - r, 2, 26));
    const brown = transition(r - b, 8, 26) * transition(g - b, 2, 12) * (1 - transition(saturation, .78, .98));
    return Math.max(brown, neutral);
  }

  /* Mask callbacks receive the pixel coordinate and may return a weight from zero to one. */
  function tintPixels(pixels, palette, family = 'metal', options = {}) {
    const ramp = toneRamp(palette);
    if (!ramp) return pixels;
    const { width = pixels.length / 4, bounds, exclude = [], mask, strength = .92,
      protectSkin = family === 'metal' || family === 'cloth' } = options;
    const inside = (x, y, [left, top, w, h]) => x >= left && y >= top && x < left + w && y < top + h;
    for (let p = 0, i = 0; i + 3 < pixels.length; p++, i += 4) {
      if (pixels[i + 3] < 8) continue;
      const x = p % width;
      const y = Math.floor(p / width);
      if ((bounds && !inside(x, y, bounds)) || exclude.some(box => inside(x, y, box))) continue;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const light = Math.round(luma(r, g, b));
      const region = typeof mask === 'function' ? unit(Number(mask(x, y, p)) || 0) : mask ? (mask[p] || 0) / 255 : 1;
      const highlight = 1 - .72 * transition(light, 219, 251);
      const weight = surface(r, g, b, light, family, protectSkin) * region * unit(strength) * highlight;
      if (!weight) continue;
      const mapped = ramp[light];
      for (let c = 0; c < 3; c++) pixels[i + c] += (mapped[c] - pixels[i + c]) * weight;
    }
    return pixels;
  }

  function tintCanvas(source, palette, family = 'metal', options = {}) {
    const [x, y, w, h] = options.area || [0, 0, source.naturalWidth || source.width, source.naturalHeight || source.height];
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    if (!canvas.width || !canvas.height) return canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
    if (toneRamp(palette)) {
      const pixels = ctx.getImageData(0, 0, w, h);
      tintPixels(pixels.data, palette, family, { ...options, width: w });
      ctx.putImageData(pixels, 0, 0);
    }
    return canvas;
  }

  return Object.freeze({ tintPixels, tintCanvas });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = EquipmentView;
