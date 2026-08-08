import * as THREE from 'three';
import { surfaceMaterial } from './graphics.js';

export const SLOT_ORDER = ['primary', 'secondary', 'melee', 'utility'];
export const SLOT_LABELS = {
  primary: 'メイン武器', secondary: 'サブ武器', melee: '近接武器', utility: '道具',
};

export const LOADOUT_OPTIONS = {
  primary: [
    { id: 'pulse-rifle', name: 'パルスライフル', shortName: 'パルス', description: '安定した高速連射ライフル', ammo: 24, damage: 18, rate: .105, reload: 1.25, color: 0x6eeaff, sound: 'pulse', automatic: true, model: 'rifle' },
    { id: 'scatter-blaster', name: 'スキャッターブラスター', shortName: '散弾銃', description: '近距離で強い6発散弾', ammo: 6, damage: 13, rate: .72, reload: 1.45, color: 0xffa937, sound: 'spark', pellets: 6, spread: .07, model: 'scatter' },
  ],
  secondary: [
    { id: 'spark-pistol', name: 'スパークピストル', shortName: 'スパーク', description: '取り回しのよい精密ピストル', ammo: 12, damage: 27, rate: .27, reload: 1.05, color: 0xffd95e, sound: 'spark', model: 'pistol' },
    { id: 'bubble-sidearm', name: 'バブルサイドアーム', shortName: 'バブル', description: '低速の爆発弾を発射', ammo: 5, damage: 44, rate: .7, reload: 1.35, color: 0xa77bff, sound: 'bubble', projectile: 'bubble', model: 'bubble' },
  ],
  melee: [
    { id: 'energy-baton', name: 'エナジーバトン', shortName: 'バトン', description: '高威力の近接攻撃', ammo: Infinity, damage: 48, rate: .52, range: 2.8, color: 0x70f4ff, sound: 'melee', melee: true, model: 'baton' },
    { id: 'boost-blade', name: 'ブーストブレード', shortName: 'ブレード', description: '高速で振れる軽量ブレード', ammo: Infinity, damage: 35, rate: .32, range: 2.5, color: 0xff73c7, sound: 'melee', melee: true, model: 'blade' },
  ],
  utility: [
    { id: 'bounce-grenade', name: 'バウンドグレネード', shortName: 'グレネード', description: '跳ねて爆発する範囲攻撃', ammo: 2, damage: 62, rate: 1.1, color: 0x63ef9e, sound: 'grenade', projectile: 'grenade', model: 'grenade' },
    { id: 'heal-capsule', name: '回復カプセル', shortName: '回復', description: 'HPを45回復する', ammo: 1, damage: 0, heal: 45, rate: 1.2, color: 0x50ed7b, sound: 'heal', utility: 'heal', model: 'medkit' },
  ],
};

export const DEFAULT_LOADOUT = {
  primary: 'pulse-rifle', secondary: 'spark-pistol', melee: 'energy-baton', utility: 'bounce-grenade',
};

export function loadLoadout() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('firstBlastLoadout') || '{}'); } catch {}
  const result = {};
  SLOT_ORDER.forEach(slot => {
    result[slot] = LOADOUT_OPTIONS[slot].some(option => option.id === saved[slot]) ? saved[slot] : DEFAULT_LOADOUT[slot];
  });
  return result;
}

export function saveLoadout(loadout) {
  localStorage.setItem('firstBlastLoadout', JSON.stringify(loadout));
}

function definitionFor(slot, id) {
  const definition = LOADOUT_OPTIONS[slot].find(option => option.id === id) || LOADOUT_OPTIONS[slot][0];
  return { ...definition, slot, slotLabel: SLOT_LABELS[slot] };
}

const VIEW = { depth: 1.35, side: .52, drop: .94, scale: 1.12 };

export class Weapon {
  constructor(scene, camera, effects, audio, loadout = loadLoadout()) {
    this.scene = scene;
    this.camera = camera;
    this.effects = effects;
    this.audio = audio;
    this.index = 0;
    this.cooldowns = [0, 0, 0, 0];
    this.ammo = [0, 0, 0, 0];
    this.reloading = false;
    this.reloadToken = 0;
    this.ray = new THREE.Raycaster();
    this.rig = new THREE.Group();
    this.rig.scale.setScalar(VIEW.scale);
    camera.add(this.rig);
    this.base = new THREE.Vector3();
    this.sway = new THREE.Vector2();
    this.swayTarget = new THREE.Vector2();
    this.time = this.kick = this.drop = this.reloadBlend = this.aimBlend = 0;
    this.lastYaw = camera.rotation.y;
    this.lastPitch = camera.rotation.x;
    this.muzzleWorld = new THREE.Vector3();
    this.models = [];
    this.projectiles = Array.from({ length: 10 }, () => this.createProjectile());
    this.modifiers = { reloadSpeed: 1, fireRate: 1, damage: 1 };
    this.createHands();
    this.configureLoadout(loadout);
    this.layout();
  }

  get definition() { return this.definitions[this.index]; }
  get currentAmmo() { return Number.isFinite(this.ammo[this.index]) ? this.ammo[this.index] : '∞'; }
  get cooldownLabel() { return this.cooldowns[this.index] > .08 && (this.definition.melee || this.definition.utility) ? 'クールダウン' : ''; }

  setModifiers(modifiers = {}) {
    this.modifiers = {
      reloadSpeed: modifiers.reloadSpeed || 1,
      fireRate: modifiers.fireRate || 1,
      damage: modifiers.damage || 1,
    };
  }

  setCosmetics(cosmetics = {}) {
    this.cosmetics = { ...cosmetics };
    if (this.loadout) this.configureLoadout(this.loadout);
  }

  effectColor(definition) { return this.cosmetics?.impactColor ?? definition.color; }

  configureLoadout(loadout) {
    this.loadout = { ...loadout };
    this.definitions = SLOT_ORDER.map(slot => definitionFor(slot, loadout[slot]));
    this.models.forEach(model => model.removeFromParent());
    this.models = this.definitions.map((definition, index) => this.createModel(definition, index));
    this.refillAll();
    this.switch(Math.min(this.index, 3), true);
  }

  layout() {
    const halfHeight = Math.tan(this.camera.fov * Math.PI / 360) * VIEW.depth;
    const side = VIEW.side + Math.max(0, 1.4 - this.camera.aspect) * .12;
    this.base.set(halfHeight * this.camera.aspect * side, -halfHeight * VIEW.drop, -VIEW.depth);
  }

  // R6の腕は肘のない1本のブロックで、肌色そのまま。肩側だけシャツの赤い袖口が少し覗く
  // 見た目にして、enemy.jsの本家アバターと同じ色（肌0xf5cd30・シャツ0xc4281c）で揃える。
  createHands() {
    const skin = surfaceMaterial(0xf5cd30, { emissive: 0x2a2205, roughness: .78, envMapIntensity: .35 });
    const sleeve = surfaceMaterial(0xc4281c, { emissive: 0x2a0705, roughness: .78, envMapIntensity: .35 });
    const part = (geometry, material, x, y, z, rotation) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      if (rotation) mesh.rotation.set(...rotation);
      this.rig.add(mesh);
    };
    part(new THREE.BoxGeometry(.19, .19, .3), skin, .03, -.15, .15, [.42, 0, .1]);
    part(new THREE.BoxGeometry(.21, .21, .14), sleeve, .075, -.255, .3, [.42, 0, .1]);
    part(new THREE.BoxGeometry(.17, .17, .28), skin, -.065, -.11, -.15, [.28, 0, -.5]);
    part(new THREE.BoxGeometry(.19, .19, .13), sleeve, -.15, -.21, .02, [.28, 0, -.5]);
  }

  createModel(definition) {
    const group = new THREE.Group();
    const shellColor = this.cosmetics?.finishColor ?? definition.color;
    // 武器はケースを樹脂、金具を金属寄りにして、手元でハイライトが動くようにする。
    const shell = surfaceMaterial(shellColor, { emissive: shellColor, emissiveIntensity: .2, roughness: .34, metalness: .12, envMapIntensity: .8 });
    const dark = surfaceMaterial(0x303a60, { emissive: 0x0b1025, roughness: .3, metalness: .6, envMapIntensity: .9 });
    const part = (geometry, material, x, y, z, rotation) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      if (rotation) mesh.rotation.set(...rotation);
      group.add(mesh);
      return mesh;
    };
    if (definition.model === 'rifle') {
      part(new THREE.BoxGeometry(.17, .17, .55), shell, 0, 0, -.31);
      part(new THREE.BoxGeometry(.08, .06, .2), dark, 0, .12, -.23);
      part(new THREE.CylinderGeometry(.045, .045, .23, 8), shell, 0, 0, -.69, [Math.PI / 2, 0, 0]);
      group.userData.muzzle = new THREE.Vector3(0, 0, -.82);
    } else if (definition.model === 'scatter') {
      part(new THREE.BoxGeometry(.3, .18, .42), shell, 0, 0, -.3);
      [-.09, 0, .09].forEach(x => part(new THREE.CylinderGeometry(.035, .045, .2, 6), shell, x, 0, -.58, [Math.PI / 2, 0, 0]));
      group.userData.muzzle = new THREE.Vector3(0, 0, -.72);
    } else if (definition.model === 'pistol' || definition.model === 'bubble') {
      part(new THREE.BoxGeometry(.15, .16, .38), shell, 0, 0, -.23);
      part(new THREE.BoxGeometry(.13, .25, .13), dark, 0, -.18, -.08, [-.18, 0, 0]);
      if (definition.model === 'bubble') part(new THREE.TorusGeometry(.09, .025, 6, 10), dark, 0, 0, -.46);
      group.userData.muzzle = new THREE.Vector3(0, 0, -.55);
    } else if (definition.melee) {
      part(new THREE.BoxGeometry(.09, .09, .35), dark, 0, -.04, -.08);
      const blade = part(new THREE.BoxGeometry(.08, .05, .65), shell, 0, .02, -.55);
      blade.rotation.x = definition.model === 'blade' ? -.08 : 0;
      group.rotation.z = -.35;
      group.userData.muzzle = new THREE.Vector3(0, .02, -.86);
    } else {
      const geometry = definition.model === 'medkit' ? new THREE.BoxGeometry(.28, .22, .32) : new THREE.IcosahedronGeometry(.2, 1);
      part(geometry, shell, 0, 0, -.26);
      part(new THREE.BoxGeometry(.11, .18, .14), dark, 0, -.16, -.08);
      group.userData.muzzle = new THREE.Vector3(0, 0, -.5);
    }
    group.visible = false;
    this.rig.add(group);
    return group;
  }

  createProjectile() {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xb78aff, transparent: true, opacity: .88 }));
    mesh.visible = false;
    this.scene.add(mesh);
    return { mesh, active: false, velocity: new THREE.Vector3(), life: 0, gravity: 0, kind: '', definition: null };
  }

  switch(index, silent = false) {
    if (!this.definitions[index] || (this.index === index && !silent)) return;
    this.models.forEach(model => { model.visible = false; });
    this.index = index;
    this.models[index].visible = true;
    this.reloading = false;
    this.reloadToken++;
    this.drop = 1;
    if (!silent) this.audio.play('switch');
  }

  refillAll() {
    this.ammo = this.definitions.map(definition => definition.ammo);
    this.reloading = false;
    this.reloadToken++;
    this.cooldowns.fill(0);
    this.clearProjectiles();
  }

  reload() {
    const definition = this.definition;
    if (!Number.isFinite(definition.ammo) || this.reloading || this.ammo[this.index] === definition.ammo) return;
    this.reloading = true;
    const token = ++this.reloadToken;
    this.audio.play('reload');
    setTimeout(() => {
      if (token !== this.reloadToken) return;
      this.ammo[this.index] = definition.ammo;
      this.reloading = false;
    }, (definition.reload || 1.2) * 1000 / this.modifiers.reloadSpeed);
  }

  animate(dt, aiming) {
    this.time += dt;
    let turn = this.camera.rotation.y - this.lastYaw;
    if (turn > Math.PI) turn -= Math.PI * 2;
    if (turn < -Math.PI) turn += Math.PI * 2;
    const rise = this.camera.rotation.x - this.lastPitch;
    this.lastYaw = this.camera.rotation.y;
    this.lastPitch = this.camera.rotation.x;
    this.swayTarget.set(Math.max(-.05, Math.min(.05, turn * 1.5)), Math.max(-.04, Math.min(.04, -rise * 1.5)));
    this.sway.lerp(this.swayTarget, Math.min(1, dt * 7));
    this.swayTarget.multiplyScalar(Math.max(0, 1 - dt * 9));
    this.kick = Math.max(0, this.kick - this.kick * Math.min(1, dt * 11) - dt * .4);
    this.drop = Math.max(0, this.drop - dt * 3.4);
    this.reloadBlend += ((this.reloading ? 1 : 0) - this.reloadBlend) * Math.min(1, dt * 7);
    this.aimBlend += ((aiming && !this.definition.melee ? 1 : 0) - this.aimBlend) * Math.min(1, dt * 12);
    const targetFov = aiming && !this.definition.melee ? 66 : 78;
    const previousFov = this.camera.fov;
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 12);
    if (Math.abs(previousFov - this.camera.fov) > .01) { this.camera.updateProjectionMatrix(); this.layout(); }
    const breathY = Math.sin(this.time * 1.5) * .005;
    const aimX = -this.base.x * this.aimBlend * .86;
    this.rig.position.set(this.base.x + aimX + this.sway.x * (1 - this.aimBlend), this.base.y + breathY - this.drop * .2 - this.reloadBlend * .1, this.base.z + this.kick * .08 + this.aimBlend * .12);
    this.rig.rotation.set(-.1 + this.kick * .1 - this.sway.y * .6 - this.reloadBlend * .4, .14 - this.sway.x * .9, -.06 - this.drop * .45 + this.reloadBlend * .3);
  }

  update(dt, input, player, enemy, obstacles, handlers = {}) {
    this.cooldowns = this.cooldowns.map(value => Math.max(0, value - dt));
    this.animate(dt, input.aim);
    this.updateProjectiles(dt, enemy, obstacles, handlers);
    if (input.quickMelee) this.use(2, player, enemy, obstacles, handlers, true);
    if (input.quickUtility) this.use(3, player, enemy, obstacles, handlers, true);
    if (!input.fire || this.reloading) return;
    this.use(this.index, player, enemy, obstacles, handlers, false);
  }

  use(index, player, enemy, obstacles, handlers, quick) {
    const definition = this.definitions[index];
    const effectColor = this.effectColor(definition);
    if (!definition || this.cooldowns[index] > 0) return;
    if (Number.isFinite(this.ammo[index]) && this.ammo[index] <= 0) {
      if (index === this.index) this.reload();
      return;
    }
    this.cooldowns[index] = definition.rate / this.modifiers.fireRate;
    if (Number.isFinite(this.ammo[index])) this.ammo[index]--;
    handlers.onFire?.({ slot: definition.slot, utility: definition.slot === 'utility' });
    this.audio.play(definition.sound);
    this.kick = Math.min(1, this.kick + (definition.projectile ? .85 : definition.melee ? .35 : .55));
    const model = this.models[index];
    const muzzle = model.userData.muzzle || new THREE.Vector3(0, 0, -.5);
    model.localToWorld(this.muzzleWorld.copy(muzzle));
    this.effects.burst(this.muzzleWorld, effectColor, quick ? 3 : 2, .09, .14);

    if (definition.melee) this.fireMelee(definition, enemy, obstacles, handlers);
    else if (definition.utility === 'heal') this.useHeal(definition, player, handlers);
    else if (definition.projectile) this.fireProjectile(definition);
    else this.fireHitscan(definition, enemy, obstacles, handlers);
  }

  fireHitscan(definition, enemy, obstacles, handlers) {
    const effectColor = this.effectColor(definition);
    const count = definition.pellets || 1;
    let total = 0;
    let hitPoint = null;
    let headshot = false;
    for (let index = 0; index < count; index++) {
      const spread = definition.spread || 0;
      const offset = new THREE.Vector2((Math.random() - .5) * spread, (Math.random() - .5) * spread);
      this.ray.setFromCamera(offset, this.camera);
      const enemyHit = enemy.alive ? this.ray.intersectObject(enemy.group, true)[0] : null;
      const wallHit = this.ray.intersectObjects(obstacles, false)[0];
      const hitEnemy = enemyHit && (!wallHit || enemyHit.distance < wallHit.distance);
      const end = (hitEnemy ? enemyHit : wallHit)?.point || this.ray.ray.at(35, new THREE.Vector3());
      this.effects.tracer(this.muzzleWorld.clone(), end, effectColor);
      if (hitEnemy) {
        const isHead = enemyHit.object.userData.hitZone === 'head';
        const falloff = definition.pellets ? Math.max(.35, 1 - enemyHit.distance / 24) : 1;
        total += definition.damage * this.modifiers.damage * falloff * (isHead ? 1.5 : 1);
        headshot ||= isHead;
        hitPoint = enemyHit.point;
      } else if (wallHit) {
        this.effects.burst(wallHit.point, effectColor, 2, .08, .2);
      }
    }
    if (!total) return;
    const damage = Math.round(total);
    enemy.damage(damage);
    this.effects.burst(hitPoint, headshot ? 0xffdf55 : effectColor, 5, .1, .3);
    this.audio.play(headshot ? 'headshot' : 'hit');
    handlers.onDamage?.(damage, enemy.labelPoint, { headshot, kill: enemy.hp <= 0, utility: false, pushDirection: this.ray.ray.direction.clone() });
  }

  fireMelee(definition, enemy, obstacles, handlers) {
    this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const enemyHit = enemy.alive ? this.ray.intersectObject(enemy.group, true)[0] : null;
    const wallHit = this.ray.intersectObjects(obstacles, false)[0];
    if (!enemyHit || enemyHit.distance > definition.range || (wallHit && wallHit.distance < enemyHit.distance)) return;
    const damage = Math.round(definition.damage * this.modifiers.damage);
    enemy.damage(damage);
    this.effects.burst(enemyHit.point, this.effectColor(definition), 7, .11, .3);
    handlers.onDamage?.(damage, enemy.labelPoint, { melee: true, kill: enemy.hp <= 0, pushDirection: this.ray.ray.direction.clone() });
  }

  useHeal(definition, player, handlers) {
    const before = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + definition.heal);
    if (player.hp === before) {
      this.ammo[3]++;
      return;
    }
    this.effects.ring(player.position, this.effectColor(definition));
    handlers.onUtility?.('heal');
  }

  fireProjectile(definition) {
    const shot = this.projectiles.find(projectile => !projectile.active);
    if (!shot) return;
    shot.active = true;
    shot.kind = definition.projectile;
    shot.definition = definition;
    shot.life = definition.projectile === 'grenade' ? 1.35 : 3.5;
    shot.gravity = definition.projectile === 'grenade' ? 12 : 0;
    shot.mesh.material.color.set(this.effectColor(definition));
    shot.mesh.scale.setScalar(definition.projectile === 'grenade' ? 1 : 1.35);
    shot.mesh.visible = true;
    shot.mesh.position.copy(this.muzzleWorld);
    const speed = definition.projectile === 'grenade' ? 14 : 11;
    shot.velocity.set(0, definition.projectile === 'grenade' ? 2.3 : 0, -speed).applyQuaternion(this.camera.quaternion);
  }

  updateProjectiles(dt, enemy, obstacles, handlers) {
    for (const shot of this.projectiles) {
      if (!shot.active) continue;
      shot.life -= dt;
      shot.velocity.y -= shot.gravity * dt;
      shot.mesh.position.addScaledVector(shot.velocity, dt);
      const hitEnemy = enemy.alive && shot.mesh.position.distanceTo(enemy.aimPoint) < enemy.hitRadius;
      const hitWall = obstacles.some(object => (object.userData.collisionBox ||= new THREE.Box3().setFromObject(object)).distanceToPoint(shot.mesh.position) < .16);
      if (hitWall && shot.kind === 'grenade' && shot.life > .25) {
        shot.velocity.y = Math.abs(shot.velocity.y) * .55 + 1;
        shot.velocity.x *= .72;
        shot.velocity.z *= .72;
        shot.life = Math.min(shot.life, .55);
        continue;
      }
      if (!hitEnemy && !hitWall && shot.life > 0) continue;
      const radius = shot.kind === 'grenade' ? 5.2 : 4.2;
      const distance = enemy.alive ? shot.mesh.position.distanceTo(enemy.aimPoint) : Infinity;
      const damage = Math.max(0, Math.round(shot.definition.damage * this.modifiers.damage * (1 - distance / radius)));
      if (damage) {
        enemy.damage(damage);
        handlers.onDamage?.(damage, enemy.labelPoint, { utility: shot.kind === 'grenade', kill: enemy.hp <= 0, pushDirection: shot.velocity.clone().normalize() });
        if (shot.kind === 'grenade') handlers.onUtility?.('hit');
      }
      this.effects.burst(shot.mesh.position, this.effectColor(shot.definition), shot.kind === 'grenade' ? 18 : 12, .22, .55);
      shot.active = false;
      shot.mesh.visible = false;
    }
  }

  clearProjectiles() {
    this.projectiles.forEach(projectile => {
      projectile.active = false;
      projectile.mesh.visible = false;
    });
  }
}
