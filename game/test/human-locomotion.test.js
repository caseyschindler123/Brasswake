const assert = require('node:assert/strict');
const fs = require('node:fs');
const {test} = require('node:test');
const vm = require('node:vm');

const source = ['human_mesh_data', 'human_motion_data', 'human_locomotion']
  .map(name => fs.readFileSync(require.resolve(`../src/${name}.js`), 'utf8'))
  .join('\n');
const {mesh, rig} = vm.runInNewContext(source + '\n({mesh: HumanMeshData, rig: HumanLocomotion})');
const boneIndex = Object.fromEntries(mesh.bones.map((bone, index) => [bone.name, index]));
const gaits = [['walk', false], ['run', true]];
const sides = [['l', 'L'], ['r', 'R']];
const samplesPerCycle = 128;
const axes = [0, 1, 2];

const distance = (a, b) => Math.hypot(...axes.map(axis => a[axis] - b[axis]));
const dot = (a, b) => axes.reduce((sum, axis) => sum + a[axis] * b[axis], 0);

function transform(matrix, point) {
  return axes.map(axis => {
    const row = axis * 4;
    return dot(matrix.slice(row, row + 3), point) + matrix[row + 3];
  });
}

function near(actual, expected, tolerance, description) {
  assert.ok(Math.abs(actual - expected) < tolerance,
    `${description}: expected ${expected} ± ${tolerance}, got ${actual}`);
}

function weightedVertices(boneName, threshold) {
  const matches = [];
  for (let offset = 0; offset < mesh.skin.length; offset += 8) {
    for (let slot = offset; slot < offset + 8; slot += 2) {
      if (mesh.skin[slot] === boneIndex[boneName] && mesh.skin[slot + 1] > threshold) {
        matches.push(offset / 8 * 3);
      }
    }
  }
  assert.ok(matches.length > 30, `${boneName} lacks an independently measurable skin surface`);
  return matches;
}

const samples = Object.fromEntries(gaits.map(([gait, running]) => [gait,
  Array.from({length: 2 * samplesPerCycle}, (_, index) => {
    const phase = index / samplesPerCycle;
    return {phase, pose: rig.pose(running, phase)};
  }),
]));

test('free running soles clear the actual ground during flight without changing the planted feet',()=>{
  const feet=sides.map(([,suffix])=>weightedVertices('foot'+suffix,.98));
  for(let frame=0;frame<64;frame++){
    const pose=rig.skin(true,frame/64),minimum=feet.map(indices=>Math.min(...indices.map(i=>pose.positions[i+1])));
    assert.ok(minimum.every(y=>y>=-1e-6),'running sole penetrates floor at '+frame);
    if([27,59].includes(frame)){
      assert.ok(!pose.targets.feet.l.active&&!pose.targets.feet.r.active);
      assert.ok(minimum.every(y=>y>.06),'flight must lift both real soles over 6cm');
    }
  }
});

test('walking and running hands face inward and fingers flex toward the palm',()=>{
  const subtract=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>a.map(v=>v/Math.hypot(...a));
  for(const running of [false,true])for(let frame=0;frame<64;frame++)for(const [side,suffix]of sides){
    const pose=rig.pose(running,frame/64),hand=mesh.bones[boneIndex['hand'+suffix]],matrix=pose.matrices[boneIndex['hand'+suffix]];
    const index=mesh.bones[boneIndex['finger2-1.'+suffix]],little=mesh.bones[boneIndex['finger5-1.'+suffix]],normal=unit(cross(subtract(index.start,little.start),subtract(hand.end,hand.start))).map(v=>v*(side==='l'?1:-1));
    const palm=axes.map(row=>dot(matrix.slice(row*4,row*4+3),normal));
    assert.ok(palm[0]*(side==='l'?1:-1)>.8,'palms should rest toward the body');
    for(let finger=2;finger<=5;finger++){
      const first=mesh.bones[boneIndex['finger'+finger+'-1.'+suffix]],last=mesh.bones[boneIndex['finger'+finger+'-3.'+suffix]];
      const base=transform(matrix,first.start),tip=transform(pose.matrices[boneIndex[last.name]],last.end);
      assert.ok(dot(subtract(tip,base),palm)>.004,'fingers must flex into the palm, not hyperextend');
    }
  }
});

test('locomotion matrices are finite rigid transforms and limbs retain their bind lengths', () => {
  for (const [gait] of gaits) {
    for (const {phase, pose} of samples[gait]) {
      assert.equal(pose.matrices.length, mesh.bones.length);
      for (const [index, matrix] of pose.matrices.entries()) {
        const bone = mesh.bones[index];
        const label = `${gait} phase ${phase} bone ${bone.name}`;
        assert.equal(matrix.length, 12, label);
        assert.ok(matrix.every(Number.isFinite), label);
        const [x, y, z] = axes.map(axis => matrix.slice(axis * 4, axis * 4 + 3));
        const xy = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
        near(dot(xy, z), 1, 1e-8, `${label} proper rotation`);
        for (const [row, vector] of [x, y, z].entries()) {
          near(dot(vector, vector), 1, 1e-8, `${label} unit axis ${row}`);
        }
        near(distance(transform(matrix, bone.start), transform(matrix, bone.end)),
          distance(bone.start, bone.end), 1e-8, `${label} transformed length`);
      }
      for (const [side, suffix] of sides) {
        const limb = pose.targets[side];
        for (const [name, first, last] of [
          ['thigh', 'hip', 'knee'], ['shin', 'knee', 'ankle'], ['upperArm', 'shoulder', 'elbow'],
          ['foreArm', 'elbow', 'wrist'], ['hand', 'wrist', 'hand'],
        ]) {
          const bone = mesh.bones[boneIndex[name + suffix]];
          near(distance(limb[first], limb[last]), distance(bone.start, bone.end), 1e-5,
            `${gait} phase ${phase} ${bone.name} target length`);
        }
      }
    }
  }
});

test('heel, sole and toe support stay fixed in world space across each stance', () => {
  for (const [gait, running] of gaits) {
    const stride = rig.setup(running).stride;
    assert.ok(Number.isFinite(stride) && stride > 0);
    for (const [side, suffix] of sides) {
      const index = boneIndex['foot' + suffix];
      const footStart = mesh.bones[index].start;
      const parts = new Map();
      let previousPart;
      let anchor;
      for (const {phase, pose} of samples[gait]) {
        const foot = pose.targets.feet[side];
        if (!foot.active) {
          previousPart = undefined;
          continue;
        }
        const {local, world, part} = foot.support;
        const landmark = axes.map(axis => footStart[axis] + local[axis]);
        const actual = transform(pose.matrices[index], landmark);
        near(distance(actual, world), 0, 1e-6, `${gait} ${side} ${part} support transform`);
        near(actual[1], 0, 1e-6, `${gait} ${side} ${part} support height`);
        actual[2] += phase * stride;
        if (part === previousPart) {
          near(distance(actual, anchor), 0, 1e-5, `${gait} ${side} ${part} support drift`);
        } else {
          parts.set(part, (parts.get(part) ?? 0) + 1);
          previousPart = part;
          anchor = actual;
        }
      }
      assert.deepEqual([...parts.keys()].sort(), ['heel', 'sole', 'toe']);
      assert.ok([...parts.values()].every(count => count >= 2),
        `${gait} ${side} should repeat each support segment`);
    }
  }
});

test('walking maintains ground contact and double support while running has flight', () => {
  for (const [gait, running] of gaits) {
    const footOffsets = Object.fromEntries(sides.map(([side, suffix]) =>
      [side, weightedVertices('foot' + suffix, 0.98)]));
    let flight = 0;
    let airborneMesh = 0;
    let doubleSupport = 0;
    for (let index = 0; index < samplesPerCycle; index++) {
      const phase = index / samplesPerCycle;
      const {positions, targets} = rig.skin(running, phase);
      const feet = sides.map(([side]) => {
        const height = Math.min(...footOffsets[side].map(offset => positions[offset + 1]));
        const foot = targets.feet[side];
        if (foot.active) {
          near(height, 0, 0.01, `${gait} phase ${phase} ${side} ${foot.support.part} visible sole`);
        }
        return {active: foot.active, height};
      });
      if (feet.every(foot => foot.active)) doubleSupport++;
      if (feet.every(foot => !foot.active)) {
        flight++;
        if (feet.every(foot => foot.height > 0.02)) airborneMesh++;
      }
    }
    if (running) {
      assert.equal(doubleSupport, 0);
      assert.ok(flight >= 4 && airborneMesh >= 2, 'both visible feet must lift during running flight');
    } else {
      assert.equal(flight, 0);
      assert.ok(doubleSupport >= 4, 'walking should include a visible weight-transfer interval');
    }
  }
});

test('cycle wrap keeps skeletal landmarks continuous through the first landing', () => {
  const epsilon = 1e-6;
  for (const [gait, running] of gaits) {
    const before = rig.pose(running, 1 - epsilon);
    const after = rig.pose(running, 1 + epsilon);
    for (const [index, bone] of mesh.bones.entries()) {
      for (const bindPoint of [bone.start, bone.end]) {
        const a = transform(before.matrices[index], bindPoint);
        const b = transform(after.matrices[index], bindPoint);
        near(distance(a, b), 0, 0.005, `${gait} seam at ${bone.name}`);
      }
    }
  }
});

test('the visible skull stays rigid at adult proportions during walking and running', () => {
  const head = weightedVertices('head', 0.999999);
  const extremes = axes.map(axis => {
    const low = head.reduce((best, offset) => mesh.vertices[offset + axis] < mesh.vertices[best + axis] ? offset : best);
    const high = head.reduce((best, offset) => mesh.vertices[offset + axis] > mesh.vertices[best + axis] ? offset : best);
    return [low, high];
  });
  const [low, high] = extremes[1];
  const height = mesh.vertices[high + 1] - mesh.vertices[low + 1];
  assert.ok(height / mesh.height > 0.11 && height / mesh.height < 0.17, 'adult skull height relative to the body');
  for (const [gait, running] of gaits) {
    for (let sample = 0; sample < 16; sample++) {
      const {positions} = rig.skin(running, sample / 16);
      for (const [a, b] of extremes) {
        const width = distance(mesh.vertices.slice(a, a + 3), mesh.vertices.slice(b, b + 3));
        near(distance(positions.slice(a, a + 3), positions.slice(b, b + 3)),
          width, 1e-6, `${gait} visible skull dimension through phase ${sample / 16}`);
      }
    }
  }
});
