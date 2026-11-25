const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { make } = require('../../arttools/human_costume.js');

const src = name => fs.readFileSync(path.join(__dirname, '../src', name), 'utf8');
const { base, locomotion } = vm.runInNewContext([
  src('human_mesh_data.js'), src('human_motion_data.js'), src('human_locomotion.js'),
  '({ base: HumanMeshData, locomotion: HumanLocomotion })',
].join('\n'));
for (const key of ['vertices', 'normals', 'skin', 'triangles', 'materials']) Object.freeze(base[key]);
const outfits = Array.from({ length: 10 }, (_, i) => make(base, i + 1));
const sourceCount = base.materials.length;
const point = (vertices, i) => vertices.slice(i * 3, i * 3 + 3);

test('all ten costumes preserve the source rig and provide finite, nondegenerate skinned geometry', () => {
  for (const [i, mesh] of outfits.entries()) {
    const combo = i + 1;
    const { bones, vertices, normals, skin, triangles, materials } = mesh;
    assert.equal(bones, base.bones, `combo ${combo} uses the original bind skeleton`);
    assert.equal(mesh.height, base.height);
    assert.equal(vertices.length, 3 * materials.length);
    assert.equal(normals.length, vertices.length);
    assert.equal(skin.length, 8 * materials.length);
    assert.equal(triangles.length % 3, 0);
    assert.ok(materials.length > sourceCount);
    assert.ok(vertices.every(Number.isFinite) && normals.every(Number.isFinite));
    assert.ok(materials.every(id => Number.isInteger(id) && id >= 0 && id <= 9));
    for (let v = 0; v < materials.length; v++) {
      assert.ok(Math.abs(Math.hypot(...point(normals, v)) - 1) < 1e-6, `combo ${combo}, normal ${v}`);
      let sum = 0;
      for (let j = 0; j < 8; j += 2) {
        const [bone, weight] = skin.slice(v * 8 + j, v * 8 + j + 2);
        assert.ok(Number.isInteger(bone) && bone >= 0 && bone < bones.length);
        assert.ok(Number.isFinite(weight) && weight >= 0);
        sum += weight;
      }
      assert.ok(Math.abs(sum - 1) < 1e-5, `combo ${combo}, weight ${v}`);
    }
    for (let j = 0; j < triangles.length; j += 3) {
      const face = triangles.slice(j, j + 3);
      assert.ok(face.every(v => Number.isInteger(v) && v >= 0 && v < materials.length));
      const [a, b, c] = face.map(v => point(vertices, v));
      const [u, v, w] = b.map((p, axis) => p - a[axis]);
      const [x, y, z] = c.map((p, axis) => p - a[axis]);
      assert.ok(Math.hypot(v * z - w * y, w * x - u * z, u * y - v * x) > 1e-10,
        `combo ${combo}, face ${j / 3}`);
    }
  }
  assert.deepEqual(make(base, 7), outfits[6], 'building another fit is repeatable with the frozen source');
});

function garmentPoints(mesh, predicate) {
  return mesh.materials.flatMap((material, i) => {
    if (i < sourceCount) return [];
    const p = point(mesh.vertices, i);
    return predicate(p, material) ? [p] : [];
  });
}

test('both body fits have distinct torso proportions and period garment silhouettes', () => {
  const shoulderIds = base.materials.flatMap((material, i) => {
    const [x, y] = point(base.vertices, i);
    const trunk = base.bones[base.skin[i * 8]].name === 'chest';
    return trunk && material === 0 && y > 1.32 && y < 1.44 && Math.abs(x) > .10 ? [i] : [];
  });
  const shoulder = mesh => Math.max(...shoulderIds.map(i => Math.abs(mesh.vertices[i * 3])));
  for (const group of [outfits.slice(0, 5), outfits.slice(5)]) {
    const [tunic, robe, leather, mail, plate] = group;
    const skirt = mesh => garmentPoints(mesh, ([, y]) => y < .94);
    const hem = mesh => Math.min(...skirt(mesh).map(([, y]) => y));
    assert.ok(hem(robe) < hem(tunic) - .35);
    assert.ok(hem(mail) < hem(leather) - .1);
    assert.ok(skirt(robe).some(([x, y]) => Math.abs(x) > .27 && y < .55));
    const shoulderShell = mesh => garmentPoints(mesh, ([x, y]) => Math.abs(x) > .19 && y > 1.31);
    assert.ok(shoulderShell(leather).length > 30);
    assert.equal(shoulderShell(tunic).length, 0);
    assert.ok(garmentPoints(plate, ([x, y], material) => material === 8 && Math.abs(x) > .26 && y > 1.38).length > 20);
    assert.equal(garmentPoints(mail, ([x, y], material) => material === 8 && Math.abs(x) > .26 && y > 1.38).length, 0);
  }
  assert.ok(shoulder(outfits[0]) > shoulder(outfits[5]) + .004);
});

test('garment variants preserve the actual planted-foot trajectory and split robe follows both legs', () => {
  const shoeIds = base.materials.flatMap((material, i) => material === 2 ? [i] : []);
  const phase = .34;
  const source = locomotion.skin(true, phase).positions;
  for (const mesh of outfits) {
    const skin = locomotion.create(mesh).skin(true, phase).positions;
    for (const i of shoeIds) assert.deepEqual(point(skin, i), point(source, i));
  }

  for (const robe of [outfits[1], outfits[6]]) {
    const rig = locomotion.create(robe);
    const hem = robe.materials.flatMap((material, i) => {
      if (i < sourceCount || material !== 9) return [];
      const [x, y] = point(robe.vertices, i);
      return y < .45 ? [{ i, side: Math.sign(x) }] : [];
    });
    assert.ok(hem.length > 20 && hem.every(({ side }) => side !== 0), 'open hem leaves a stride gap');
    const poses = [.06, .56].map(phase => rig.skin(true, phase).positions);
    const reach = poses.map(pose => {
      const average = side => {
        const points = hem.filter(p => p.side === side);
        return points.reduce((sum, { i }) => sum + pose[i * 3 + 2], 0) / points.length;
      };
      return average(-1) - average(1);
    });
    assert.ok(reach[0] * reach[1] < 0 && reach.every(value => Math.abs(value) > .12),
      'opposite halves follow their respective legs through both stride directions');
  }
});
