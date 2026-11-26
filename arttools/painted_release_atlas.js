/* Lossless semantic-mask packing and world/doll handoff metadata. */
const PaintedReleaseAtlas = (() => {
  const R = PaintedReleaseRender;
  const DIRECTIONS = [0, 7, 6, 5, 4, 3, 2, 1];
  const STATES = [
    'idle', 'walk', 'run', 'sit', 'swing', 'swingtwo', 'thrust', 'thrusttwo',
    'bow', 'crossbow', 'cast', 'book', 'block', 'hit', 'fall',
  ];
  const ACTION_FRAMES = 12, GAIT_FRAMES = 24;
  const width = 128, height = 160;

  function target(w, h) {
    return {gpu: R.targets(w, h), colors: new Uint8Array(w * h * 4), masks: new Uint8Array(w * h * 4), w, h};
  }

  function canvas(width, height) {
    const value = document.createElement('canvas');
    value.width = width;
    value.height = height;
    return value.getContext('2d');
  }

  function render(appearance, view, buffer, crop) {
    const {gpu, colors, masks, w, h} = buffer;
    R.render(appearance, view, gpu, colors, masks);
    let left = 0, top = 0, right = w, bottom = h;
    if (crop) {
      left = w; top = h; right = bottom = 0;
      for (let y = 0; y < h; y++) {
        const row = (h - 1 - y) * w * 4;
        for (let x = 0; x < w; x++) {
          if (!colors[row + x * 4 + 3]) continue;
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
        }
      }
      if (right <= left || bottom <= top) throw Error('Empty ' + crop);
      if (left < 1 || top < 1 || right >= w || bottom >= h) throw Error('Clipped ' + crop + ' ' + [left, top, right, bottom]);
      left--; top--; right++; bottom++;
    }

    const copy = pixels => {
      const result = new ImageData(right - left, bottom - top);
      const rowBytes = (right - left) * 4;
      for (let y = top; y < bottom; y++) {
        const start = ((h - 1 - y) * w + left) * 4;
        result.data.set(pixels.subarray(start, start + rowBytes), (y - top) * rowBytes);
      }
      return result;
    };
    return {color: copy(colors), mask: copy(masks), base: [left, top]};
  }

  function bank(rows) {
    const images = rows.flat(), atlasWidth = images.length > 16 ? 1024 : 512;
    let x = 1, y = 1, row = 0;
    for (const image of images) {
      const {width, height} = image.color;
      if (x + width >= atlasWidth) {
        x = 1;
        y += row + 2;
        row = 0;
      }
      image.entry.r = [x, y, width, height];
      x += width + 2;
      row = Math.max(row, height);
    }
    const atlasHeight = y + row + 1, sheet = canvas(atlasWidth, atlasHeight * 2);
    for (const image of images) {
      const [X, Y, width, height] = image.entry.r;
      image.entry.m = [X, Y + atlasHeight, width, height];
      sheet.putImageData(image.color, X, Y);
      sheet.putImageData(image.mask, X, Y + atlasHeight);
    }
    return {sheet, frames: rows.map(row => row.map(image => image.entry))};
  }

  async function save(section, name, sheet) {
    const png = await new Promise(resolve => sheet.canvas.toBlob(resolve, 'image/png'));
    if (!png) throw Error('Canvas returned no PNG for ' + name);
    const response = await fetch('/save/' + section + '/' + name, {method: 'POST', body: png});
    if (!response.ok) throw Error('Could not save ' + name + ': ' + await response.text());
    return {width: sheet.canvas.width, height: sheet.canvas.height};
  }

  async function doll(appearance, key) {
    const frame = R.pose(appearance.profile, 'idle', 0);
    R.apply(appearance, frame);
    const buffer = target(300, 450), view = R.camera('paper', 0, buffer.w, buffer.h);
    try {
      const image = render(appearance, view, buffer);
      const sheet = canvas(300, 900);
      sheet.putImageData(image.color, 0, 0);
      sheet.putImageData(image.mask, 0, 450);
      const name = 'doll-' + key;
      const metadata = PaintedReleaseGeometry.measure(appearance.profile.model, frame.pose, frame.body, view.project);
      const {head, hands, sockets} = metadata;
      await save('png', name, sheet);
      return {file: 'painted-release/' + name + '.webp', head, hands: [hands.slice(2), hands.slice(0, 2)], sockets};
    } finally {
      buffer.gpu.dispose();
    }
  }

  async function guide(appearance, key, name = 'fit-') {
    const frame = R.pose(appearance.profile, 'idle', 0);
    R.apply(appearance, frame);
    const buffer = target(512, 1024), sheet = canvas(1536, 1024), mask = canvas(1536, 1024);
    try {
      for (const [i, direction] of [0, 6, 4].entries()) {
        const view = R.camera('guide', direction, buffer.w, buffer.h);
        const image = render(appearance, view, buffer);
        sheet.putImageData(image.color, i * buffer.w, 0);
        mask.putImageData(image.mask, i * buffer.w, 0);
      }
      await save('guides', name + key + '-mask', mask);
      return await save('guides', name + key, sheet);
    } finally {
      buffer.gpu.dispose();
    }
  }

  async function bake(profile, options) {
    const {
      outfits, states = STATES, onlyGuides = false, withGuides = false,
      pilot = false, fullHead = false, slot, archetype, withSlots = false, partsOnly = false, slotGroup, omitDolls = false,
    } = options;
    const appearances = [], combos = {}, slots = {};
    const {sex, build} = profile.model, profileNumber = sex * 3 + build;
    const wardrobe = typeof PaintedReleaseWardrobe === 'undefined' ? null : PaintedReleaseWardrobe;
    const entries = slot ? [{slot, archetype, outfit: outfits[0]}] : partsOnly ? [] : outfits.map(outfit => ({outfit}));
    if (withSlots) {
      if (!wardrobe?.slotCatalog) throw Error('Missing fitted wardrobe slot catalog');
      for (const [slot, keys] of Object.entries(wardrobe.slotCatalog)) {
        if (slotGroup && slot !== slotGroup) continue;
        for (const archetype of keys) entries.push({slot, archetype, outfit: slot === 'cloak' || slot === 'armor' ? 4 : 0});
      }
    }
    const buffer = target(width, height);
    const views = DIRECTIONS.map(direction => R.camera('world', direction, width, height));
    try {
      for (const entry of entries) {
        const id = sex * 15 + build * 5 + entry.outfit + 1;
        const key = entry.slot ? [profileNumber, entry.slot, entry.archetype].join('-') : String(id);
        if (withGuides || onlyGuides) {
          const clay = await R.look(profile, entry.outfit, {guide: true, ...entry, pilot});
          try { await guide(clay, key, pilot ? 'base-' : 'fit-'); } finally { R.release(clay); }
        }
        if (onlyGuides) continue;
        const appearance = await R.look(profile, entry.outfit, {...entry, pilot, fullHead});
        const record = {sex, build, outfit: entry.outfit, states: {}};
        if (!omitDolls) record.doll = await doll(appearance, key);
        appearances.push({appearance, key, record});
        if (entry.slot) {
          slots[entry.slot] ||= {};
          slots[entry.slot][entry.archetype] = record;
        } else combos[key] = record;
      }
      for (const state of onlyGuides ? [] : states) {
        const gait = state === 'walk' || state === 'run';
        const count = gait ? GAIT_FRAMES : state === 'idle' || state === 'sit' ? 1 : ACTION_FRAMES;
        const all = appearances.map(() => DIRECTIONS.map(() => []));
        for (let i = 0; i < count; i++) {
          const phase = count <= 1 ? 0 : i / (gait ? count : count - 1);
          const posed = R.pose(profile, state, phase, !pilot);
          const landmarks = views.map(view => ({
            ...PaintedReleaseGeometry.measure(profile.model, posed.pose, posed.body, view.project),
            origin: view.origin,
          }));
          for (let a = 0; a < appearances.length; a++) {
            const {appearance, key} = appearances[a];
            R.apply(appearance, posed);
            for (let v = 0; v < views.length; v++) {
              const view = views[v], label = [key, state, i, v].join('/');
              const image = render(appearance, view, buffer, label);
              const offset = image.base.map((n, j) => n + view.offset[j]);
              image.entry = {...landmarks[v], offset};
              all[a][v].push(image);
            }
          }
        }
        for (const [i, {key, record}] of appearances.entries()) {
          const {sheet, frames} = bank(all[i]), name = 'body-' + key + '-' + state;
          try {
            await save('png', name, sheet);
            record.states[state] = {file: 'painted-release/' + name + '.webp', frames};
          } finally {
            sheet.canvas.width = sheet.canvas.height = 0;
          }
        }
        console.log('Baked ' + state + ' · ' + appearances.map(({key}) => key).join(', '));
      }
    } finally {
      buffer.gpu.dispose();
      for (const {appearance} of appearances) R.release(appearance);
    }
    const world = R.camera('world', 0, width, height);
    const gaits = Object.fromEntries(['walk', 'run'].map(state => {
      const {pose} = R.pose(profile, state, 0);
      let previous = true;
      const rightLandings = [];
      for (let i = 0; i <= GAIT_FRAMES; i++) {
        const {pose: frame} = R.pose(profile, state, i / GAIT_FRAMES);
        const active = !!frame.targets.feet.r.active;
        if (active && !previous) rightLandings.push(i / GAIT_FRAMES);
        previous = active;
      }
      if (!rightLandings.length) throw Error('Could not measure ' + state + ' right-foot contact');
      return [state, {stride: pose.stride, cadence: pose.cadence, contacts: [0, rightLandings[0]]}];
    }));
    return {combos, slots, gaits, origin: world.origin, directions: DIRECTIONS.length, sourceDirections: DIRECTIONS,
      frames: GAIT_FRAMES, actions: ACTION_FRAMES};
  }

  return {bake, STATES};
})();
