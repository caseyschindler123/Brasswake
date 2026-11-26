/* Complete painted paper-doll heads. The atlas crop already includes face and hair. */
const HeadPortraits = ((assets) => {
  const STYLES = Object.freeze(assets.map(asset => Object.freeze(asset.styles.map(({ id, name, hair, beard }) =>
    Object.freeze({ id, name, hair, beard })))));
  const SKIN = [[1.03, 1.05, 1.08], [1, 1, 1], [.84, .81, .77], [.65, .58, .51], [.49, .41, .35]];
  const BROWN = ['#2e1c10', '#8f5e34'];
  const HAIR_GROUPS = [[-1], [0, 1, 4, 5, 9], [2, 6, 8], [3, 7, 10, 11]];
  const TINT_LIMIT = 24;
  const images = new Map();
  const painted = new Map();
  const styles = body => STYLES[body] || [];
  const group = id => HAIR_GROUPS.findIndex(ids => ids.includes(id));

  function match(body, hair = -1, beard = -1) {
    const choices = styles(body);
    if (!choices.length) return null;
    const hairPenalty = value => value === hair ? 0 : value < 0 || hair < 0 ? 8 : group(value) === group(hair) ? 2 : 5;
    const beardPenalty = value => value === beard ? 0 : value < 0 || beard < 0 ? 14 : 3;
    const distance = choice => hairPenalty(choice.hair) + beardPenalty(choice.beard);
    return choices.reduce((best, choice) => distance(choice) < distance(best) ? choice : best).id;
  }

  function record(body, style, hair, beard) {
    const options = assets[body]?.styles;
    if (!options) return null;
    const id = options.some(choice => choice.id === style) ? style : match(body, hair, beard);
    return options.find(choice => choice.id === id);
  }

  function preload(body) {
    if (!assets[body] || typeof Image === 'undefined') return Promise.resolve(false);
    if (images.has(body)) return images.get(body).promise;
    const image = new Image();
    const entry = { image, ready: false, promise: null };
    entry.promise = new Promise(resolve => {
      image.onload = () => { entry.ready = !!image.naturalWidth; resolve(entry.ready); };
      image.onerror = () => { images.delete(body); resolve(false); };
    });
    images.set(body, entry);
    image.src = 'art/' + assets[body].atlas;
    return entry.promise;
  }

  const ready = body => Boolean(images.get(body)?.ready);
  const unit = n => Math.max(0, Math.min(1, n));
  const smooth = (n, low, high) => {
    const t = unit((n - low) / (high - low));
    return t * t * (3 - 2 * t);
  };
  const rgb = value => [1, 3, 5].map(at => parseInt(value.slice(at, at + 2), 16));
  const hairPair = colors => Array.isArray(colors) && colors.length === 2 && colors.every(v => /^#[0-9a-f]{6}$/i.test(v)) ? colors : BROWN;

  function facialHair(id, x, y) {
    if (id === 2) return x < .22 && y > .86 && y < 1.36;
    if (id === 3) return x < .25 && y > .80 && y < 1.01;
    if (id < 0) return false;
    return x < .46 && y > .84 && y < (id === 1 ? 1.65 : 1.25) && (y > .97 || x < .23);
  }

  function tintPixels(pixels, style, tone = 1, colors) {
    const [left, top, width] = style.rect;
    const [center, skull, faceWidth, heightUnit] = style.anchor;
    const skin = SKIN[tone] || SKIN[1];
    colors = hairPair(colors);
    const originalBrown = colors[0] === BROWN[0] && colors[1] === BROWN[1];
    const [low, high] = colors.map(rgb);
    const sideHair = [2, 6, 8, 11].includes(style.hair);
    const rightTail = style.hair === 3 || style.hair === 7;
    for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
      const a = pixels[i + 3];
      if (!a) continue;
      const signedX = (left + p % width - center) / faceWidth;
      const x = Math.abs(signedX);
      const y = (top + Math.floor(p / width) - skull) / heightUnit;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const scalp = style.hair >= 0 && (y < .34 || (y < .6 && x > .33));
      const fringe = (sideHair && x > .35 && y > .4) || (rightTail && signedX > .42 && y > .8);
      const beard = facialHair(style.beard, x, y);
      const hair = (scalp || fringe || beard) ? 1 - smooth(r, 142, 195) : 0;
      const warm = smooth(r, 73, 117) * smooth(r - g, 12, 29);
      const skinWeight = warm * (1 - hair) * (1 - smooth(x, .46, .56));
      const shade = unit(((r * .2126 + g * .7152 + b * .0722) - 25) / 147);
      const original = [r, g, b];
      for (let c = 0; c < 3; c++) {
        const source = original[c];
        const calibration = c === 2 ? .91 : .95;
        const skinTint = source * (1 - skinWeight + skinWeight * skin[c] * calibration);
        const hairTint = low[c] + (high[c] - low[c]) * shade;
        const amount = originalBrown ? 0 : hair * .94;
        pixels[i + c] = skinTint * (1 - amount) + hairTint * amount;
      }
      /* Feather only exposed lower-neck skin into the underlying painted body. */
      pixels[i + 3] = a * (1 - skinWeight * smooth(y, 1.18, 1.40));
    }
    return pixels;
  }

  function geometry(body, style, anchor, hair, beard) {
    const entry = record(body, style, hair, beard);
    if (!entry || !Array.isArray(anchor) || !anchor.every(Number.isFinite) || anchor.length !== 3 || anchor[2] <= 0) return null;
    const [top, center, width] = anchor;
    const [x, y, w, h] = entry.rect;
    const [sourceCenter, sourceTop, faceWidth, heightUnit] = entry.anchor;
    const sx = width / faceWidth, sy = width / heightUnit;
    return [center + (x - sourceCenter) * sx, top + (y - sourceTop) * sy, w * sx, h * sy];
  }

  function paintedHead(body, entry, tone, colors) {
    const pair = hairPair(colors);
    const key = [body, entry.id, tone, ...pair].join('|');
    if (painted.has(key)) {
      const existing = painted.get(key);
      painted.delete(key);
      painted.set(key, existing);
      return existing;
    }
    const [x, y, width, height] = entry.rect;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(images.get(body).image, x, y, width, height, 0, 0, width, height);
    const image = ctx.getImageData(0, 0, width, height);
    tintPixels(image.data, entry, tone, pair);
    ctx.putImageData(image, 0, 0);
    painted.set(key, canvas);
    if (painted.size > TINT_LIMIT) painted.delete(painted.keys().next().value);
    return canvas;
  }

  function draw(ctx, { body, style, hair, beard, skin = 1, hc } = {}, anchor) {
    const entry = record(body, style, hair, beard);
    const dest = geometry(body, style, anchor, hair, beard);
    if (!entry || !dest || !ready(body)) return false;
    ctx.drawImage(paintedHead(body, entry, skin, hc), ...dest);
    return true;
  }

  return Object.freeze({ STYLES, styles, match, preload, ready, draw, geometry, tintPixels });
})(typeof ArtHeads !== 'undefined' ? ArtHeads : typeof module !== 'undefined' ? require('./artheads') : []);
if (typeof module !== 'undefined' && module.exports) module.exports = HeadPortraits;
