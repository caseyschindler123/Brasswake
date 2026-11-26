/* Continuous fitted body and shared attachment measurements for the offline bake. */
const PaintedReleaseGeometry = (() => {
  const lerp = (a, b, t) => a.map((n, i) => n + (b[i] - n) * t);
  const sub = (a, b) => a.map((n, i) => n - b[i]);
  const unit = vector => {
    const length = Math.hypot(...vector) || 1;
    return vector.map(n => n / length);
  };
  const pointAt = (values, index) => values.slice(index * 3, index * 3 + 3);
  const transform = (m, p) => [
    m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3],
    m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7],
    m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11],
  ];
  const round = numbers => Array.from(numbers, n => Math.round(n * 1000) / 1000);

  function build(source, sex, buildNumber) {
    const fitted = PaintedModelGeometry.make(source);
    const names = Object.fromEntries(fitted.body.bones.map((b, i) => [b.name, i]));
    const head = source.bones[names.head];
    const skull = source.vertices.reduce((indices, value, i) => {
      if (i % 3 === 1 && value > head.start[1] + .035) indices.push((i - 1) / 3);
      return indices;
    }, []);
    const headY = Math.max(...skull.map(i => source.vertices[i * 3 + 1]));
    return {...fitted, names, skull, headY, source, sex, build: buildNumber};
  }

  function skin(mesh, matrices, bodyPose) {
    const {vertices, normals: restNormals, skin: weights, bindings} = mesh;
    const positions = new Float32Array(vertices.length);
    const normals = new Float32Array(vertices.length);
    for (let i = 0, j = 0; i < vertices.length; i += 3, j += 8) {
      const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
      const nx = restNormals[i], ny = restNormals[i + 1], nz = restNormals[i + 2];
      const binding = bindings?.[i / 3];
      for (let k = j; k < j + 8; k += 2) {
        const weight = weights[k + 1];
        if (!weight) continue;
        const m = matrices[weights[k]];
        if (binding) {
          const [dx, dy, dz] = binding.delta;
          positions[i] += (m[0] * dx + m[1] * dy + m[2] * dz) * weight;
          positions[i + 1] += (m[4] * dx + m[5] * dy + m[6] * dz) * weight;
          positions[i + 2] += (m[8] * dx + m[9] * dy + m[10] * dz) * weight;
        } else {
          positions[i] += (m[0] * x + m[1] * y + m[2] * z + m[3]) * weight;
          positions[i + 1] += (m[4] * x + m[5] * y + m[6] * z + m[7]) * weight;
          positions[i + 2] += (m[8] * x + m[9] * y + m[10] * z + m[11]) * weight;
        }
        normals[i] += (m[0] * nx + m[1] * ny + m[2] * nz) * weight;
        normals[i + 1] += (m[4] * nx + m[5] * ny + m[6] * nz) * weight;
        normals[i + 2] += (m[8] * nx + m[9] * ny + m[10] * nz) * weight;
      }
      if (binding) for (const [vertex, weight] of binding.source) {
        positions[i] += bodyPose.positions[vertex * 3] * weight;
        positions[i + 1] += bodyPose.positions[vertex * 3 + 1] * weight;
        positions[i + 2] += bodyPose.positions[vertex * 3 + 2] * weight;
      }
    }
    return {positions, normals};
  }

  function measure(model, pose, posedBody, projection) {
    const {names, body, skull, headY} = model;
    const sockets = {}, bones = body.bones;
    const bone = name => bones[names[name]];
    const positioned = (name, p) => transform(pose.matrices[names[name]], p);
    const add = (key, p, p2) => {
      const start = projection(p), end = projection(p2);
      sockets[key] = {p: round(start.slice(0, 2)), axis: round(unit(sub(end, start))), depth: round([start[2]])[0]};
    };
    const crown = positioned('head', [0, headY, .047]);
    const jaw = positioned('head', [0, bone('head').start[1] - .023, .062]);
    add('head', crown, jaw);
    const crownProjected = projection(crown);
    const headWidths = skull.map(i => projection(pointAt(posedBody.positions, i))[0]);
    const width = Math.max(...headWidths) - Math.min(...headWidths);
    const shoulder = bone('neck').start;
    add('collar', positioned('neck', shoulder), positioned('neck', bone('neck').end));
    add('torso', positioned('chest', lerp(bone('chest').start, bone('chest').end, .70)), positioned('chest', bone('chest').end));
    add('waist', positioned('abdomen', bone('abdomen').start), positioned('abdomen', bone('abdomen').end));
    const feet = [];
    for (const [label, side] of [['left', 'L'], ['right', 'R']]) {
      const hand = bone('hand' + side), arm = bone('foreArm' + side), foot = bone('foot' + side);
      add(label + 'Palm', positioned('hand' + side, lerp(hand.start, hand.end, .48)), positioned('hand' + side, hand.end));
      add(label + 'Forearm', positioned('foreArm' + side, lerp(arm.start, arm.end, .60)), positioned('foreArm' + side, arm.end));
      const sole = lerp(foot.start, foot.end, .63);
      sole[1] = 0;
      const origin = positioned('foot' + side, sole), onFloor = projection([origin[0], 0, origin[2]]);
      add(label + 'Foot', origin, positioned('foot' + side, foot.end));
      feet.push(round([...projection(origin).slice(0, 2), onFloor[1], origin[1]]));
    }
    const footTargets = Object.values(pose.targets?.feet || {});
    const supported = footTargets.filter(foot => foot.active);
    const supports = supported.filter(foot => foot.support)
      .map(foot => round(projection(foot.support.world).slice(0, 2)));
    if (!supports.length && pose.state === 'idle') supports.push(...feet.map(([x, , y]) => [x, y]));
    const head = round([crownProjected[1], crownProjected[0], width]);
    const hands = [...sockets.leftPalm.p, ...sockets.rightPalm.p];
    const angle = Math.atan2(-sockets.head.axis[0], sockets.head.axis[1]);
    const flight = (pose.state === 'walk' || pose.state === 'run') && !supported.length;
    return {head, hands, sockets, supports, feet, flight, angle};
  }

  return {build, skin, measure};
})();

if (typeof module !== 'undefined') module.exports = PaintedReleaseGeometry;
