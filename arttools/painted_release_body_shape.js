/* Shape the supported builds on continuous pinned profiles before fitting clothes. */
const PaintedReleaseBodyShape = (() => {
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const band = (y, center, radius) => Math.max(0, 1 - ((y - center) / radius) ** 2) ** 2;
  const sub = (a, b) => a.map((n, i) => n - b[i]);
  const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
  const add = (a, b, weight = 1) => a.map((n, i) => n + b[i] * weight);
  const arm = name => /^(?:upperArm|foreArm|hand|finger)/.test(name);
  const sideOf = name => name.endsWith('R') || name.endsWith('.R') ? 'R' : 'L';

  function normals(vertices, triangles) {
    const values = new Float64Array(vertices.length);
    for (let i = 0; i < triangles.length; i += 3) {
      const a = triangles[i] * 3, b = triangles[i + 1] * 3, c = triangles[i + 2] * 3;
      const ux = vertices[b] - vertices[a], uy = vertices[b + 1] - vertices[a + 1], uz = vertices[b + 2] - vertices[a + 2];
      const vx = vertices[c] - vertices[a], vy = vertices[c + 1] - vertices[a + 1], vz = vertices[c + 2] - vertices[a + 2];
      const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
      for (const p of [a, b, c]) {
        values[p] += x; values[p + 1] += y; values[p + 2] += z;
      }
    }
    for (let i = 0; i < values.length; i += 3) {
      const length = Math.hypot(values[i], values[i + 1], values[i + 2]) || 1;
      values[i] /= length; values[i + 1] /= length; values[i + 2] /= length;
    }
    return values;
  }

  function radial(p, bone, amount) {
    const axis = sub(bone.end, bone.start), delta = sub(p, bone.start);
    const along = clamp(dot(delta, axis) / dot(axis, axis));
    const center = add(bone.start, axis, along), prominence = Math.sin(Math.PI * along) ** 2;
    return add(p, sub(p, center), amount * prominence);
  }

  function refine(source, build) {
    if (!build) return source;
    const heavy = build === 2;
    const bones = Object.fromEntries(source.bones.map(bone => [bone.name, bone]));
    const shift = Object.fromEntries(['L', 'R'].map(side => [side, [bones['upperArm' + side].start[0] * (heavy ? .066 : .108), 0, 0]]));
    const shoulderY = bones.upperArmL.start[1];
    const chestY = shoulderY - .082;
    const waistY = bones.abdomen.start[1] + .06;
    const hipY = bones.pelvis.start[1] + .005;
    const outward = heavy ? .142 : .108;
    const posedBones = source.bones.map(bone => {
      if (!arm(bone.name)) return bone;
      const displacement = shift[sideOf(bone.name)];
      return {...bone, start: add(bone.start, displacement), end: add(bone.end, displacement)};
    });
    const vertices = new Float64Array(source.vertices.length);

    for (let i = 0; i < vertices.length; i += 3) {
      const p = source.vertices.slice(i, i + 3);
      const x = p[0], y = p[1], z = p[2], side = x < 0 ? 'L' : 'R';
      const shoulder = band(y, shoulderY, .105), chest = band(y, chestY, .158);
      const waist = band(y, waistY, .177), hips = band(y, hipY, .141);
      const torsoWidth = 1 + outward * Math.max(shoulder, chest) + (heavy ? .215 * waist + .105 * hips : 0);
      const torsoDepth = 1 + (heavy ? .163 * chest + .276 * waist + .121 * hips : .060 * chest);
      const front = Math.max(0, z / .14), fullness = heavy ? .022 * waist * clamp(front) : 0;
      const torso = [x * torsoWidth, y, z * torsoDepth + fullness];
      const upper = radial(p, bones['upperArm' + side], heavy ? .145 : .235);
      const forearm = radial(p, bones['foreArm' + side], heavy ? .085 : .13);
      const thigh = radial(p, bones['thigh' + side], heavy ? .155 : .085);
      const start = (i / 3) * 8;
      const sums = [0, 0, 0];
      for (let k = start; k < start + 8; k += 2) {
        const w = source.skin[k + 1];
        if (!w) continue;
        const name = source.bones[source.skin[k]].name;
        let point = p;
        if (arm(name)) {
          const lengthened = name.startsWith('upperArm') ? upper : name.startsWith('foreArm') ? forearm : p;
          point = add(lengthened, shift[sideOf(name)]);
        } else if (/^(?:pelvis|abdomen|chest|neck)$/.test(name)) point = torso;
        else if (name.startsWith('thigh')) point = thigh;
        for (let a = 0; a < 3; a++) sums[a] += point[a] * w;
      }
      vertices.set(sums, i);
    }
    return {...source, vertices: Array.from(vertices), normals: Array.from(normals(vertices, source.triangles)), bones: posedBones};
  }

  return {refine};
})();

if (typeof module !== 'undefined') module.exports = PaintedReleaseBodyShape;
