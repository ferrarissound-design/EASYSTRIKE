import * as THREE from 'three';
import { surfaceMaterial, tuneSunShadow, ambientFill, tuneTexture } from './graphics.js';

export const ARENA_SIZE = 42;
export const PLAYER_SPAWN = new THREE.Vector3(0, 1.7, 16);
export const RIVAL_SPAWN = new THREE.Vector3(0, 0, -16);

export const ARENA_MAPS = {
  crossline: { id: 'crossline', name: 'クロスライン', short: 'バランス', detail: '3つのルートと使いやすい遮蔽物がある標準アリーナ' },
  pocket: { id: 'pocket', name: 'ポケット', short: '近距離', detail: '遮蔽物が多く、近距離戦が起きやすいアリーナ' },
  longshot: { id: 'longshot', name: 'ロングショット', short: '遠距離', detail: '長い射線と少ない安全地帯を持つ遠距離アリーナ' },
  summit: { id: 'summit', name: 'サミット', short: '雪山', detail: '雪山の中央基地を風車状の壁が囲む、狙撃レーン付きの大型ステージ' },
};

export function loadArenaMap() {
  const value = localStorage.getItem('firstBlastArenaMap');
  return ARENA_MAPS[value] ? value : 'crossline';
}

export function destroyArena(scene, root) {
  if (!root) return;
  scene.remove(root);
  root.traverse(object => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach(entry => { entry.map?.dispose?.(); entry.dispose?.(); });
  });
}

const WALL_HEIGHT = 8;
const COLOR = {
  floor: 0xf2f4fa,
  grid: 0xb5bfd4,
  blue: 0x477ee8,
  red: 0xe14a78,
  ink: 0x253253,
  block: 0xdfe5f1,
  blockDark: 0xaebbd5,
  white: 0xf8fbff,
};

// Snow-summit theme: brighter concrete, icy accents and steel catwalks.
const SNOW = {
  floor: 0xfbfdff,
  grid: 0xd3e2f5,
  panel: 0xeff5ff,
  steel: 0xbccbe2,
  ice: 0xcfeaff,
  blue: 0x3b7ee6,
  red: 0xf0466f,
  cliff: 0xccdcf1,
};

// Roughness per palette entry, so steel, ice and concrete catch the sun differently
// instead of every block reading as the same matte plastic.
const SURFACES = {
  [COLOR.floor]: { roughness: .94, envMapIntensity: .18 },
  [COLOR.white]: { roughness: .88, envMapIntensity: .24 },
  [COLOR.blockDark]: { roughness: .74, envMapIntensity: .3 },
  [COLOR.ink]: { roughness: .6, metalness: .18, envMapIntensity: .4 },
  [SNOW.floor]: { roughness: .96, envMapIntensity: .16 },
  [SNOW.panel]: { roughness: .8, envMapIntensity: .26 },
  [SNOW.steel]: { roughness: .42, metalness: .5, envMapIntensity: .75 },
  [SNOW.ice]: { roughness: .16, metalness: .1, envMapIntensity: .95 },
  [SNOW.cliff]: { roughness: .92, envMapIntensity: .2 },
};

const THEMES = {
  default: {
    floor: COLOR.floor, grid: COLOR.grid, gridDivisions: 14, gridOpacity: .7,
    wallEnd: [COLOR.red, COLOR.blue], wallSide: COLOR.ink, trim: COLOR.white,
    zenith: 0x438be0, horizon: 0xe3f1ff,
    hemiSky: 0xe6f2ff, hemiGround: 0x7b86a7, hemi: .5,
    sun: 0xfff7ef, sunIntensity: 3.15, sunPosition: [11, 13, 9],
    points: [[-13, 7, -10, 0x4f91ff], [13, 7, 10, 0xff5d91]],
  },
  summit: {
    floor: SNOW.floor, grid: SNOW.grid, gridDivisions: 21, gridOpacity: .34,
    wallEnd: [SNOW.red, SNOW.blue], wallSide: SNOW.steel, trim: SNOW.panel,
    zenith: 0x2c78d8, horizon: 0xf4fbff,
    hemiSky: 0xf3faff, hemiGround: 0x9fb2d0, hemi: .58,
    sun: 0xfffdf4, sunIntensity: 3.35, sunPosition: [-13, 14, 8],
    points: [[-12, 6, 9, 0x63a8ff], [12, 6, -9, 0xff6f9c]],
  },
};

let snowSource;
// Speckled overlay so the flat snow floor still reads as a surface at sniper range.
function snowPattern() {
  if (snowSource) return snowSource;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  for (let index = 0; index < 220; index++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    context.fillStyle = index % 3 ? 'rgba(206,225,247,.3)' : 'rgba(255,255,255,.9)';
    context.beginPath();
    context.arc(x, y, 1 + Math.random() * 1.8, 0, Math.PI * 2);
    context.fill();
  }
  context.strokeStyle = 'rgba(196,218,244,.55)';
  context.lineWidth = 2;
  context.strokeRect(0, 0, size, size);
  snowSource = tuneTexture(new THREE.CanvasTexture(canvas));
  snowSource.wrapS = snowSource.wrapT = THREE.RepeatWrapping;
  return snowSource;
}

let cloudSource;
function cloudPattern() {
  if (cloudSource) return cloudSource;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, size * .08, size / 2, size / 2, size * .5);
  gradient.addColorStop(0, 'rgba(255,255,255,.95)');
  gradient.addColorStop(.55, 'rgba(255,255,255,.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  cloudSource = tuneTexture(new THREE.CanvasTexture(canvas));
  return cloudSource;
}

let studSource;
function studPattern() {
  if (studSource) return studSource;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.beginPath();
  context.arc(size / 2, size / 2, size * .24, 0, Math.PI * 2);
  context.fillStyle = '#dfe4ee';
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = '#ffffff';
  context.stroke();
  studSource = tuneTexture(new THREE.CanvasTexture(canvas));
  studSource.wrapS = studSource.wrapT = THREE.RepeatWrapping;
  return studSource;
}

export function createArena(scene, colliders, mapKey = 'crossline', sharedObstacles = []) {
  const root = new THREE.Group();
  root.name = `arena-${mapKey}`;
  root.userData.jumpPads = [];
  const obstacles = sharedObstacles;
  colliders.length = 0;
  obstacles.length = 0;
  const material = color => surfaceMaterial(color, SURFACES[color] || { roughness: .82 });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: COLOR.ink, transparent: true, opacity: .32 });

  const add = (geometry, color, x, y, z, solid = true, rotationY = 0) => {
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    if (solid) {
      colliders.push(new THREE.Box3().setFromObject(mesh));
      obstacles.push(mesh);
    }
    return mesh;
  };

  const outline = mesh => {
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMaterial));
    return mesh;
  };

  const studded = mesh => {
    const top = material(mesh.material.color.getHex());
    top.map = studPattern().clone();
    top.map.needsUpdate = true;
    const { width = 1, depth = 1 } = mesh.geometry.parameters;
    top.map.repeat.set(Math.max(1, Math.round(width / 1.4)), Math.max(1, Math.round(depth / 1.4)));
    mesh.geometry.groups.forEach(group => { group.materialIndex = group.materialIndex === 2 ? 1 : 0; });
    mesh.material = [mesh.material, top];
    return mesh;
  };

  const block = (x, z, width, height, depth, color = COLOR.block, rotation = 0) =>
    studded(outline(add(new THREE.BoxGeometry(width, height, depth), color, x, height / 2, z, true, rotation)));

  const mirroredBlock = (x, z, width, height, depth, color = COLOR.block, rotation = 0) => {
    block(x, z, width, height, depth, color, rotation);
    block(-x, -z, width, height, depth, color, rotation);
  };

  // Overhead pieces stop bullets and sight lines but carry no movement collider, so they
  // never become a rooftop the ground-bound rival cannot follow the player onto.
  const beam = (x, y, z, width, height, depth, color = COLOR.block, rotation = 0) => {
    const mesh = outline(add(new THREE.BoxGeometry(width, height, depth), color, x, y, z, false, rotation));
    obstacles.push(mesh);
    return mesh;
  };

  // Scenery outside the play space: no collider, no shadow cost.
  const decor = (geometry, color, x, y, z, rotationY = 0) => {
    const mesh = add(geometry, color, x, y, z, false, rotationY);
    mesh.castShadow = mesh.receiveShadow = false;
    return mesh;
  };

  const theme = THEMES[mapKey] || THEMES.default;
  const summit = mapKey === 'summit';

  add(new THREE.BoxGeometry(ARENA_SIZE, .5, ARENA_SIZE), theme.floor, 0, -.25, 0, false);
  if (summit) {
    const snow = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
      surfaceMaterial(SNOW.floor, { roughness: .96, flatShading: false, map: snowPattern().clone() }),
    );
    snow.material.map.needsUpdate = true;
    snow.material.map.repeat.set(12, 12);
    snow.rotation.x = -Math.PI / 2;
    snow.position.y = .005;
    snow.receiveShadow = true;
    root.add(snow);
  }
  const grid = new THREE.GridHelper(ARENA_SIZE, theme.gridDivisions, theme.grid, theme.grid);
  grid.position.y = .025;
  grid.material.transparent = true;
  grid.material.opacity = theme.gridOpacity;
  root.add(grid);

  // Team-colored spawn halves make orientation immediate without changing collision.
  const [endRed, endBlue] = theme.wallEnd;
  [[0, -10, endRed], [0, 10, endBlue]].forEach(([x, z, color]) => {
    const zone = add(new THREE.PlaneGeometry(40, 20), color, x, .012, z, false);
    zone.rotation.x = -Math.PI / 2;
    zone.material.transparent = true;
    zone.material.opacity = summit ? .07 : .09;
    zone.material.depthWrite = false;
  });

  [[0, -21, 0, endRed], [0, 21, Math.PI, endBlue], [-21, 0, Math.PI / 2, theme.wallSide], [21, 0, -Math.PI / 2, theme.wallSide]].forEach(([x, z, rotation, color]) => {
    const wall = outline(add(new THREE.BoxGeometry(ARENA_SIZE, WALL_HEIGHT, .7), color, x, WALL_HEIGHT / 2, z, true, rotation));
    const trim = new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE, .45, .9), material(theme.trim));
    trim.position.set(0, WALL_HEIGHT / 2 - .35, 0);
    wall.add(trim);
    if (!summit) return;
    // Vertical seams turn the flat wall into the paneled hall the reference maps use.
    for (let index = -6; index <= 6; index++) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(.28, WALL_HEIGHT - 1.4, .95), material(SNOW.panel));
      seam.position.set(index * 3.1, -.5, 0);
      wall.add(seam);
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE, 1.1, 1.05), material(SNOW.steel));
    base.position.set(0, -WALL_HEIGHT / 2 + .55, 0);
    wall.add(base);
  });

  // Every layout is rotationally symmetric so neither spawn gets a geometry advantage.
  mirroredBlock(0, 13, 6, 1.2, 1.2, summit ? SNOW.steel : COLOR.blockDark);
  if (mapKey === 'pocket') {
    mirroredBlock(-6.5, 12.5, 4.5, 2.8, 4.5, COLOR.blue);
    mirroredBlock(6.5, 9, 3.2, 2.5, 5, COLOR.block);
    mirroredBlock(-11, 5, 5, 2.7, 2.2, COLOR.blockDark, Math.PI / 8);
    mirroredBlock(11, 2.5, 4, 2.2, 2.4, COLOR.block, -Math.PI / 8);
    block(0, 0, 7, 2.3, 3, COLOR.white, Math.PI / 4);
    mirroredBlock(-4.5, 2.5, 2.3, 2.8, 2.3, COLOR.blockDark);
  } else if (mapKey === 'longshot') {
    mirroredBlock(-13.5, 14, 3.5, 2.7, 3, COLOR.blue);
    mirroredBlock(13.5, 10, 3, 2, 2.5, COLOR.block);
    mirroredBlock(-14, 1.5, 3.5, 3, 2, COLOR.blockDark);
    mirroredBlock(14, 1.5, 3.5, 1.3, 2, COLOR.block);
    mirroredBlock(-5.5, 6, 2.2, 1.4, 2.2, COLOR.block);
    block(0, 0, 2.6, 1.15, 2.6, COLOR.white, Math.PI / 4);
  } else if (summit) {
    // SUMMIT固有の移動ギミック。外周から高所ルートへ素早く移れる。
    [15, -15].forEach(z => {
      const pad = add(new THREE.CylinderGeometry(1.15, 1.3, .12, 24), SNOW.ice, 0, .06, z, false);
      pad.material.emissive = new THREE.Color(0x55cfff);
      pad.material.emissiveIntensity = .45;
      root.userData.jumpPads.push(new THREE.Vector3(0, 0, z));
    });
    // Pinwheel core: the two long walls break every spawn-to-spawn line while leaving
    // a diagonal rotation route open, the way the reference map's central base plays.
    mirroredBlock(-3, 4, 9, 3.6, 2.4, SNOW.panel);
    block(0, 0, 1.4, 2.9, 1.4, SNOW.ice);
    mirroredBlock(6.5, 1.5, 2.6, 2.4, 2.6, SNOW.steel, Math.PI / 4);
    // Sniper lanes down both flanks, each with one gap to rotate through.
    mirroredBlock(-11.5, 7.5, 2.4, 3, 8, SNOW.steel);
    mirroredBlock(11.5, 9.5, 2.4, 2.2, 5, SNOW.panel);
    // Outer ridge cover for long-range trades.
    mirroredBlock(16.5, 5, 3, 4.6, 3, SNOW.panel);
    // Spawn approach.
    mirroredBlock(-16.5, 12, 4.5, 2.6, 3, SNOW.blue);
    mirroredBlock(-5.5, 12, 2.6, 2.6, 2.6, SNOW.steel, Math.PI / 4);
    mirroredBlock(4, 8, 5, 1.3, 2, SNOW.panel);
    // Climbing routes onto the tall pieces. Each tread runs the full length of the face it
    // serves and sits flush against it, and every tall piece carries one on both long sides,
    // so the rival meets a step wherever it walks up — its steering has no pathfinding and
    // will not go looking for a ramp around the corner.
    mirroredBlock(-3, 5.9, 9, 1.7, 1.4, SNOW.steel);
    mirroredBlock(-3, 1.5, 9, 1.7, 1.4, SNOW.steel);
    mirroredBlock(16.5, 8, 3, 2.4, 3, SNOW.panel);
    mirroredBlock(16.5, 1.7, 3, 2.4, 3.6, SNOW.panel);

    // Overhead gantries on their support columns. The beams clear both hitboxes, so
    // they only stop stray high shots while giving the hall its vertical scale.
    [-8.5, 8.5].forEach(z => {
      beam(0, 5.95, z, 40, .55, 1.2, SNOW.steel);
      // Columns hug the side walls. Anything further in would pinch the rival between
      // the column and the nearest cover, which its three-way steering cannot escape.
      [-19, 19].forEach(x => block(x, z, .5, 5.7, .5, SNOW.steel));
    });
    [[-17.5, -17.5], [17.5, -17.5], [-17.5, 17.5], [17.5, 17.5]].forEach(([x, z]) => {
      outline(add(new THREE.CylinderGeometry(.22, .3, 7, 8), SNOW.steel, x, 3.5, z));
      const lamp = beam(x, 7.1, z, 1.5, .5, 1.1, SNOW.ice);
      lamp.material.emissive = new THREE.Color(0xbfe6ff);
    });
    // Team banners on the end walls.
    [[0, 20.5, Math.PI, SNOW.blue], [0, -20.5, 0, SNOW.red]].forEach(([x, z, rotation, color]) => {
      const banner = decor(new THREE.PlaneGeometry(9, 4.4), color, x, 5.2, z, rotation);
      banner.material.side = THREE.DoubleSide;
    });
    // Snow banks packed into the gutter between the play space and the walls.
    mirroredBlock(20.2, 12, 1.2, 1.1, 9, SNOW.floor);
    mirroredBlock(20.2, -1, 1.2, .7, 8, SNOW.floor);
    mirroredBlock(-12, 20.2, 10, .9, 1.2, SNOW.floor);
  } else {
    mirroredBlock(-7.5, 14.5, 4, 2.6, 3, COLOR.blue);
    mirroredBlock(7.5, 14.5, 4, 2.6, 3, COLOR.block);
    mirroredBlock(0, 6.5, 4.2, 1.45, 2.2, COLOR.block);
    mirroredBlock(-10, 7, 2.6, 3, 5.5, COLOR.blockDark);
    mirroredBlock(10, 7, 2.6, 3, 5.5, COLOR.block);
    mirroredBlock(-14.5, 1.5, 5, 2, 1.2, COLOR.block);
    mirroredBlock(14.5, 1.5, 5, 2, 1.2, COLOR.blockDark);
    block(0, 0, 5.2, 2.2, 5.2, COLOR.white, Math.PI / 4);
    mirroredBlock(-6.5, 0, 2.4, 2.4, 2.4, COLOR.blockDark);
  }

  if (summit) {
    // Peaks and clouds beyond the walls: they read as distance without adding draw weight.
    [[-44, 34, -38, 22], [-8, 42, -54, 30], [29, 30, -47, 19], [52, 29, -6, 16],
     [42, 36, 32, 24], [4, 31, 54, 20], [-36, 32, 42, 21], [-54, 28, 8, 15]]
      .forEach(([x, height, z, radius], index) => {
        const spin = index * .7;
        decor(new THREE.ConeGeometry(radius, height, 5), SNOW.cliff, x, height / 2 - 6, z, spin);
        // Cap radius matches the ridge width at 70% height so it reads as snow, not a hat.
        decor(new THREE.ConeGeometry(radius * .3, height * .32, 5), SNOW.floor, x, height * .86 - 6, z, spin);
      });
    const cloudMaterial = new THREE.MeshBasicMaterial({
      map: cloudPattern().clone(), transparent: true, opacity: .85, depthWrite: false, fog: false,
    });
    cloudMaterial.map.needsUpdate = true;
    [[-30, 28, -38, 24], [24, 31, -36, 20], [40, 26, 18, 22], [-36, 24, 30, 18], [0, 34, -48, 28]]
      .forEach(([x, y, z, size]) => {
        const cloud = new THREE.Mesh(new THREE.PlaneGeometry(size, size * .45), cloudMaterial);
        cloud.position.set(x, y, z);
        cloud.lookAt(0, y, 0);
        root.add(cloud);
      });
  }

  const sky = new THREE.SphereGeometry(70, 18, 12);
  const skyColors = [];
  const vertices = sky.attributes.position;
  const zenith = new THREE.Color(theme.zenith);
  const horizon = new THREE.Color(theme.horizon);
  for (let index = 0; index < vertices.count; index++) {
    const height = Math.max(0, Math.min(1, vertices.getY(index) / 70 * 1.5 + .2));
    const color = horizon.clone().lerp(zenith, height);
    skyColors.push(color.r, color.g, color.b);
  }
  sky.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
  root.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));

  root.add(new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.hemi));
  const fill = ambientFill();
  if (fill) root.add(new THREE.AmbientLight(theme.hemiSky, fill));
  const sun = new THREE.DirectionalLight(theme.sun, theme.sunIntensity);
  // Pushed out along the same direction so the shadow frustum clears the tall pieces.
  sun.position.set(...theme.sunPosition).normalize().multiplyScalar(46);
  sun.castShadow = true;
  tuneSunShadow(sun, 30);
  root.add(sun);
  theme.points.forEach(([x, y, z, color]) => {
    const light = new THREE.PointLight(color, 40, 20, 2);
    light.position.set(x, y, z);
    root.add(light);
  });

  scene.add(root);
  return { root, obstacles, map: ARENA_MAPS[mapKey] || ARENA_MAPS.crossline };
}
