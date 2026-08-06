import * as THREE from 'three';
import { JumpController } from './jumpController.js';
import { MOBILE_TUNING } from './mobileTuning.js';
import { bodyBlocked, ceilingAbove, supportBelow, STEP_HEIGHT } from './collision.js';

// 足元からの目線の高さ。position は目線の位置、feetY が足元の高さで、
// 縦の判定はすべて feetY 側で行う。
const STANDING_EYE = 1.7;
const CROUCH_EYE = 1.12;
const STANDING_HEIGHT = 1.8;
const CROUCH_HEIGHT = 1.2;
const RADIUS = .45;
const ARENA_LIMIT = 19.8;

export class Player {
  constructor(camera, colliders, effects, audio, settings) {
    this.camera = camera;
    this.colliders = colliders;
    this.effects = effects;
    this.audio = audio;
    this.settings = settings;
    this.position = new THREE.Vector3(0, STANDING_EYE, 16);
    this.feetY = 0;
    this.eyeOffset = STANDING_EYE;
    this.velocity = new THREE.Vector3();
    this.yaw = this.pitch = 0;
    this.maxHp = this.hp = 100;
    this.grounded = true;
    this.crouched = this.sliding = this.sprinting = false;
    this.slideTimer = 0;
    this.slideDirection = new THREE.Vector3();
    this.wasCrouch = false;
    this.remainingAirJumps = 0;
    this.jumpController = new JumpController(settings);
    this.modifiers = { airJumps: 0, lowHealthSpeed: 1 };
    this.onSlide = null;
    camera.position.copy(this.position);
  }

  configure(maxHp = 100) {
    this.maxHp = maxHp;
    this.hp = maxHp;
  }

  setModifiers(modifiers = {}) {
    this.modifiers = { airJumps: modifiers.airJumps || 0, lowHealthSpeed: modifiers.lowHealthSpeed || 1 };
  }

  get bodyHeight() { return this.sliding || this.crouched ? CROUCH_HEIGHT : STANDING_HEIGHT; }
  get targetEyeOffset() { return this.sliding || this.crouched ? CROUCH_EYE : STANDING_EYE; }

  respawn(spawn = new THREE.Vector3(0, STANDING_EYE, 16), yaw = 0) {
    this.position.copy(spawn);
    this.feetY = 0;
    this.eyeOffset = STANDING_EYE;
    this.position.y = STANDING_EYE;
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.hp = this.maxHp;
    this.grounded = true;
    this.crouched = this.sliding = this.sprinting = false;
    this.slideTimer = 0;
    this.wasCrouch = false;
    this.jumpController.reset();
    this.remainingAirJumps = this.modifiers.airJumps;
    this.camera.rotation.set(0, yaw, 0, 'YXZ');
    this.camera.position.copy(this.position);
  }

  update(dt, input, look, aim = { yaw: 0, pitch: 0, slowdown: 1 }) {
    this.yaw -= look.x * (aim.slowdown ?? 1);
    this.yaw += (aim.yaw || 0) * dt;
    this.pitch = Math.max(-1.35, Math.min(1.35,
      this.pitch - look.y * (aim.slowdown ?? 1) + (aim.pitch || 0) * dt));
    look.x = look.y = 0;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = forward.clone().multiplyScalar(input.y).add(right.multiplyScalar(input.x));
    if (wish.length() > 1) wish.normalize();

    const crouchPressed = input.crouch && !this.wasCrouch;
    this.wasCrouch = input.crouch;
    if (crouchPressed && this.grounded && wish.lengthSq() > .08 && !this.sliding) {
      this.sliding = true;
      this.slideTimer = .68;
      this.slideDirection.copy(wish).normalize();
      this.onSlide?.();
      this.audio.play('slide');
      this.effects.burst(this.position.clone().setY(this.feetY + .12), 0xb7d8ff, 5, .1, .28);
    }

    if (this.sliding) {
      this.slideTimer -= dt;
      const slideSpeed = 7.8 + Math.max(0, this.slideTimer) * 6.5;
      this.velocity.x = this.slideDirection.x * slideSpeed;
      this.velocity.z = this.slideDirection.z * slideSpeed;
      if (this.slideTimer <= 0 || !this.grounded) this.sliding = false;
    } else {
      this.crouched = !!input.crouch;
      this.sprinting = !!input.sprint && !this.crouched && wish.lengthSq() > .1 && !input.aim;
      let speed = this.crouched ? 4.4 : this.sprinting ? 9.1 : 7;
      if (this.hp / this.maxHp < .3) speed *= this.modifiers.lowHealthSpeed;
      if (input.aim) speed *= .78;
      const targetX = wish.x * speed;
      const targetZ = wish.z * speed;
      if (this.grounded) {
        this.velocity.x = targetX;
        this.velocity.z = targetZ;
      } else {
        const control = Math.min(1, MOBILE_TUNING.movement.AirControl * dt);
        this.velocity.x += (targetX - this.velocity.x) * control;
        this.velocity.z += (targetZ - this.velocity.z) * control;
      }
    }

    const jump = this.jumpController.update(dt, {
      held: input.jump,
      grounded: this.grounded,
      airJumps: this.remainingAirJumps,
    });
    if (jump.jump) {
      if (jump.airJump) this.remainingAirJumps--;
      this.velocity.y = MOBILE_TUNING.movement.JumpForce;
      this.grounded = false;
      this.sliding = false;
      this.crouched = false;
      this.audio.play('jump');
      this.effects.burst(this.position.clone().setY(this.feetY + .12), jump.airJump ? 0x76eaff : 0xd9d0b7, 4, .14, .28);
    }

    this.velocity.y -= MOBILE_TUNING.movement.Gravity * dt;
    this.moveAxis('x', this.velocity.x * dt);
    this.moveAxis('z', this.velocity.z * dt);
    this.resolveVertical(dt);

    // 目線は足元からの相対値。しゃがみ・立ちの切り替えだけを滑らかにする。
    const targetOffset = this.targetEyeOffset;
    this.eyeOffset += (targetOffset - this.eyeOffset) * Math.min(1, dt * 16);
    if (Math.abs(this.eyeOffset - targetOffset) < .01) this.eyeOffset = targetOffset;
    this.position.y = this.feetY + this.eyeOffset;

    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.position.copy(this.position);
  }

  // 落下・着地・頭ぶつけを解決する。遮蔽物の天面に乗れるのはここの support 判定による。
  resolveVertical(dt) {
    const height = this.bodyHeight;
    const nextFeet = this.feetY + this.velocity.y * dt;
    if (this.velocity.y > 0) {
      const ceiling = ceilingAbove(this.colliders, this.position.x, this.position.z, this.feetY + height, RADIUS);
      if (nextFeet + height > ceiling) {
        this.feetY = ceiling - height;
        this.velocity.y = 0;
      } else {
        this.feetY = nextFeet;
      }
      this.grounded = false;
      return;
    }

    // 立っている高さから STEP_HEIGHT までを足場候補にすることで、低い段差は歩いて登れる。
    const support = supportBelow(this.colliders, this.position.x, this.position.z, this.feetY + STEP_HEIGHT, RADIUS);
    if (nextFeet <= support) {
      const landed = !this.grounded && this.velocity.y < -6;
      this.feetY = support;
      this.velocity.y = 0;
      this.grounded = true;
      this.remainingAirJumps = this.modifiers.airJumps;
      if (landed) this.effects.burst(this.position.clone().setY(support + .1), 0xd9d0b7, 4, .12, .26);
    } else {
      this.feetY = nextFeet;
      this.grounded = false;
    }
  }

  jumpDebug() {
    return this.jumpController.debug(this.grounded, this.remainingAirJumps);
  }

  moveAxis(axis, distance) {
    this.position[axis] += distance;
    // 接地中だけ足元を STEP_HEIGHT ぶん持ち上げて判定し、低い縁は歩いて越えられるようにする。
    const from = this.feetY + (this.grounded ? STEP_HEIGHT : 0);
    const blocked = Math.abs(this.position.x) > ARENA_LIMIT || Math.abs(this.position.z) > ARENA_LIMIT
      || bodyBlocked(this.colliders, this.position.x, this.position.z, from, this.feetY + this.bodyHeight, RADIUS);
    if (blocked) {
      this.position[axis] -= distance;
      if (this.sliding) this.slideTimer = 0;
    }
  }

  takeDamage(amount) {
    const before = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    return before - this.hp;
  }
}
