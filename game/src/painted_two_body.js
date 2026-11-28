/* Resolves the two painted locomotion fittings and their anatomical attachments. */
const PaintedTwoBody = (() => {
  const outfits = ['tunic', 'robe', 'leather', 'mail', 'plate'];
  const yaw = {S: 0, SE: 45, E: 90, NE: 135, N: 180, NW: -135, W: -90, SW: -45};
  const pitches = {
    walk: [5, -5, -14, -9, 8, 23, 30, 23],
    run: [-42, -81, -91, -68, -29, -16, -20, -27],
  };
  const resolved = new WeakMap();
  const paperFits = new WeakMap();
  const actionFits = new WeakMap();
  const native = ['S','SE','E','NE','N'];
  const opposite = {SW:'SE',W:'E',NW:'NE'};
  const heads = ['m-curly', 'f-ponytail'];

  function supports(appearance) {
    return !appearance.build && !appearance.keepPaintedIdentity &&
      !appearance.gear?.head && !(appearance.hat >= 0) &&
      (!appearance.headStyle || appearance.headStyle === heads[appearance.combo > 5 ? 1 : 0]);
  }

  function phase(delays, progress) {
    const duration = delays.reduce((total, ms) => total + ms, 0);
    let now = progress * duration;
    for (let i = 0; i < delays.length - 1; i++) {
      if (now < delays[i]) return i;
      now -= delays[i];
    }
    return delays.length - 1;
  }

  function outfit(appearance) {
    if (appearance.armorGear === 'armor-knights-plate') return 'knight';
    return outfits[(appearance.combo - 1) % outfits.length];
  }

  function carry(state, heading, index, plated) {
    const direction = yaw[heading] * Math.PI / 180;
    const dx = Math.sin(direction), dz = Math.cos(direction);
    const clearance = plated && state === 'run'
      ? Math.max(0, -dx) * [8, 0, 0, 0, 12, 32, 36, 26][index]
      : 0;
    const pitch = (pitches[state][index] + clearance) * Math.PI / 180;
    const forward = Math.cos(pitch), outward = .26, down = Math.sin(pitch);
    const norm = Math.hypot(1, outward);
    const x = (dx * forward - dz * outward) / norm;
    const y = (.574 * (dz * forward + dx * outward) + .819 * down) / norm;
    return {angle: Math.atan2(x, -y), length: Math.hypot(x, y), width: .72 + .28 * Math.abs(dx)};
  }

  function newFrame(art, raw, mirror, family, state, heading, index, legacy) {
    const {scale, cell, ground, origin} = art;
    const x = value => origin[0] + (value - cell / 2) * scale * (mirror ? -1 : 1);
    const y = value => origin[1] + (value - ground) * scale;
    const head = [y(raw.crown[1]), x(raw.crown[0]), legacy.head[2]];
    const torso = {p: [head[1], head[0] + 16], axis: [0, -1, 0], depth: 0};
    const hands = raw.palms.map(([px, py, visible]) => {
      const p = [x(px), y(py)];
      return {
        p,
        visible,
        axis: [0, 1, 0],
        depth: -(p[1] - torso.p[1]) / 48 * .6427876097 / .7660444431 + (visible ? .3 : -.3),
      };
    });
    const [right, left] = mirror ? hands.toReversed() : hands;
    if (heading === 'W' || heading === 'NW' || heading === 'SW' && [0, 4, 5, 6, 7].includes(index) ||
        heading === 'N' && index <= 4) right.depth -= 1;
    const sockets = {
      ...legacy.sockets, torso,
      collar: {...legacy.sockets.collar, p: [head[1], head[0] + 11]},
      waist: {...legacy.sockets.waist, p: [head[1], head[0] + 25]},
      rightPalm: right, leftPalm: left,
      rightForearm: {...right, p: [right.p[0], right.p[1] - 4]},
      leftForearm: {...left, p: [left.p[0], left.p[1] - 4]},
    };
    const offset = mirror ? [origin[0] * 2 - raw.offset[0] - raw.r[2], raw.offset[1]] : raw.offset;
    return {
      ...legacy, file: raw.file, r: raw.r, m: raw.m, offset, head, origin, sockets, mirror,
      embeddedHead: true, carry: pitches[state] ? carry(state, heading, index, ['plate', 'knight'].includes(family)) : null,
    };
  }

  function indexFor(art, state, progress) {
    return pitches[state]&&art ? phase(art.delays[state],progress) : 0;
  }

  function motion(art, appearance, state, direction, index, legacy) {
    if (!art) return null;
    const family = outfit(appearance), heading = art.heading[direction];
    const actor = appearance.combo > 5 ? 'woman' : 'man';
    let source, mirror, raw;
    if (pitches[state]) {
      [source, mirror] = art.frames[actor + '/' + state + '/' + heading][index];
      raw = art.banks[family]?.[source];
    } else {
      mirror = !!opposite[heading];
      source = (actor === 'woman' ? 64 : 0) + native.indexOf(opposite[heading] || heading);
      raw = art.static?.[family]?.[state]?.[source];
    }
    if (!raw) return null;
    let cache = resolved.get(legacy);
    if (!cache) { cache = new Map(); resolved.set(legacy, cache); }
    const key = [family, state, source, heading, index].join('/');
    if (!cache.has(key)) cache.set(key, newFrame(art, raw, mirror, family, state, heading, index, legacy));
    return cache.get(key);
  }

  function doll(art, appearance, legacy) {
    const raw = art?.dolls?.[outfit(appearance)]?.[appearance.combo > 5 ? 1 : 0];
    if (!raw || !legacy) return null;
    if (paperFits.has(raw)) return paperFits.get(raw);
    const [x, top] = raw.crown;
    const old = legacy.sockets;
    const [right, left] = raw.palms.map(([pX, pY]) => [pX, pY]);
    const head = [top, x, legacy.head[2]];
    const sockets = {
      ...old,
      head: {...old.head, p: [x, top]},
      collar: {...old.collar, p: [x, top + raw.height * .17]},
      torso: {...old.torso, p: [x, top + raw.height * .25]},
      waist: {...old.waist, p: [x, top + raw.height * .39]},
      rightPalm: {...old.rightPalm, p: right},
      leftPalm: {...old.leftPalm, p: left},
      leftForearm: {...old.leftForearm, p: [left[0], left[1] - raw.height * .11]},
    };
    const fitted = {...legacy, ...raw, embeddedHead:true, head, sockets};
    paperFits.set(raw, fitted);
    return fitted;
  }

  function actionHead(art, appearance, direction) {
    if (!art) return null;
    const heading=art.heading[direction], mirror=Boolean(opposite[heading]);
    const source=(appearance.combo > 5 ? 64 : 0)+native.indexOf(opposite[heading]||heading);
    const frame=art.actionHeads?.[source];
    if (!frame) return null;
    let fits=actionFits.get(frame);
    if (!fits) {
      const [x,y]=frame.crown;
      const left=frame.offset[0]-art.origin[0]-(x-art.cell/2)*art.scale;
      const top=frame.offset[1]-art.origin[1]-(y-art.ground)*art.scale;
      fits=[{...frame,headOffset:[left,top]}, {...frame,mirror:true,headOffset:[-left-frame.r[2],top]}];
      actionFits.set(frame,fits);
    }
    return fits[Number(mirror)];
  }

  return {motion,indexFor,doll,supports,actionHead,headStyle:body=>heads[body]};
})();
if (typeof module !== 'undefined') module.exports = PaintedTwoBody;
