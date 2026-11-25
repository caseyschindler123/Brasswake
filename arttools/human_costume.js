/* Offline wardrobe for the anatomical locomotion mesh. All dimensions are in metres. */
const HumanCostume = (() => {
  const SHIRT = 0, TROUSERS = 1, BOOTS = 2, SKIN = 3, BELT = 5, METAL = 8, TRIM = 9;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const blend = (a, b, t) => a + (b - a) * t;
  const taper = (value, center, falloff) => {
    const t = 1 - clamp(Math.abs(value - center) / falloff);
    return t * t * (3 - 2 * t);
  };
  const norm = ([x, y, z]) => {
    const length = Math.hypot(x, y, z);
    return length > 0 ? [x / length, y / length, z / length] : [0, 1, 0];
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  const looks = [
    { hem: .81, skirt: SHIRT, thickness: .009, flare: .022 },
    { skirt: SHIRT, thickness: .014 },
    { hem: .85, skirt: SHIRT, thickness: .021, flare: .018 },
    { hem: .72, skirt: METAL, thickness: .018, flare: .033 },
    { hem: .81, skirt: TRIM, thickness: .009, flare: .021 },
  ];

  // These broad, subtle adjustments taper away before neck, hands and knees.
  // Both body cuts use the same bind skeleton and the source foot geometry.
  function bodyWidth(y, feminine) {
    const shoulder = taper(y, 1.40, .21), hip = taper(y, .95, .19), waist = taper(y, 1.13, .14);
    return feminine ? 1 - .035 * shoulder + .045 * hip - .025 * waist
      : 1 + .045 * shoulder - .014 * hip + .018 * waist;
  }

  function dressBody(base, shape, bone, look, feminine) {
    const { vertices, materials } = shape;
    for (let i = 0; i < materials.length; i++) {
      const start = i * 3, x = base.vertices[start], y = base.vertices[start + 1], z = base.vertices[start + 2];
      const material = base.materials[i], name = bone[base.skin[i * 8]].name;
      if (material === BOOTS || material === SKIN || material === 4 || material >= 6) continue;
      const arm = name.includes('Arm'), upper = name.startsWith('upperArm');
      const bareForearm = look === 0 && !upper && arm;
      if (!arm) {
        vertices[start] = x * bodyWidth(y, feminine);
        // Shape the ribcage through the sides and back without changing head or neck.
        vertices[start + 2] = z - (feminine ? .004 : .009) * taper(y, 1.34, .23) * clamp((.06 - z) / .11);
      }
      if (bareForearm) {
        materials[i] = SKIN;
        continue;
      }
      const protectedCloth = material === SHIRT || material === BELT;
      if (protectedCloth) {
        const thickness = looks[look].thickness;
        const collar = arm ? 1 : clamp((1.516 - y) / .068), cuff = arm ? clamp((y - 1.13) / .09) : 1;
        const padded = look === 2 && arm ? .008 : thickness;
        const pleat = arm || look >= 2 ? 0 : .0028 * Math.cos(x * 105 + z * 29);
        const allowance = (padded + pleat) * collar * cuff;
        for (let a = 0; a < 3; a++) vertices[start + a] += base.normals[start + a] * allowance;
        materials[i] = look === 3 && (upper || !arm) ? METAL : look >= 2 && arm ? TRIM : SHIRT;
      } else if (material === TROUSERS) {
        // Trousers hang with a little cloth ease all the way past the knee.
        const allowance = .004 * taper(y, .63, .36);
        for (let a = 0; a < 3; a++) vertices[start + a] += base.normals[start + a] * allowance;
      }
    }
  }

  function addVertex(mesh, point, material, influences) {
    const index = mesh.materials.length;
    mesh.vertices.push(...point);
    mesh.materials.push(material);
    const sum = influences.reduce((total, [, weight]) => total + weight, 0);
    for (let i = 0; i < 4; i++) {
      const [bone, weight] = influences[i] || [0, 0];
      mesh.skin.push(bone, weight / sum);
    }
    return index;
  }

  // Open lofts share vertices across each row to shade like folded cloth.
  // The sampling functions choose a winding that faces out from the body.
  function loft(mesh, rows, sectors, sample, flip = false) {
    let previous;
    for (const row of rows) {
      const ring = Array.from({ length: sectors + 1 }, (_, i) => {
        const { point, material, weights } = sample(row, i / sectors);
        return addVertex(mesh, point, material, weights);
      });
      if (previous) {
        for (let i = 0; i < sectors; i++) {
          const [a, b, c, d] = [previous[i], previous[i + 1], ring[i], ring[i + 1]];
          mesh.triangles.push(...(flip ? [a, b, c, b, d, c] : [a, c, b, b, c, d]));
        }
      }
      previous = ring;
    }
  }

  const power = (n, exponent) => Math.sign(n) * Math.pow(Math.abs(n), exponent);
  function ellipse(y, angle, width, depth, z, pleat = 0) {
    return [power(Math.sin(angle), .82) * (width + pleat), y, z + power(Math.cos(angle), .82) * (depth + pleat)];
  }

  function coatTails(mesh, ids, spec, look, feminine) {
    const upper = [
      { y: 1.068, width: .157, depth: .124, leg: 0, split: 0, fold: 0, mat: SHIRT },
      { y: 1.005, width: .204, depth: .150, leg: 0, split: 0, fold: .001, mat: spec.skirt },
      { y: .926, width: .214, depth: .158, leg: .12, split: 0, fold: .004, mat: spec.skirt },
    ];
    const tails = look === 1 ? [
      { y: .83, width: .235, depth: .172, leg: .57, split: .055, fold: .006, mat: SHIRT },
      { y: .69, width: .258, depth: .187, leg: .83, split: .15, fold: .009, mat: SHIRT },
      { y: .56, width: .276, depth: .199, leg: .93, split: .22, fold: .011, mat: SHIRT },
      { y: .414, width: .285, depth: .211, leg: .96, split: .28, fold: .012, mat: SHIRT },
      { y: .40, width: .283, depth: .209, leg: .96, split: .285, fold: .012, mat: TRIM },
    ] : [
      { y: blend(.91, spec.hem, .55), width: .218 + spec.flare * .42, depth: .155 + spec.flare * .23,
        leg: .30, split: .06, fold: .007, mat: spec.skirt },
      { y: spec.hem + .014, width: .212 + spec.flare, depth: .148 + spec.flare * .64,
        leg: .49, split: .085, fold: .009, mat: spec.skirt },
      { y: spec.hem, width: .210 + spec.flare, depth: .146 + spec.flare * .64,
        leg: .50, split: .09, fold: .009, mat: TRIM },
    ];
    // Separate side panels meet above the hip and open at the front and back.
    // Each lower panel follows its own thigh, with a little knee influence at
    // the robe hem. Pelvis still carries the waist and most of the fabric.
    for (const sign of [-1, 1]) {
      const side = sign < 0 ? 'L' : 'R';
      loft(mesh, upper.concat(tails), 14, (row, u) => {
        const angle = sign * blend(row.split, Math.PI - row.split, u);
        const fold = row.fold * Math.cos(u * Math.PI * 10);
        const knee = look === 1 ? clamp((.61 - row.y) * 2.45, 0, .52) : 0;
        const point = ellipse(row.y, angle, row.width * bodyWidth(row.y, feminine), row.depth, .026, fold);
        if (row.split) point[1] += .011 * Math.cos(u * Math.PI * 6) * (row.leg + .24);
        const middle = clamp((row.y - 1) / .10) * .65;
        const opposite = side === 'L' ? 'R' : 'L';
        const across = row.split ? 0 : row.leg * (1 - Math.sin(u * Math.PI)) / 2;
        const weights = [[ids.pelvis, 1 - row.leg - middle], [ids.abdomen, middle],
          [ids['thigh' + side], row.leg - knee - across],
          [ids[across ? 'thigh' + opposite : 'shin' + side], knee + across]];
        return { point, weights, material: row.mat };
      }, sign < 0);
    }
  }

  function torsoBand(mesh, ids, feminine, profile, material, start = -Math.PI, end = Math.PI, seams = false) {
    loft(mesh, profile, seams ? 20 : 28, ([y, width, depth, z, metal], u) => {
      const angle = blend(start, end, u);
      const plateRidge = seams ? .007 * taper(Math.sin(angle), 0, .36) * Math.max(0, Math.cos(angle)) : 0;
      const chest = clamp((y - 1.07) / .28);
      const hips = clamp((1.04 - y) / .08);
      return {
        point: ellipse(y, angle, width * bodyWidth(y, feminine), depth, z, plateRidge),
        weights: [[ids.chest, chest], [ids.abdomen, 1 - chest - hips], [ids.pelvis, hips]],
        material: metal ?? material,
      };
    });
  }

  function sleeve(mesh, ids, side, parent, profile, material) {
    const bone = mesh.bones[ids[parent + side]], offset = bone.end.map((p, i) => p - bone.start[i]);
    const axis = norm(offset), sideAxis = norm(cross(axis, [0, 0, 1])), front = norm(cross(sideAxis, axis));
    loft(mesh, profile, 16, ([along, radius, depth, color, chestWeight = 0], u) => {
      const angle = u * Math.PI * 2, across = radius * Math.cos(angle), out = depth * Math.sin(angle);
      const point = bone.start.map((p, i) => p + offset[i] * along + sideAxis[i] * across + front[i] * out);
      return { point, weights: [[ids[parent + side], 1 - chestWeight], [ids.chest, chestWeight]], material: color ?? material };
    });
  }

  function coatDetails(mesh, ids, look, feminine) {
    // A shaped waist band reads as a belt rather than a stripe on anatomy.
    const belt = [[1.075, .167, .131, .047], [1.067, .170, .134, .048],
      [1.040, .182, .144, .035], [1.034, .181, .144, .034]];
    torsoBand(mesh, ids, feminine, belt, BELT);
    // The small iron clasp is inset in the belt, on the anterior centerline.
    torsoBand(mesh, ids, feminine, [[1.066, .173, .137, .049], [1.046, .181, .151, .035]], TRIM, -.092, .092);

    for (const side of ['L', 'R']) {
      if (look === 1) {
        sleeve(mesh, ids, side, 'foreArm', [[.79, .048, .047, SHIRT], [.91, .053, .052, TRIM],
          [.97, .049, .047, TRIM]], SHIRT);
      } else if (look === 2) {
        sleeve(mesh, ids, side, 'upperArm', [[.03, .075, .079, TRIM, .4], [.19, .084, .080, SHIRT, .22],
          [.37, .073, .070, SHIRT], [.42, .064, .063, TRIM]], SHIRT);
      } else if (look === 3) {
        sleeve(mesh, ids, side, 'upperArm', [[.73, .060, .061, METAL], [.84, .060, .060, TRIM],
          [.87, .054, .052, TRIM]], TRIM);
      } else if (look === 4) {
        // Overlapping metal shoulders are rounded at the arm socket and
        // narrow toward the elbow to leave the upper arm free in the swing.
        sleeve(mesh, ids, side, 'upperArm', [[-.03, .074, .073, TRIM, .58], [.11, .102, .102, METAL, .38],
          [.34, .100, .095, METAL, .19], [.50, .090, .086, METAL, .08],
          [.56, .083, .081, TRIM], [.61, .073, .075, METAL]], METAL);
        sleeve(mesh, ids, side, 'foreArm', [[.14, .053, .055, TRIM], [.20, .063, .058, METAL],
          [.77, .053, .049, METAL], [.84, .050, .047, TRIM]], METAL);
      }
    }

    if (look === 2) {
      // A pair of raised leather front panels follows the curve of the vest.
      for (const [start, end] of [[-.62, -.14], [.14, .62]]) {
        torsoBand(mesh, ids, feminine, [[1.37, .178, .127, .052, TRIM], [1.305, .170, .148, .053],
          [1.15, .162, .145, .053], [1.085, .161, .133, .051, TRIM]], SHIRT, start, end);
      }
    }
    if (look === 4) {
      // The breastplate has a shallow central keel and a tapered lower edge.
      torsoBand(mesh, ids, feminine, [[1.467, .132, .099, .036, TRIM], [1.444, .169, .129, .044],
        [1.375, .186, .147, .038], [1.285, .168, .156, .043], [1.165, .156, .126, .056],
        [1.095, .172, .127, .056, TRIM]], METAL, -Math.PI, Math.PI, true);
      torsoBand(mesh, ids, feminine, [[.996, .204, .165, .028], [.961, .226, .172, .029],
        [.936, .228, .175, .029, TRIM]], METAL);
    }
  }

  function recalculateNormals(mesh) {
    const { vertices, triangles } = mesh;
    const sums = new Float64Array(vertices.length), normal = [];
    const kept = [];
    for (let i = 0; i < triangles.length; i += 3) {
      const a = triangles[i] * 3, b = triangles[i + 1] * 3, c = triangles[i + 2] * 3;
      const u = [vertices[b] - vertices[a], vertices[b + 1] - vertices[a + 1], vertices[b + 2] - vertices[a + 2]];
      const v = [vertices[c] - vertices[a], vertices[c + 1] - vertices[a + 1], vertices[c + 2] - vertices[a + 2]];
      const n = cross(u, v);
      if (Math.hypot(...n) < 1e-10) continue;
      kept.push(a / 3, b / 3, c / 3);
      for (const p of [a, b, c]) for (let j = 0; j < 3; j++) sums[p + j] += n[j];
    }
    for (let i = 0; i < sums.length; i += 3) normal.push(...norm([sums[i], sums[i + 1], sums[i + 2]]));
    mesh.normals = normal;
    mesh.triangles = kept;
  }

  function make(baseMesh, combo) {
    if (!Number.isInteger(combo) || combo < 1 || combo > 10) throw new RangeError('Costume combo must be 1–10');
    const { bones } = baseMesh, feminine = combo > 5, look = (combo - 1) % 5;
    const mesh = { ...baseMesh, vertices: Array.from(baseMesh.vertices), triangles: Array.from(baseMesh.triangles),
      skin: Array.from(baseMesh.skin), materials: Array.from(baseMesh.materials) };
    const ids = Object.fromEntries(bones.map(({ name }, i) => [name, i]));
    dressBody(baseMesh, mesh, bones, look, feminine);
    coatTails(mesh, ids, looks[look], look, feminine);
    coatDetails(mesh, ids, look, feminine);
    recalculateNormals(mesh);
    return mesh;
  }

  return { make };
})();
if (typeof module !== 'undefined') module.exports = HumanCostume;
