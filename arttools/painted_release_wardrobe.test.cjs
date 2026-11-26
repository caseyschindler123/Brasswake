/* Replay against locally staged pinned profile, art and motion inputs. */
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const wardrobe = require('./painted_release_wardrobe');

const ROOT = path.resolve(__dirname, '..');
const release = 'work/painted-release';
const code = file => readFileSync(path.join(ROOT, file), 'utf8');
const dependencies = [
  'work/painted-characters/motion-data.js', 'work/painted-characters/model-pilot/source-upper-motion.js',
  'game/src/human_locomotion.js', 'arttools/painted_model_geometry.js', 'arttools/painted_model_motion.js',
  'arttools/painted_release_geometry.js', 'arttools/painted_release_body_shape.js',
  `${release}/combat/motion.js`, 'arttools/painted_release_combat.js',
].map(code);

function staged(profile) {
  const context = vm.createContext({});
  for (const source of [code(`${release}/profiles/${profile}.js`), ...dependencies]) vm.runInContext(source, context);
  return vm.runInContext(`(() => {
    const source = PaintedReleaseBodyShape.refine(HumanMeshData, ${profile % 3});
    const model = PaintedReleaseGeometry.build(source, ${Math.floor(profile / 3)}, ${profile % 3});
    const rig = PaintedModelMotion.create(model.body);
    const combat = PaintedReleaseCombat.create(model.body, rig);
    return { model, rig, combat, skin: PaintedReleaseGeometry.skin };
  })()`, context);
}

function validate(layer, body) {
  const { mesh, textureId, materialIds, componentIds } = layer;
  assert.ok(existsSync(path.join(ROOT, release, 'textures', textureId + '.png')), textureId);
  assert.equal(mesh.bones, body.bones);
  assert.ok(mesh.triangles.length && mesh.triangles.length % 3 === 0);
  assert.equal(mesh.vertices.length, materialIds.length * 3);
  assert.equal(mesh.normals.length, mesh.vertices.length);
  assert.equal(mesh.skin.length, materialIds.length * 8);
  assert.equal(componentIds.length, materialIds.length);
  assert.ok(mesh.triangles.every(i => Number.isInteger(i) && i >= 0 && i < materialIds.length));
  assert.ok(materialIds.every(id => id > 0 && id <= 7));
  assert.ok(componentIds.every(id => id === 0 || id >= 8 && id <= 11));
}

function posed(profile, state, phase) {
  const { model, rig, combat, skin } = profile;
  const cycle = ['walk', 'run'].includes(state);
  // Riding uses the shared seated skeletal fixture here. Gameplay mounts use
  // the separate composition path to place saddles and feet on the horse.
  const authored = state === 'ride' ? 'sit' : state;
  const pose = cycle ? rig.pose(state === 'run', phase) : state === 'idle' ? rig.pose(false, phase, { state }) : combat.pose(authored, phase);
  return [{ ...pose, state, phase }, skin(model.body, pose.matrices)];
}

function draw(profile, layer, pose, base) {
  return layer.pose ? layer.pose(pose.matrices, base, pose) : profile.skin(layer.mesh, pose.matrices, base);
}

for (const profileId of [0, 1, 2, 3, 4, 5]) test('profile ' + profileId + ' fits every wardrobe archetype on its own bones', () => {
  const profile = staged(profileId), { model } = profile;
  for (let outfit = 0; outfit < 5; outfit++) {
    const { layers } = wardrobe.fit({ ...model, outfit });
    for (const layer of layers) validate(layer, model.body);
    const maximum = Math.max(...layers.map(layer => Math.max(...layer.materialIds)));
    assert.equal(maximum, 7);
  }
  for (const [slot, items] of Object.entries(wardrobe.slotCatalog)) for (const item of items) {
    const layers = wardrobe.fitSlot({ ...model, outfit: 4 }, slot, item);
    assert.ok(layers.length, item);
    for (const layer of layers) validate(layer, model.body);
    const expected = { hands: 8, feet: 9, cloak: 10 }[slot];
    if (expected) assert.ok(layers.every(layer => layer.componentIds.every(id => id === expected)), item);
  }
});

test('closed robe envelope and cloaks remain continuous through motion wrap', () => {
  for (const profileId of [0, 2, 3, 5]) {
    const profile = staged(profileId), { model } = profile;
    const robe = wardrobe.fit({ ...model, outfit: 1 }).layers[3];
    const royal = wardrobe.fitSlot({ ...model, outfit: 1 }, 'cloak', 'cloak-royal')[0];
    for (const state of ['idle', 'walk', 'run', 'sit', 'ride', 'swing', 'thrusttwo', 'hit', 'fall']) {
      const [position, base] = posed(profile, state, .57);
      for (const layer of [robe, royal]) {
        const { positions, normals } = draw(profile, layer, position, base);
        assert.ok(positions.every(Number.isFinite) && normals.every(Number.isFinite), state);
      }
      const { positions } = draw(profile, robe, position, base);
      // UV seam vertices remain joined around the single skirt envelope.
      for (let row = 0; row <= 16; row++) {
        const first = row * 49 * 3, last = first + 48 * 3;
        assert.ok(Math.hypot(...[0, 1, 2].map(i => positions[first + i] - positions[last + i])) < .00001, state);
      }
    }
    for (const layer of [robe, royal]) {
      const start = draw(profile, layer, ...posed(profile, 'run', 0)).positions;
      const end = draw(profile, layer, ...posed(profile, 'run', 1)).positions;
      assert.ok(start.every((value, i) => Math.abs(value - end[i]) < .00001));
    }
  }
});

test('articulated plate preserves v3 neutral shell and identifies fixed Knight accents', () => {
  const profile = staged(0), { model } = profile;
  const plain = wardrobe.fit({ ...model, outfit: 4 }).layers.at(-1);
  const knight = wardrobe.fitSlot({ ...model, outfit: 4 }, 'armor', 'armor-knights-plate').at(-1);
  const [neutral, body] = posed(profile, 'idle', 0);
  assert.equal(plain.mesh, model.armor);
  const approved = profile.skin(model.armor, neutral.matrices, body);
  assert.ok(draw(profile, plain, neutral, body).positions.every((n, i) => Math.abs(n - approved.positions[i]) < .000001));
  assert.ok(knight.componentIds.includes(11));
  assert.equal(plain.componentIds.includes(11), false);
  assert.notEqual(knight.textureId, plain.textureId);
  const [attack, posedBody] = posed(profile, 'swing', .71);
  const shell = draw(profile, plain, attack, posedBody);
  assert.ok(shell.positions.every(Number.isFinite));
  const flexible = profile.skin(model.armor, attack.matrices, posedBody).positions;
  assert.ok(shell.positions.some((n, i) => Math.abs(n - flexible[i]) > .001));
});

test('cape rotation clearance is confined to the active turn', () => {
  const profile = staged(2), { model } = profile;
  const cape = wardrobe.fitSlot({ ...model, outfit: 3 }, 'cloak', 'cloak-royal')[0];
  for (const phase of [0, 2 / 11, 1]) {
    const [pose, body] = posed(profile, 'swingtwo', phase);
    const animated = draw(profile, cape, pose, body).positions;
    const seatedClearanceAbsent = draw(profile, cape, { ...pose, state: 'idle' }, body).positions;
    const changed = animated.some((n, i) => Math.abs(n - seatedClearanceAbsent[i]) > .004);
    assert.equal(changed, phase > 0 && phase < 1);
  }
});
