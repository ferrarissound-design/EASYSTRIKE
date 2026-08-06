import * as THREE from 'three';

// Renderer-side look of the game: tone mapping, shadows, surface materials and texture
// filtering. Everything here is driven by the 画質 setting so the same scene can run on a
// phone at 低 and still get the full treatment on a desktop at 高.

let level = 'medium';

export function setQuality(quality) {
  level = ['low', 'medium', 'high'].includes(quality) ? quality : 'medium';
}

let maxAnisotropy = 1;

export function configureRenderer(renderer) {
  maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  renderer.setPixelRatio(Math.min(devicePixelRatio, level === 'high' ? 2 : 1.25));
  // Neutral tone mapping keeps the flat pastel palette but rolls off the highlights, so
  // sunlit concrete and snow keep their shading instead of clipping to a white slab.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = level === 'low' ? 1.05 : .98;
  renderer.shadowMap.enabled = level !== 'low';
  renderer.shadowMap.type = level === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
}

// A gradient sky rendered into a PMREM probe. Standard materials pick it up through
// scene.environment, which is what gives edges and metal their soft directional sheen.
export function createSkyEnvironment(renderer, zenith = 0x3b82df, horizon = 0xe8f3ff, ground = 0x9aa8c4) {
  const source = new THREE.Scene();
  const geometry = new THREE.SphereGeometry(1, 16, 12);
  const colors = [];
  const position = geometry.attributes.position;
  const top = new THREE.Color(zenith);
  const middle = new THREE.Color(horizon);
  const bottom = new THREE.Color(ground);
  for (let index = 0; index < position.count; index++) {
    const height = position.getY(index);
    const color = height >= 0 ? middle.clone().lerp(top, Math.min(1, height * 1.4)) : middle.clone().lerp(bottom, Math.min(1, -height * 1.6));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  source.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(source, .04);
  pmrem.dispose();
  geometry.dispose();
  return target.texture;
}

// Single factory for every lit surface in the game. 低 stays on Lambert (no per-pixel
// specular, no environment lookup); everything else gets Standard so surfaces separate
// by roughness instead of all reading as the same matte plastic.
export function surfaceMaterial(color, options = {}) {
  const { roughness = .82, metalness = 0, flatShading = true, emissive, emissiveIntensity, map, envMapIntensity = .32 } = options;
  const shared = { color, flatShading, map };
  if (emissive !== undefined) shared.emissive = emissive;
  if (emissiveIntensity !== undefined) shared.emissiveIntensity = emissiveIntensity;
  if (level === 'low') return new THREE.MeshLambertMaterial(shared);
  return new THREE.MeshStandardMaterial({ ...shared, roughness, metalness, envMapIntensity });
}

// Canvas patterns are viewed at grazing angles down the long sight lines, where plain
// mipmapping smears them into grey. Anisotropy keeps the studs and snow readable.
export function tuneTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = level === 'low' ? 1 : Math.min(maxAnisotropy, level === 'high' ? 8 : 4);
  return texture;
}

// 低画質はLambertで描くので環境マップの回り込みが無い。そのぶんを弱いアンビエントで補い、
// 日陰の面が中・高画質より暗く沈まないようにする。
export function ambientFill() {
  return level === 'low' ? .38 : 0;
}

// The default shadow frustum is a 10x10 box around the light target, which covers almost
// none of a 42m arena. Size it to the arena and the shadows actually land where they should.
export function tuneSunShadow(sun, extent = 30, depth = 120) {
  const camera = sun.shadow.camera;
  camera.left = -extent;
  camera.right = extent;
  camera.top = extent;
  camera.bottom = -extent;
  camera.near = .5;
  camera.far = depth;
  camera.updateProjectionMatrix();
  const size = level === 'high' ? 2048 : 1024;
  sun.shadow.mapSize.set(size, size);
  sun.shadow.bias = -.0006;
  sun.shadow.normalBias = .06;
  sun.shadow.radius = level === 'high' ? 2.6 : 1;
}

// Applied when the 画質 setting changes mid-session. Resolution, shadows and tone mapping
// switch immediately; the Lambert/Standard split is decided when a model is built, so that
// part only reaches models rebuilt afterwards (arenas) or on the next reload.
export function refreshQuality(renderer, scene, quality) {
  setQuality(quality);
  configureRenderer(renderer);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.needsUpdate = true;
  scene.traverse(object => {
    if (object.isDirectionalLight && object.castShadow) {
      object.shadow.map?.dispose();
      object.shadow.map = null;
      tuneSunShadow(object);
    }
    // Toggling shadows changes the shader defines, so lit materials need a recompile.
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach(material => { material.needsUpdate = true; });
  });
}

// Nothing is post-processed: the palette is bright enough that a bloom pass lights up the
// walls along with the tracers, so 高 spends its budget on resolution and shadows instead.
