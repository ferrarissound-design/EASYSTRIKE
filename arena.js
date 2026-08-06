import * as THREE from 'three';

export const ARENA_SIZE = 42;
export const PLAYER_SPAWN = new THREE.Vector3(0, 1.7, 16);
export const RIVAL_SPAWN = new THREE.Vector3(0, 0, -16);

export const ARENA_MAPS = {
  crossline: { id: 'crossline', name: 'クロスライン', short: 'バランス', detail: '3つのルートと使いやすい遮蔽物がある標準アリーナ' },
  pocket: { id: 'pocket', name: 'ポケット', short: '近距離', detail: '遮蔽物が多く、近距離戦が起きやすいアリーナ' },
  longshot: { id: 'longshot', name: 'ロングショット', short: '遠距離', detail: '長い射線と少ない安全地帯を持つ遠距離アリーナ' },
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
  studSource = new THREE.CanvasTexture(canvas);
  studSource.wrapS = studSource.wrapT = THREE.RepeatWrapping;
  studSource.colorSpace = THREE.SRGBColorSpace;
  return studSource;
}

export function createArena(scene, colliders, mapKey = 'crossline', sharedObstacles = []) {
  const root = new THREE.Group();
  root.name = `arena-${mapKey}`;
  const obstacles = sharedObstacles;
  colliders.length = 0;
  obstacles.length = 0;
  const material = color => new THREE.MeshLambertMaterial({ color, flatShading: true });
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

  add(new THREE.BoxGeometry(ARENA_SIZE, .5, ARENA_SIZE), COLOR.floor, 0, -.25, 0, false);
  const grid = new THREE.GridHelper(ARENA_SIZE, 14, COLOR.grid, COLOR.grid);
  grid.position.y = .025;
  grid.material.transparent = true;
  grid.material.opacity = .7;
  root.add(grid);

  // Team-colored spawn halves make orientation immediate without changing collision.
  [[0, -10, COLOR.red], [0, 10, COLOR.blue]].forEach(([x, z, color]) => {
    const zone = add(new THREE.PlaneGeometry(40, 20), color, x, .012, z, false);
    zone.rotation.x = -Math.PI / 2;
    zone.material.transparent = true;
    zone.material.opacity = .09;
    zone.material.depthWrite = false;
  });

  [[0, -21, 0, COLOR.red], [0, 21, Math.PI, COLOR.blue], [-21, 0, Math.PI / 2, COLOR.ink], [21, 0, -Math.PI / 2, COLOR.ink]].forEach(([x, z, rotation, color]) => {
    const wall = outline(add(new THREE.BoxGeometry(ARENA_SIZE, WALL_HEIGHT, .7), color, x, WALL_HEIGHT / 2, z, true, rotation));
    const trim = new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE, .45, .9), material(COLOR.white));
    trim.position.set(0, WALL_HEIGHT / 2 - .35, 0);
    wall.add(trim);
  });

  // Every layout is rotationally symmetric so neither spawn gets a geometry advantage.
  mirroredBlock(0, 13, 6, 1.2, 1.2, COLOR.blockDark);
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
    mirroredBlock(-14, 1.5, 3.5, 3.2, 2, COLOR.blockDark);
    mirroredBlock(14, 1.5, 3.5, 1.3, 2, COLOR.block);
    mirroredBlock(-5.5, 6, 2.2, 1.4, 2.2, COLOR.block);
    block(0, 0, 2.6, 1.15, 2.6, COLOR.white, Math.PI / 4);
  } else {
    mirroredBlock(-7.5, 14.5, 4, 2.6, 3, COLOR.blue);
    mirroredBlock(7.5, 14.5, 4, 2.6, 3, COLOR.block);
    mirroredBlock(0, 6.5, 4.2, 1.45, 2.2, COLOR.block);
    mirroredBlock(-10, 7, 2.6, 3, 5.5, COLOR.blockDark);
    mirroredBlock(10, 7, 2.6, 3, 5.5, COLOR.block);
    mirroredBlock(-14.5, 1.5, 5, 2, 1.2, COLOR.block);
    mirroredBlock(14.5, 1.5, 5, 2, 1.2, COLOR.blockDark);
    block(0, 0, 5.2, 1.35, 5.2, COLOR.white, Math.PI / 4);
    mirroredBlock(-6.5, 0, 2.4, 2.4, 2.4, COLOR.blockDark);
  }

  const sky = new THREE.SphereGeometry(70, 18, 12);
  const skyColors = [];
  const vertices = sky.attributes.position;
  const zenith = new THREE.Color(0x438be0);
  const horizon = new THREE.Color(0xe3f1ff);
  for (let index = 0; index < vertices.count; index++) {
    const height = Math.max(0, Math.min(1, vertices.getY(index) / 70 * 1.5 + .2));
    const color = horizon.clone().lerp(zenith, height);
    skyColors.push(color.r, color.g, color.b);
  }
  sky.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
  root.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));

  root.add(new THREE.HemisphereLight(0xe6f2ff, 0x7b86a7, 1.75));
  const sun = new THREE.DirectionalLight(0xfff7ef, 1.65);
  sun.position.set(8, 18, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  root.add(sun);
  [[-13, 7, -10, 0x4f91ff], [13, 7, 10, 0xff5d91]].forEach(([x, y, z, color]) => {
    const light = new THREE.PointLight(color, 220, 26, 2);
    light.position.set(x, y, z);
    root.add(light);
  });

  scene.add(root);
  return { root, obstacles, map: ARENA_MAPS[mapKey] || ARENA_MAPS.crossline };
}
