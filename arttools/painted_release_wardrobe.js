/* Offline fitted wardrobe. All contours and anchors derive from the actor mesh. */
const PaintedReleaseWardrobe = (() => {
  const TAU = Math.PI * 2;
  const surface = Object.freeze({ cloth: 1, leather: 2, metal: 3, skin: 4, pants: 5, boots: 6, fixed: 7 });
  const component = Object.freeze({ hand: 8, foot: 9, cloak: 10, plateTrim: 11 });
  const textures = Object.freeze({
    tunic: 'linen', robe: 'linen-folds', leather: 'leather-jerkin', mail: 'mail', pants: 'cloth-trousers',
    arming: 'arming', belt: 'belt-leather', trim: 'trim-brass', gloves: 'glove-leather', thief: 'glove-thief',
    gauntlet: 'gauntlet-steel', boots: 'boot-leather', riding: 'boot-riding', sabaton: 'sabaton-steel',
    wool: 'cloak-wool', travelling: 'cloak-travelling', silk: 'cloak-silk', royal: 'cloak-royal',
  });
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const plus = (a, b) => a.map((x, i) => x + b[i]);
  const sub = (a, b) => a.map((x, i) => x - b[i]);
  const scale = (v, s) => v.map(x => x * s);
  const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
  const unit = v => scale(v, 1 / (Math.hypot(...v) || 1));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const xyz = (buffer, i) => Array.from(buffer.slice(i * 3, i * 3 + 3));
  const apply = (m, p) => [0, 1, 2].map(i => dot(m.slice(i * 4, i * 4 + 3), p) + m[i * 4 + 3]);

  function empty(body) {
    return { bones: body.bones, vertices: [], normals: [], skin: [], triangles: [], materials: [], partLabels: [], bindings: [], uv: [] };
  }

  function actor(scene) {
    const body = scene.body;
    const bones = Object.fromEntries(body.bones.map((b, i) => [b.name, { ...b, i }]));
    const arm = [bones.upperArmL, bones.upperArmR];
    const legs = [bones.thighL, bones.thighR];
    const hip = bones.pelvis.start[1];
    const knee = (bones.shinL.start[1] + bones.shinR.start[1]) / 2;
    const ankle = (bones.footL.start[1] + bones.footR.start[1]) / 2;
    const waist = mix(hip, bones.abdomen.start[1], .65);
    const samples = [];
    for (let i = 0; i < body.materials.length; i++) {
      const part = scene.parts[i];
      const p = xyz(body.vertices, i);
      const weights = [];
      for (let k = 0; k < 4; k++) if (body.skin[i * 8 + k * 2 + 1] > 0) weights.push(body.skin.slice(i * 8 + k * 2, i * 8 + k * 2 + 2));
      const dominant = body.bones[weights.reduce((a, b) => a[1] > b[1] ? a : b)[0]].name;
      samples.push({ p, n: xyz(body.normals, i), weights, source: [[i, 1]], part, dominant });
    }
    return { scene, body, bones, arm, legs, hip, knee, ankle, waist, samples };
  }

  function interpolate(a, b, t) {
    const weights = new Map(), source = new Map();
    for (const [input, factor] of [[a, 1 - t], [b, t]]) {
      for (const [i, w] of input.weights) weights.set(i, (weights.get(i) || 0) + w * factor);
      for (const [i, w] of input.source) source.set(i, (source.get(i) || 0) + w * factor);
    }
    return {
      p: a.p.map((v, i) => mix(v, b.p[i], t)), n: unit(a.n.map((v, i) => mix(v, b.n[i], t))),
      weights: [...weights], source: [...source], part: t < .5 ? a.part : b.part,
    };
  }

  function vertex(mesh, sample, p, n, id, uv) {
    const index = mesh.materials.length;
    mesh.vertices.push(...p);
    mesh.normals.push(...n);
    mesh.materials.push(id);
    mesh.partLabels.push(sample.part);
    mesh.bindings.push({ source: sample.source, delta: sub(p, sample.p) });
    mesh.uv.push(...uv);
    const weights = [...sample.weights].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = weights.reduce((total, [, w]) => total + w, 0);
    for (let k = 0; k < 4; k++) mesh.skin.push(weights[k]?.[0] || 0, (weights[k]?.[1] || 0) / sum);
    return index;
  }

  function cut(a, textureId, id, field, clearance, uv, comp = 0) {
    const mesh = empty(a.body), values = a.samples.map(field);
    for (let i = 0; i < a.body.triangles.length; i += 3) {
      const triangle = a.body.triangles.slice(i, i + 3), poly = [];
      for (let k = 0; k < 3; k++) {
        const p = triangle[k], q = triangle[(k + 1) % 3], v = a.samples[p], next = a.samples[q], x = values[p], y = values[q];
        if (x >= 0) poly.push(v);
        if ((x >= 0) !== (y >= 0)) poly.push(interpolate(v, next, x / (x - y)));
      }
      if (poly.length < 3) continue;
      const ix = poly.map(v => vertex(mesh, v, plus(v.p, scale(v.n, typeof clearance === 'function' ? clearance(v) : clearance)), v.n, id, uv(v)));
      for (let k = 1; k + 1 < ix.length; k++) mesh.triangles.push(ix[0], ix[k], ix[k + 1]);
    }
    return layer(mesh, textureId, comp);
  }

  function layer(mesh, textureId, comp = 0, pose = null) {
    const result = { mesh, materialIds: mesh.materials, componentIds: mesh.materials.map(() => comp), textureId };
    if (pose) result.pose = pose;
    return result;
  }

  function toBone(p, bone) {
    const axis = sub(bone.end, bone.start);
    return dot(sub(p, bone.start), axis) / dot(axis, axis);
  }

  function localTop(a, v, sleeve, neck) {
    const p = v.p, side = p[0] < 0 ? 'L' : 'R';
    const upper = a.bones['upperArm' + side], fore = a.bones['foreArm' + side];
    const shoulder = Math.abs(upper.start[0]);
    const sleeveProgress = sleeve < 1 ? toBone(p, upper) : 1 + toBone(p, fore);
    const outside = Math.abs(p[0]) - shoulder + .035;
    const collar = a.bones.neck.start[1] - neck - .022 * clamp((p[2] - a.bones.neck.start[2] + .025) / .085)
      + .045 * clamp((Math.abs(p[0]) - .045) / Math.max(.08, shoulder - .065));
    const torsoEnd = a.waist - mix(.052, .15, smoothStep(clamp((Math.abs(p[0]) - shoulder * .91) / .080)));
    return Math.min(p[1] - torsoEnd, collar - p[1], Math.max(-outside, (sleeve - sleeveProgress) * .17));
  }

  function bodyUV(a, v, low = a.knee, high = a.bones.neck.start[1], width = .50) {
    const [x, y, z] = v.p;
    const u = Math.abs(v.n[2]) > .55 ? .5 + x / width : .5 + z / width;
    return [.05 + .9 * clamp(u), .04 + .92 * clamp((y - low) / (high - low))];
  }

  function ankleField(a, v, fraction) {
    const [x, y] = v.p, shin = a.bones[x < 0 ? 'shinL' : 'shinR'];
    return mix(shin.end[1], shin.start[1], fraction) - y;
  }

  function torsoBounds(a, y) {
    const points = a.samples.filter(v => (v.part === 'torso' || v.part === 'legs') && Math.abs(v.p[1] - y) < .049).map(v => v.p);
    const width = Math.max(.11, ...points.map(p => Math.abs(p[0]))), back = Math.min(-.045, ...points.map(p => p[2])), front = Math.max(.05, ...points.map(p => p[2]));
    const z = (back + front) / 2, depth = (front - back) / 2;
    const extent = Math.max(1, ...points.map(p => Math.hypot(p[0] / width, (p[2] - z) / depth)));
    return { width: width * extent, back: z - depth * extent, front: z + depth * extent };
  }

  function matrixNormal(m, v) {
    return [0, 1, 2].map(i => dot(m.slice(i * 4, i * 4 + 3), v));
  }

  function grid(a, textureId, id, rows, columns, point, deform, comp = 0) {
    const mesh = empty(a.body), coordinates = [];
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) {
      const t = y / rows, u = x / columns, [p, n, bone] = point(t, u);
      const v = { p, n, part: comp === component.cloak ? 'cloak' : 'torso', source: [], weights: [[bone, 1]] };
      vertex(mesh, v, p, n, id, [u, 1 - t]);
      coordinates.push([t, u]);
      if (x && y) { const i = coordinates.length - 1, w = columns + 1; mesh.triangles.push(i - w - 1, i - 1, i, i - w - 1, i, i - w); }
    }
    delete mesh.bindings;
    return layer(mesh, textureId, comp, (matrices, bodyPose, options = {}) => {
      const positions = new Float32Array(mesh.vertices.length), normals = new Float32Array(mesh.vertices.length);
      const deformed = deform(matrices, bodyPose, options);
      for (let i = 0; i < coordinates.length; i++) {
        const [t, u] = coordinates[i], [p, n] = deformed(t, u, xyz(mesh.vertices, i), xyz(mesh.normals, i));
        positions.set(p, i * 3);
        normals.set(n, i * 3);
      }
      return { positions, normals };
    });
  }

  function skirt(a, family, material) {
    const { top, low, long } = skirtRange(a, family);
    const belt = torsoBounds(a, top);
    const cut = torsoBounds(a, a.hip - .015), lowerBody = a.samples.flatMap((v, i) =>
      (v.part === 'legs' || v.part === 'torso' && v.p[1] < top + .07) && v.p[1] > low - .12 ? [i] : []);
    function coordinates(t, u, bounds, ease = 0) {
      const theta = u * TAU + Math.PI, c = Math.cos(theta), s = Math.sin(theta);
      const fold = Math.sin(theta * 8 + t * 1.4) * (.002 + t * (long ? .011 : .005));
      const tuck = .032 * (1 - smoothStep(clamp(t * 4.8)));
      const front = (bounds.front - bounds.back) * .5, center = (bounds.front + bounds.back) * .5;
      const hem = .006 * t ** 2 * Math.cos(theta * 3);
      return [[(bounds.width + ease + fold - tuck) * s, mix(top, low, t) + hem,
        center + (front + ease + fold - tuck) * c], unit([s, .10 * t, c])];
    }
    const rest = t => ({ width: mix(belt.width, cut.width, clamp(t * 2)) + (long ? .108 : .038) * t,
      front: mix(belt.front, cut.front, clamp(t * 2)) + (long ? .060 : .023) * t,
      back: mix(belt.back, cut.back, clamp(t * 2)) - (long ? .055 : .019) * t });
    return grid(a, family === 'tunic' ? textures.robe : textures[family], material, long ? 16 : 8, 48,
      (t, u) => [...coordinates(t, u, rest(t), .015), a.bones.pelvis.i], (matrices, data, options) => {
        const pelvis = matrices[a.bones.pelvis.i], state = options.state || 'idle', phase = options.phase || 0;
        const thigh = [a.bones.thighL, a.bones.thighR], shins = [a.bones.shinL, a.bones.shinR];
        const knees = thigh.map(b => apply(matrices[b.i], b.end));
        const ankles = shins.map(b => apply(matrices[b.i], b.end));
        const seated = state === 'sit' || state === 'seated' || state === 'ride' || state === 'mounted';
        const floor = [0, 1].map(i => apply(matrices[thigh[i].i], thigh[i].start));
        const legAt = (t, i) => {
          const restY = mix(top, low, t), kneeRatio = (a.hip - restY) / (a.hip - a.knee);
          if (kneeRatio < 1) return floor[i].map((v, j) => mix(v, knees[i][j], clamp(kneeRatio)));
          return knees[i].map((v, j) => mix(v, ankles[i][j], clamp((a.knee - restY) / (a.knee - a.ankle))));
        };
        const sections = new Map(), stride = state === 'run' || state === 'walk';
        function section(t, centerY, nominal, radiusX, radiusZ) {
          if (sections.has(t)) return sections.get(t);
          const points = [];
          const allowance = long ? .027 : .033;
          // Measure one envelope across both legs. Independent thigh/skirt
          // skinning makes the leading knee emerge through the front panel.
          if (!seated && data?.positions) for (const i of lowerBody) {
            const at = i * 3, posed = data.positions;
            if (Math.abs(centerY - posed[at + 1]) < allowance) points.push([posed[at], posed[at + 2]]);
          }
          const center = [nominal[0], nominal[2]];
          if (points.length) for (let axis = 0; axis < 2; axis++) {
            const p = points.map(value => value[axis]);
            center[axis] = mix(center[axis], (Math.min(...p) + Math.max(...p)) / 2, .83);
          }
          const ease = long ? .018 : .025;
          const x = Math.max(radiusX, ...points.map(p => Math.abs(p[0] - center[0]) + ease));
          const z = Math.max(radiusZ, ...points.map(p => Math.abs(p[1] - center[1]) + ease));
          const multiplier = Math.max(1, ...points.map(p => Math.hypot((p[0] - center[0]) / x, (p[1] - center[1]) / z))) + .035;
          const result = {center, x: x * multiplier, z: z * multiplier};
          sections.set(t, result);
          return result;
        }
        return (t, u) => {
          const clear = .014, bounds = rest(t), [p, n] = coordinates(t, u, bounds, clear);
          const origin = apply(pelvis, [0, p[1], 0]);
          const relative = [p[0], 0, p[2]], fixed = plus(origin, matrixNormal(pelvis, relative));
          const legs = [legAt(t, 0), legAt(t, 1)], reach = clamp(t * (long ? 8 : 4.5));
          const theta = u * TAU + Math.PI, wave = Math.sin(theta * 2 - phase * TAU);
          const center = legs[0].map((v, i) => (v + legs[1][i]) * .5);
          const xExtent = Math.abs(legs[0][0] - legs[1][0]) / 2 + .068;
          const zExtent = Math.abs(legs[0][2] - legs[1][2]) / 2 + .070;
          const loose = (state === 'run' ? .016 : .006) * reach ** 2;
          const flow = (state === 'run' ? -.039 : state === 'walk' ? -.014 : 0) * reach ** 2;
          const plainY = apply(pelvis, [0, mix(top, low, t), 0])[1];
          const fitted = section(t, plainY, center, Math.max(xExtent, bounds.width), Math.max(zExtent, (bounds.front - bounds.back) / 2));
          const back = Math.max(0, -Math.cos(theta));
          const draped = [fitted.center[0] + Math.sin(theta) * (fitted.x + loose * wave),
            seated ? mix(origin[1], center[1] + .069, clamp(t * 1.58)) - (long ? .155 * t ** 3 : 0) : origin[1] + (stride ? .008 * wave * reach ** 2 : 0),
            fitted.center[1] + Math.cos(theta) * (fitted.z + loose * wave) + flow * back];
          const weight = smoothStep(reach);
          return [fixed.map((value, i) => mix(value, draped[i], weight)), unit(matrixNormal(pelvis, n))];
        };
      });
  }

  const smoothStep = x => x * x * (3 - 2 * x);

  function skirtRange(a, family) {
    const long = family === 'robe';
    return { top: a.waist + .011, low: long ? mix(a.ankle, a.knee, .25) : mix(a.knee, a.hip, family === 'leather' ? .61 : .48), long };
  }

  function baseLayer(a, plate, skirt) {
    const ids = a.scene.semantic.map((id, i) => {
      const { part, p } = a.samples[i];
      if (part === 'boots' && p[1] < a.ankle + .175) return surface.boots;
      if (part === 'head') return id;
      if (plate && part !== 'hands' && p[1] < a.bones.neck.start[1] - .052) return surface.cloth;
      return surface.skin;
    });
    let mesh = a.body;
    if (skirt) {
      const { top, low, long } = skirt;
      // Body surfaces deep inside the closed garment cannot be seen. Keep a
      // complete allowance at the hem, where ankle and knee surfaces emerge.
      const hidden = a.samples.map(({ part, p }) => (part === 'legs' || part === 'torso') && p[1] > low + (long ? .086 : .025) && p[1] < top - .062);
      mesh = { ...mesh, triangles: mesh.triangles.filter((_, i, all) => {
        const start = i - i % 3;
        return !(hidden[all[start]] && hidden[all[start + 1]] && hidden[all[start + 2]]);
      }) };
    }
    return { mesh, materialIds: ids, parts: a.scene.parts, cutHead: true,
      componentIds: a.samples.map(({ part }) => part === 'boots' ? component.foot : part === 'hands' ? component.hand : 0), textureId: 'body' };
  }

  function fit(scene) {
    const a = actor(scene), family = ['tunic', 'robe', 'leather', 'mail', 'plate'][scene.outfit];
    if (!family) throw Error('Unknown fitted outfit ' + scene.outfit);
    const plate = family === 'plate', range = plate ? null : skirtRange(a, family), layers = [baseLayer(a, plate, range)];
    const tex = v => bodyUV(a, v);
    const leggings = v => Math.min((range ? range.low + (range.long ? .115 : .071) : a.waist + .018) - v.p[1],
      -ankleField(a, v, .22), .31 - Math.abs(v.p[0]));
    layers.push(cut(a, plate ? textures.arming : textures.pants, surface.pants, leggings, .009, tex));
    const length = { tunic: .82, robe: 1.82, leather: 1.62, mail: 1.55, plate: 1.98 }[family];
    const neckline = { tunic: .045, robe: .021, leather: .039, mail: .048, plate: .041 }[family]
      - (scene.sex === 1 ? .024 : 0);
    const shirt = v => localTop(a, v, length, neckline);
    const material = family === 'leather' ? surface.leather : family === 'mail' ? surface.metal : surface.cloth;
    layers.push(cut(a, plate ? textures.arming : textures[family], material, shirt, plate ? .003 : .013, tex));
    if (plate) {
      layers.push(plateShell(a));
      return { layers };
    }
    layers.push(skirt(a, family, material));
    layers.push(waistband(a));
    const projection = 'wardrobe-' + family + '-' + ((scene.sex || 0) * 3 + (scene.build || 0));
    for (const raw of layers.slice(1)) {
      delete raw.mesh.uv;
      raw.textureId = projection;
    }
    return { layers };
  }

  function fittedSurface(mesh, matrices, bodyPose) {
    const positions = new Float32Array(mesh.vertices.length), normals = new Float32Array(mesh.normals.length);
    for (let i = 0; i < mesh.materials.length; i++) {
      const binding = mesh.bindings[i], normal = xyz(mesh.normals, i);
      for (const [source, fraction] of binding.source) for (let axis = 0; axis < 3; axis++) positions[i * 3 + axis] += bodyPose.positions[source * 3 + axis] * fraction;
      for (let j = 0; j < 4; j++) {
        const at = i * 8 + j * 2, weight = mesh.skin[at + 1];
        if (!weight) continue;
        const bone = matrices[mesh.skin[at]], n = matrixNormal(bone, normal), shift = matrixNormal(bone, binding.delta);
        for (let axis = 0; axis < 3; axis++) {
          positions[i * 3 + axis] += shift[axis] * weight;
          normals[i * 3 + axis] += n[axis] * weight;
        }
      }
    }
    return { positions, normals };
  }

  function rigidSegment(a, p, part) {
    const s = side(p), y = p[1];
    if (part === 'torso' && y > a.waist + .030) return [a.bones.chest, .82 * smoothStep(clamp((y - a.waist - .030) / .10))];
    if (part === 'legs') {
      const shin = a.bones['shin' + s], knee = shin.start[1], thigh = a.bones['thigh' + s];
      if (y > knee + .048 && y < a.hip - .075) return [thigh, .73 * smoothStep(clamp((y - knee - .048) / .07))];
      if (y < knee - .040 && y > a.ankle + .052) return [shin, .78 * smoothStep(clamp((knee - y - .040) / .066))];
      return [shin, .14];
    }
    if (part === 'arms') {
      const upper = a.bones['upperArm' + s], fore = a.bones['foreArm' + s], t = toBone(p, fore);
      if (t > .13 && t < .95) return [fore, .82 * smoothStep(clamp((t - .13) / .26))];
      if (t < -.17) return [upper, .81 * smoothStep(clamp((-t - .17) / .42))];
    }
    return null;
  }

  function plateShell(a) {
    const mesh = a.scene.armor;
    const trim = a.scene.archetype === 'armor-knights-plate';
    const base = layer(mesh, 'plate');
    base.componentIds = mesh.partLabels.map((part, i) => {
      if (part === 'hands') return component.hand;
      if (part === 'boots') return component.foot;
      const [x, y, z] = xyz(mesh.vertices, i);
      return trim && part === 'torso' && Math.abs(z) > .057 && Math.abs(x) > .024 && y > a.waist + .026 && y < a.waist + .16 ? component.plateTrim : 0;
    });
    if (trim) base.textureId = 'plate-knight';
    const segments = mesh.partLabels.map((part, i) => rigidSegment(a, xyz(mesh.vertices, i), part));
    base.pose = (matrices, bodyPose, options = {}) => {
      const fitted = fittedSurface(mesh, matrices, bodyPose);
      if (!options.state || options.state === 'idle') return fitted;
      for (let i = 0; i < segments.length; i++) {
        if (!segments[i]) continue;
        const [bone, amount] = segments[i], m = matrices[bone.i];
        const rigid = apply(m, xyz(mesh.vertices, i)), normal = matrixNormal(m, xyz(mesh.normals, i));
        for (let axis = 0; axis < 3; axis++) {
          const at = i * 3 + axis;
          fitted.positions[at] = mix(fitted.positions[at], rigid[axis], amount);
          fitted.normals[at] = mix(fitted.normals[at], normal[axis], amount);
        }
      }
      return fitted;
    };
    return base;
  }

  function waistband(a) {
    const band = v => {
      const y = v.p[1] + clamp(v.p[2], -.18, .18) * .045;
      return Math.min(y - a.waist + .010, a.waist + .028 - y, v.part === 'torso' ? 1 : -.08);
    };
    return cut(a, textures.belt, surface.fixed, band, .020, v => bodyUV(a, v));
  }

  function side(p) { return p[0] < 0 ? 'L' : 'R'; }

  function handField(a, v, foreReach) {
    const p = v.p, name = side(p), wrist = a.bones['hand' + name], fore = a.bones['foreArm' + name];
    const t = toBone(p, wrist), armT = toBone(p, fore), farFromBody = Math.abs(p[0]) - Math.abs(fore.start[0]) + .009;
    return Math.min(farFromBody, Math.max(t * .12 + .007, (armT - 1 + foreReach) * .17));
  }

  function handUv(a, v, length) {
    const hand = a.bones['hand' + side(v.p)], axis = unit(sub(hand.end, hand.start));
    const lateral = unit(cross(axis, [0, 1, 0]));
    return [.10 + .8 * clamp(.5 + dot(sub(v.p, hand.start), lateral) / .12), .05 + .9 * clamp((toBone(v.p, hand) + length) / (1.22 + length))];
  }

  function gloves(a, archetype) {
    const gilded = archetype === 'hands-gilded', corrigan = archetype === 'dojo-5';
    const metal = archetype === 'hands-plated' || gilded || corrigan, thief = archetype === 'hands-thief';
    const field = v => handField(a, v, metal ? .38 : thief ? .17 : .28);
    const uv = v => handUv(a, v, metal ? .50 : .35);
    const first = cut(a, thief ? textures.thief : textures.gloves, surface.leather, field, .0045, uv, component.hand);
    if (!metal) return [first];
    // The palm stays flexible underneath. The finger bands and the dorsal
    // cap follow the actual fingers and wrist through the closed attack grips.
    const dorsal = v => {
      const hand = a.bones['hand' + side(v.p)], p = sub(v.p, hand.start), t = toBone(v.p, hand);
      const axis = unit(sub(hand.end, hand.start)), outward = unit(cross(cross(axis, [0, 0, 1]), axis));
      const offset = dot(p, outward), bands = Math.cos(t * TAU * 3.3 + .6);
      return Math.min(field(v), offset + (t < .40 ? .007 : .002), Math.max((.43 - t) * .050, (bands + .30) * .011));
    };
    const cuff = v => {
      const fore = a.bones['foreArm' + side(v.p)], t = toBone(v.p, fore);
      return Math.min(field(v), (.96 - t) * .17, (t - .65) * .17);
    };
    const steel = corrigan ? 'gauntlet-corrigan' : textures.gauntlet;
    const plated = [first, cut(a, steel, surface.metal, dorsal, .008, uv, component.hand),
      cut(a, steel, surface.metal, cuff, .008, uv, component.hand)];
    if (corrigan || gilded) {
      const edging = v => Math.min(cuff(v), (.739 - toBone(v.p, a.bones['foreArm' + side(v.p)])) * .16);
      plated.push(cut(a, textures.trim, surface.fixed, edging, .010, uv, component.hand));
    }
    return plated;
  }

  function bootUv(a, v) {
    const ankle = a.bones['foot' + side(v.p)], axis = unit([ankle.end[0] - ankle.start[0], 0, ankle.end[2] - ankle.start[2]]);
    const delta = sub(v.p, ankle.start), lateral = cross(axis, [0, 1, 0]);
    const coord = Math.abs(dot(v.n, lateral)) > .60 ? dot(delta, axis) / .23 : .50 + dot(delta, lateral) / .18;
    return [.03 + .94 * clamp(coord), .04 + .92 * clamp(v.p[1] / (a.knee - .10))];
  }

  function shoes(a, archetype) {
    const metal = archetype === 'feet-steel' || archetype === 'feet-gilded', riding = archetype === 'feet-riding';
    const fit = v => ankleField(a, v, riding ? .64 : metal ? .49 : .39);
    const uv = v => bootUv(a, v), sole = v => .010 * clamp(v.p[1] / .035);
    const leather = cut(a, riding ? textures.riding : textures.boots, surface.boots, fit, sole, uv, component.foot);
    if (!metal) {
      const cuff = v => Math.min(fit(v), -ankleField(a, v, riding ? .57 : .33));
      return [leather, cut(a, textures.belt, surface.fixed, cuff, .015, uv, component.foot)];
    }
    const toe = v => {
      const f = a.bones['foot' + side(v.p)], axial = toBone(v.p, f);
      return Math.min(.108 - v.p[1], (axial - .20) * .18, v.p[1] - .012);
    };
    const shin = v => {
      const b = a.bones['shin' + side(v.p)];
      return Math.min(fit(v), v.p[1] - .115, v.p[2] - b.end[2] + .027);
    };
    const plated = [leather, cut(a, textures.sabaton, surface.metal, toe, .014, uv, component.foot),
      cut(a, textures.gauntlet, surface.metal, shin, .017, uv, component.foot)];
    if (archetype === 'feet-gilded') {
      const edging = v => Math.min(shin(v), -ankleField(a, v, .437));
      plated.push(cut(a, textures.trim, surface.fixed, edging, .018, uv, component.foot));
    }
    return plated;
  }

  const CLOAKS = Object.freeze({
    'cloak-wool': { texture: textures.wool, length: .72, spread: .11, swing: .53, folds: .011 },
    'cloak-travelling': { texture: textures.travelling, length: .85, spread: .19, swing: .84, folds: .015 },
    'cloak-silk': { texture: textures.silk, length: .66, spread: .13, swing: 1.16, folds: .008 },
    'cloak-royal': { texture: textures.royal, length: 1.05, spread: .18, swing: .67, folds: .011, edging: true },
    'relic-u_b4': { texture: 'cloak-kraken', length: .88, spread: .15, swing: .62, folds: .010, leather: true },
    'relic-u_r4': { texture: 'cloak-roadwarden', length: .40, spread: .10, swing: .75, folds: .013, mantle: true },
    'relic-u_r8': { texture: 'cloak-scrivener', length: .37, spread: .09, swing: .91, folds: .009, mantle: true },
    'relic-u_w7': { texture: 'cloak-stormcaller', length: 1.11, spread: .17, swing: .47, folds: .019 },
  });

  function cloak(a, design) {
    const shoulder = a.bones.upperArmL.start[1], top = a.bones.neck.start[1] + .008, neckZ = a.bones.neck.start[2];
    const radius = Math.max(...a.arm.map(b => Math.abs(b.start[0]))) + (a.scene.outfit === 4 ? .080 : .052);
    const depth = torsoBounds(a, a.bones.chest.start[1] + .12), base = a.bones.chest;
    const height = design.length * (a.hip / .96);
    const curve = (t, u) => {
      const angle = (u * 2 - 1) * (design.mantle ? 2.23 : 1.94) * mix(1, .66, t), s = Math.sin(angle), c = Math.cos(angle);
      const cap = smoothStep(clamp(t * (design.mantle ? 6 : 8)));
      const pleat = t * design.folds * Math.sin(u * TAU * 5.5 + t * 1.3);
      const width = mix(.085, radius, cap) + design.spread * t;
      const front = neckZ + .070 * (1 - cap), back = mix(-.078, depth.back - .030, cap) - .083 * t;
      const r = front - back + pleat, z = front - r * (.56 + .44 * c);
      const y = mix(top, shoulder - .018, cap) - height * t + Math.abs(u - .5) * .074 * t ** 1.8;
      return [[s * (width + pleat), y, z], unit([s * .49, .13 * (1 - t), -c])];
    };
    const position = (matrices, _bodyPose, options) => {
      const chest = matrices[base.i], pelvis = matrices[a.bones.pelvis.i], state = options.state || 'idle';
      const phase = options.phase || 0, seat = ['sit', 'seated', 'ride', 'mounted'].includes(state);
      const brisk = state === 'run' ? 1 : state === 'walk' ? .36 : 0;
      const rear = unit(matrixNormal(chest, [0, 0, -1]));
      const turning = !seat && state !== 'idle' && state !== 'walk' && state !== 'run';
      const clearance = turning ? smoothStep(clamp(phase * 4)) * smoothStep(clamp((1 - phase) * 4)) : 0;
      return (t, u, p, n) => {
        const a0 = apply(chest, p), a1 = apply(pelvis, p), w = smoothStep(t) * .67;
        const tail = t ** 2 * design.swing, sway = Math.sin(phase * TAU - t * 2.8),
          run = brisk * tail * (.16 + .037 * sway), lift = brisk * tail * (.09 + .022 * sway);
        // Twisting shoulders otherwise cross the back panel. Give the center
        // fabric room during the turn, with stable anchors and clip endpoints.
        const opening = clearance * .075 * Math.sin(Math.PI * t) ** 2 * (1 - Math.abs(u - .5) * 1.82);
        return [[mix(a0[0], a1[0], w) + brisk * .032 * tail * sway + rear[0] * opening,
          mix(a0[1], a1[1], w) + lift + (seat ? .24 * t ** 2 : 0) + rear[1] * opening,
          mix(a0[2], a1[2], w) - run - (seat ? .090 * t ** 2 : 0) + rear[2] * opening], unit(matrixNormal(chest, n))];
      };
    };
    const material = design.leather ? surface.leather : surface.cloth;
    const cloth = grid(a, design.texture, material, 18, 28, (t, u) => [...curve(t, u), base.i], position, component.cloak);
    if (!design.edging) return [cloth];
    const hemPoint = (t, u) => curve(mix(.96, 1, t), u);
    const hem = grid(a, textures.trim, surface.fixed, 2, 28,
      (t, u) => { const [p, n] = hemPoint(t, u); return [plus(p, scale(n, .002)), n, base.i]; },
      (m, d, o) => { const drape = position(m, d, o); return (t, u, p, n) => drape(mix(.96, 1, t), u, p, n); }, component.cloak);
    return [cloth, hem];
  }

  const slotCatalog = Object.freeze({
    armor: Object.freeze(['armor-knights-plate']),
    hands: Object.freeze(['hands-leather', 'hands-thief', 'hands-plated', 'hands-gilded', 'dojo-5']),
    feet: Object.freeze(['feet-leather', 'feet-riding', 'feet-steel', 'feet-gilded']),
    cloak: Object.freeze(Object.keys(CLOAKS)),
  });

  function fitSlot(scene, slot, archetype) {
    if (slot === 'armor' && slotCatalog.armor.includes(archetype)) return fit({ ...scene, outfit: 4, archetype }).layers;
    const a = actor(scene);
    if (slot === 'hands' && slotCatalog.hands.includes(archetype)) return gloves(a, archetype);
    if (slot === 'feet' && slotCatalog.feet.includes(archetype)) return shoes(a, archetype);
    if ((slot === 'cloak' || slot === 'relic') && Object.hasOwn(CLOAKS, archetype)) return cloak(a, CLOAKS[archetype]);
    throw Error(`Unknown ${slot} wardrobe item ${archetype}`);
  }

  return { fit, fitSlot, slotCatalog, surface, component, textures };
})();

if (typeof module !== 'undefined') module.exports = PaintedReleaseWardrobe;
