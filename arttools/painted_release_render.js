/* Offline WebGL renderer for the fitted character atlas. */
const PaintedReleaseRender = (() => {
  const T = THREE;
  const GUIDE_HEIGHT = 2.05;
  const GUIDE_CENTER = .90;
  const WORLD_ORIGIN = [128, 128];
  const PAPER_ORIGIN = [150, 427.5];
  const CAMERA_ELEVATION = 40 * Math.PI / 180;
  const PALETTE = {
    1: '#c8bda5', 2: '#6d5039', 3: '#8c959b', 4: '#b38464', 5: '#6c5e51',
    6: '#6d5039', 7: '#957d53', 8: '#a47661', 9: '#6d5039',
  };
  const PARTS = ['head', 'torso', 'arms', 'legs', 'hands', 'boots'];
  const TEXTURES = new Map();
  const renderer = new T.WebGLRenderer({alpha: true, antialias: false, preserveDrawingBuffer: true});
  renderer.setClearColor(0x000000, 0);
  renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
    throw Error(gl.getShaderInfoLog(vertex) + gl.getShaderInfoLog(fragment));
  };
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = T.SRGBColorSpace;

  function targets(width, height) {
    return new T.WebGLRenderTarget(width, height, {
      count: 2, depthBuffer: true, minFilter: T.NearestFilter, magFilter: T.NearestFilter,
    });
  }

  const vertexShader = `
    in vec3 normalRest;
    in vec3 originalPosition;
    in float materialId;
    in float componentId;
    in float part;
    in vec3 projectionCoverage;
    in vec2 textureSide;
    in vec2 textureBack;
    out vec2 frontUv;
    out vec2 sideUv;
    out vec2 backUv;
    out vec3 restN;
    out vec3 worldN;
    out vec3 restP;
    out vec3 coverage;
    flat out float id;
    flat out float component;
    flat out float partId;
    out vec3 tint;
    void main() {
      frontUv = uv; sideUv = textureSide; backUv = textureBack;
      restN = normalRest; worldN = normal; restP = originalPosition;
      coverage = projectionCoverage; tint = color;
      id = materialId; component = componentId; partId = part;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    }`;
  const fragmentShader = `
    uniform sampler2D paint;
    uniform sampler2D bodyPaint;
    uniform bool hasPaint;
    uniform bool localUv;
    uniform bool underLayer;
    uniform bool guide;
    uniform bool cutSkull;
    uniform float cutAt;
    in vec2 frontUv;
    in vec2 sideUv;
    in vec2 backUv;
    in vec3 restN;
    in vec3 worldN;
    in vec3 restP;
    in vec3 coverage;
    in vec3 tint;
    flat in float id;
    flat in float component;
    flat in float partId;
    layout(location = 0) out vec4 rgb;
    layout(location = 1) out vec4 semantic;

    vec3 projected(sampler2D textureMap) {
      if (localUv) return texture(textureMap, frontUv).rgb;
      vec3 n = normalize(restN);
      vec3 weights = pow(max(vec3(n.z, abs(n.x), -n.z), 0.), vec3(3.)) * coverage;
      if (weights.x + weights.y + weights.z < .0001) weights = coverage;
      if (weights.x + weights.y + weights.z < .0001) weights = vec3(1.,0.,0.);
      if (partId > 1.5 && partId < 4.5) {
        float frontWeight = coverage.x * max(n.z + .15, 0.);
        float backWeight = coverage.z * max(.15 - n.z, 0.);
        if (frontWeight + backWeight > .001) weights = vec3(frontWeight, 0., backWeight);
      }
      weights /= weights.x + weights.y + weights.z;
      vec2 f = clamp(frontUv, .002, .998);
      vec2 s = clamp(sideUv, .002, .998);
      vec2 b = clamp(backUv, .002, .998);
      f.x /= 3.; s.x = (1. + s.x) / 3.; b.x = (2. + b.x) / 3.;
      return texture(textureMap, f).rgb * weights.x +
        texture(textureMap, s).rgb * weights.y + texture(textureMap, b).rgb * weights.z;
    }

    void main() {
      if (cutSkull && partId < .5 && restP.y > cutAt) discard;
      float collar = 1.505 + .020 * clamp((.06 - restP.z) / .09, 0., 1.) +
        .045 * clamp((abs(restP.x) - .055) / .085, 0., 1.);
      float surface = id;
      if (underLayer && surface < 6.)
        surface = restP.y < collar ? 1. : 4.;
      float light = .67 + .33 * max(0., dot(normalize(worldN), normalize(vec3(-.4, .8, .5))));
      vec3 color = tint * light;
      if (!guide && hasPaint) {
        color = (surface > 3.5 && surface < 4.5 && !localUv) ? projected(bodyPaint) : projected(paint);
        if (localUv) color *= .80 + .20 * light;
        if (underLayer && surface < 1.5) {
          float grain = dot(projected(bodyPaint), vec3(.21, .72, .07));
          float rim = smoothstep(collar - .008, collar - .002, restP.y);
          color = mix(vec3(.125, .125, .115) * (.78 + grain * .44), vec3(.24,.225,.20), rim * .55);
        }
        if (partId > 3.5 && partId < 4.5 && surface > 2.5 && surface < 3.5 &&
            dot(color, vec3(.21,.72,.07)) < .24)
          color = vec3(.43,.45,.46) * light;
      }
      rgb = vec4(color, 1.);
      semantic = vec4(surface * 24. / 255., 0., component * 24. / 255., 1.);
    }`;

  async function texture(id) {
    if (!id) return null;
    if (!TEXTURES.has(id)) {
      const promise = new T.TextureLoader().loadAsync('/textures/' + encodeURIComponent(id) + '.png')
        .then(image => {
          image.colorSpace = T.NoColorSpace;
          image.minFilter = image.magFilter = T.LinearFilter;
          image.generateMipmaps = false;
          return image;
        });
      TEXTURES.set(id, promise);
    }
    return TEXTURES.get(id);
  }

  function makeMaterial(layer, bodyPaint, headY, guide, cutSkull) {
    return new T.ShaderMaterial({
      side: T.DoubleSide, vertexColors: true, glslVersion: T.GLSL3, vertexShader, fragmentShader,
      uniforms: {
        paint: {value: layer.paint}, bodyPaint: {value: bodyPaint}, hasPaint: {value: !!layer.paint},
        localUv: {value: !!layer.mesh.uv}, underLayer: {value: !!layer.underLayer},
        cutAt: {value: headY}, guide: {value: guide}, cutSkull: {value: cutSkull && !!layer.cutHead},
      },
    });
  }

  function makeGeometry(layer, canonical, paintReference = canonical) {
    const {mesh, materialIds, componentIds, parts} = layer;
    const {triangles} = mesh;
    const geometry = new T.BufferGeometry(), length = triangles.length;
    const position = new Float32Array(length * 3), normal = new Float32Array(length * 3);
    const original = new Float32Array(length * 3), restNormal = new Float32Array(length * 3);
    const colors = new Float32Array(length * 3), coverage = new Float32Array(length * 3).fill(1);
    const uv = new Float32Array(length * 2), side = new Float32Array(length * 2), back = new Float32Array(length * 2);
    const ids = new Float32Array(length), comp = new Float32Array(length), part = new Float32Array(length);
    const majority = (values, a, b, c) => values[a] === values[b] || values[a] === values[c] ? values[a] : values[b] === values[c] ? values[b] : values[a];
    const color = new T.Color();
    for (let i = 0; i < length; i += 3) {
      const a = triangles[i], b = triangles[i + 1], c = triangles[i + 2];
      const material = majority(materialIds, a, b, c);
      const component = componentIds ? majority(componentIds, a, b, c) : 0;
      const group = parts ? PARTS.indexOf(majority(parts, a, b, c)) : 1;
      color.setStyle(PALETTE[material] || '#887966', T.LinearSRGBColorSpace);
      for (let j = i; j < i + 3; j++) {
        const v = triangles[j], p = v * 3;
        const x = paintReference.positions[p], y = paintReference.positions[p + 1], z = paintReference.positions[p + 2];
        const u = .5 + (y - GUIDE_CENTER) / GUIDE_HEIGHT, panelWidth = GUIDE_HEIGHT / 2;
        uv.set(mesh.uv ? mesh.uv.slice(v * 2, v * 2 + 2) : [.5 + x / panelWidth, u], j * 2);
        side.set([.5 + z / panelWidth, u], j * 2);
        back.set([.5 - x / panelWidth, u], j * 2);
        original[j * 3] = mesh.vertices[p];
        original[j * 3 + 1] = mesh.vertices[p + 1];
        original[j * 3 + 2] = mesh.vertices[p + 2];
        restNormal[j * 3] = paintReference.normals[p];
        restNormal[j * 3 + 1] = paintReference.normals[p + 1];
        restNormal[j * 3 + 2] = paintReference.normals[p + 2];
        colors.set([color.r, color.g, color.b], j * 3);
        ids[j] = material; comp[j] = component; part[j] = group < 0 ? 1 : group;
      }
    }
    const add = (name, values, size) => geometry.setAttribute(name, new T.BufferAttribute(values, size));
    add('position', position, 3); add('normal', normal, 3); add('originalPosition', original, 3);
    add('normalRest', restNormal, 3); add('projectionCoverage', coverage, 3);
    add('color', colors, 3); add('uv', uv, 2); add('textureSide', side, 2); add('textureBack', back, 2);
    add('materialId', ids, 1); add('componentId', comp, 1); add('part', part, 1);
    return geometry;
  }

  function upload(layer, posed) {
    const geometry = layer.object.geometry;
    const position = geometry.attributes.position, normal = geometry.attributes.normal;
    const triangles = layer.mesh.triangles, {positions, normals} = posed;
    for (let i = 0; i < triangles.length; i++) {
      const p = triangles[i] * 3, at = i * 3;
      position.array[at] = positions[p];
      position.array[at + 1] = positions[p + 1];
      position.array[at + 2] = positions[p + 2];
      normal.array[at] = normals[p];
      normal.array[at + 1] = normals[p + 1];
      normal.array[at + 2] = normals[p + 2];
    }
    position.needsUpdate = normal.needsUpdate = true;
  }

  function camera(kind, direction, width, height) {
    const world = kind === 'world', guide = kind === 'guide';
    const size = guide ? GUIDE_HEIGHT : world ? height / 48 : height / 225;
    const anchor = guide ? [width / 2, height / 2] : world ? WORLD_ORIGIN : PAPER_ORIGIN;
    const local = world ? [width / 2, height / 2] : anchor;
    const center = guide ? GUIDE_CENTER : world ? 0 : GUIDE_CENTER;
    const yaw = direction * Math.PI / 4, elevation = world ? CAMERA_ELEVATION : 0;
    const c = Math.cos(yaw), s = Math.sin(yaw), rise = Math.sin(elevation), ground = Math.cos(elevation);
    const halfWidth = size * width / height / 2, halfHeight = size / 2;
    const cam = new T.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, .01, 30);
    cam.position.set(s * ground * 6, center + rise * 6, c * ground * 6);
    cam.lookAt(0, center, 0);
    cam.updateMatrixWorld();
    const scale = height / size;
    return {
      cam, origin: anchor, offset: [anchor[0] - local[0], anchor[1] - local[1]],
      project: ([x, y, z]) => [
        width / 2 + (c * x - s * z) * scale + anchor[0] - local[0],
        height / 2 - (ground * (y - center) - rise * (s * x + c * z)) * scale + anchor[1] - local[1],
        rise * y + ground * (s * x + c * z),
      ],
    };
  }

  function components(parts) {
    return parts?.map(part => part === 'hands' ? 8 : part === 'boots' ? 9 : 0);
  }

  function pilotLayers(model, outfit) {
    const underLayer = outfit === 4;
    const layers = [{
      mesh: model.body, materialIds: underLayer ? model.under : model.semantic,
      componentIds: components(model.parts), parts: model.parts,
      textureId: 'body', underLayer, cutHead: true,
    }];
    if (underLayer) layers.push({
      mesh: model.armor, materialIds: model.armor.materials, componentIds: components(model.armor.partLabels),
      parts: model.armor.partLabels, textureId: 'plate',
    });
    return layers;
  }

  function buildProfile(source, sex, build, projectionSource = source) {
    const model = PaintedReleaseGeometry.build(source, sex, build);
    const rig = PaintedModelMotion.create(model.body);
    const combat = typeof PaintedReleaseCombat === 'undefined' ? null : PaintedReleaseCombat.create(model.body, rig);
    const neutral = rig.skin(false, 0, {state: 'idle'});
    const neutralSkins = new WeakMap([[model.body, neutral]]);
    // Reuse the measured landmarks of the immutable skin painting while its
    // continuous source vertices and clothes are fitted to the current build.
    const paintReference = projectionSource === source ? neutral
      : HumanLocomotion.create(PaintedModelGeometry.make(projectionSource).body).skin(false, 0, {state: 'idle'});
    if (paintReference.positions.length !== neutral.positions.length) throw Error('Paint reference topology differs');
    return {model, rig, combat, neutral, neutralSkins, paintReference};
  }

  function projectionCoverage(scene, layers) {
    if (layers.every(layer => layer.mesh.uv || layer.occluder)) return;
    const width = 512, height = 1024;
    const target = new T.WebGLRenderTarget(width, height, {type: T.FloatType, depthBuffer: true});
    const material = new T.ShaderMaterial({
      side: T.DoubleSide,
      vertexShader: 'varying float depth;void main(){vec4 p=modelViewMatrix*vec4(position,1.);depth=-p.z;gl_Position=projectionMatrix*p;}',
      fragmentShader: 'varying float depth;void main(){gl_FragColor=vec4(depth,0.,0.,1.);}',
    });
    try {
      scene.overrideMaterial = material;
      const views = [0, 6, 4].map(direction => {
        const view = camera('guide', direction, width, height);
        const pixels = new Float32Array(width * height * 4);
        renderer.setRenderTarget(target);
        renderer.clear();
        renderer.render(scene, view.cam);
        renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
        return {view, pixels};
      });
      for (const layer of layers) {
        if (layer.mesh.uv || layer.occluder) continue;
        const attrs = layer.object.geometry.attributes, values = attrs.projectionCoverage.array;
        const p = attrs.position.array;
        for (let i = 0; i < p.length; i += 3) for (const [j, {view, pixels}] of views.entries()) {
          const [sx, sy, sz] = view.project([p[i], p[i + 1], p[i + 2]]);
          const x = Math.round(sx), y = Math.round(height - sy);
          let closest = Infinity;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const a = x + dx, b = y + dy;
            if (a < 0 || a >= width || b < 0 || b >= height) continue;
            const at = (b * width + a) * 4;
            if (pixels[at + 3] > .5) closest = Math.min(closest, Math.abs(pixels[at] - (6 - sz)));
          }
          values[i + j] = closest < .006 ? 1 : 0;
        }
        attrs.projectionCoverage.needsUpdate = true;
      }
    } finally {
      scene.overrideMaterial = null;
      renderer.setRenderTarget(null);
      target.dispose();
      material.dispose();
    }
  }

  async function look(profile, outfit, {guide = false, slot, archetype, pilot = false, fullHead = false} = {}) {
    const {model, neutral, neutralSkins, paintReference} = profile;
    const shape = {...model, outfit};
    const wardrobe = typeof PaintedReleaseWardrobe === 'undefined' ? null : PaintedReleaseWardrobe;
    if (!wardrobe && !pilot) throw Error('Missing fitted release wardrobe module');
    const layers = slot && slot !== 'armor' ? wardrobe.fitSlot(shape, slot, archetype)
      : (pilot || !wardrobe ? pilotLayers(model, outfit) : wardrobe.fit({...shape, archetype}).layers);
    if (slot === 'cloak') {
      const {layers: inner} = wardrobe.fit(shape);
      for (const layer of inner) layers.push({...layer, occluder: true});
    }
    const skinProfile = model.sex * 3 + model.build;
    const bodyId = pilot || skinProfile === 0 ? 'body' : 'body-' + skinProfile;
    const scene = new T.Scene(), bodyPaint = guide ? null : await texture(bodyId);
    for (const raw of layers) {
      raw.parts ||= raw.mesh === model.body ? model.parts : raw.mesh.partLabels;
      raw.materialIds ||= raw.mesh.materials;
      raw.componentIds ||= components(raw.parts);
      if (raw.mesh === model.body) raw.cutHead = true;
      const getSkin = (pose, bodyPose) => raw.pose
        ? raw.pose(pose.matrices, bodyPose, pose)
        : PaintedReleaseGeometry.skin(raw.mesh, pose.matrices, bodyPose);
      const canonical = raw.pose ? getSkin(neutral, neutral) : neutralSkins.get(raw.mesh) || getSkin(neutral, neutral);
      if (!raw.pose) neutralSkins.set(raw.mesh, canonical);
      raw.paint = guide || raw.occluder ? null : raw.textureId === 'body' ? bodyPaint : await texture(raw.textureId);
      const matchedPaint = raw.mesh.vertices === model.body.vertices ? paintReference : canonical;
      const geometry = makeGeometry(raw, canonical, matchedPaint);
      const material = raw.occluder ? new T.MeshDepthMaterial({side: T.DoubleSide, colorWrite: false})
        : makeMaterial(raw, bodyPaint, model.body.bones[model.names.head].start[1] - .024, guide, !guide && !fullHead);
      raw.object = new T.Mesh(geometry, material);
      if (raw.occluder) raw.object.renderOrder = -1;
      raw.object.frustumCulled = false;
      raw.getSkin = getSkin;
      scene.add(raw.object);
      upload(raw, canonical);
    }
    if (!guide) projectionCoverage(scene, layers);
    return {profile, layers, scene};
  }

  function pose(profile, state, phase, strict) {
    const {rig, combat, model} = profile;
    const selected = state === 'walk' || state === 'run' ? rig.pose(state === 'run', phase)
      : state === 'idle' ? profile.neutral
      : combat ? combat.pose(state, phase)
      : strict ? null : rig.pose(false, phase, {state});
    if (!selected?.matrices) throw Error('Missing release pose for ' + state);
    return {
      pose: {...selected, state, phase},
      body: selected.positions ? selected : PaintedReleaseGeometry.skin(model.body, selected.matrices),
    };
  }

  function apply(appearance, posed) {
    const {model} = appearance.profile;
    for (const layer of appearance.layers) {
      const sharesBody = layer.mesh.vertices === model.body.vertices;
      upload(layer, sharesBody ? posed.body : layer.getSkin(posed.pose, posed.body));
    }
  }

  function render(appearance, view, target, colors, masks) {
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(appearance.scene, view.cam);
    renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, colors, undefined, 0);
    renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, masks, undefined, 1);
  }

  function release(appearance) {
    for (const {object} of appearance.layers) {
      object.geometry.dispose();
      object.material.dispose();
    }
    appearance.scene.clear();
  }

  return {camera, targets, buildProfile, look, pose, apply, render, release, WORLD_ORIGIN};
})();
