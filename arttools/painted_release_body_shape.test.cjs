const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const {refine} = require('./painted_release_body_shape.js');

const fixture = fs.readFileSync(path.join(__dirname, '../game/src/human_mesh_data.js'), 'utf8');
const source = vm.runInNewContext(fixture + '\nHumanMeshData;');
const bone = (mesh, name) => mesh.bones.find(part => part.name === name);
const length = ({start, end}) => Math.hypot(...start.map((n, i) => n - end[i]));
const shoulders = mesh => bone(mesh, 'upperArmR').start[0] - bone(mesh, 'upperArmL').start[0];

function waist(mesh) {
  const points = [];
  const height = bone(mesh, 'abdomen').start[1] + .06;
  for (let i = 0; i < mesh.materials.length; i++) {
    const p = mesh.vertices.slice(i * 3, i * 3 + 3);
    const name = mesh.bones[mesh.skin[i * 8]].name;
    if (name === 'abdomen' && Math.abs(p[1] - height) < .026) points.push(p[0]);
  }
  return Math.max(...points) - Math.min(...points);
}

test('average is exact and fitted non-average profiles preserve the continuous rig', () => {
  assert.equal(refine(source, 0), source);
  for (const build of [1, 2]) {
    const result = refine(source, build);
    assert.equal(result.triangles, source.triangles);
    assert.equal(result.skin, source.skin);
    assert.equal(result.vertices.length, source.vertices.length);
    assert.ok(result.vertices.every(Number.isFinite));
    assert.ok(result.normals.every(Number.isFinite));
    for (const [i, part] of source.bones.entries()) {
      assert.equal(result.bones[i].name, part.name);
      assert.ok(Math.abs(length(result.bones[i]) - length(part)) < 1e-9, part.name);
    }
    assert.equal(bone(result, 'head'), bone(source, 'head'));
    assert.equal(bone(result, 'footL'), bone(source, 'footL'));
    assert.equal(bone(result, 'footR'), bone(source, 'footR'));
  }
});

test('muscular shoulders and heavy waist are independently visible', () => {
  const muscular = refine(source, 1), heavy = refine(source, 2);
  assert.ok(shoulders(muscular) > shoulders(source) * 1.10);
  assert.ok(shoulders(muscular) > shoulders(heavy));
  assert.ok(waist(heavy) > waist(source) * 1.15);
  assert.ok(Math.abs(waist(muscular) - waist(source)) < .01);
});
