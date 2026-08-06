import * as THREE from 'three';

const STANDING_EYE = 1.7;
const CROUCH_EYE = 1.12;

export class Player {
  constructor(camera, colliders, effects, audio) {
    this.camera = camera;
    this.colliders = colliders;
    this.effects = effects;
    this.audio = audio;
    this.position = new THREE.Vector3(0, STANDING_EYE, 16);
    this.velocity = new THREE.Vector3();
    this.yaw = this.pitch = 0;
    this.maxHp = this.hp = 100;
    this.grounded = true;
    this.crouched = this.sliding = this.sprinting = false;
    this.slideTimer = 0;
    this.slideDirection = new THREE.Vector3();
    this.wasCrouch = false;
    this.wasJump = false;
    this.remainingAirJumps = 0;
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

  respawn(spawn = new THREE.Vector3(0, STANDING_EYE, 16), yaw = 0) {
    this.position.copy(spawn);
    this.position.y = STANDING_EYE;
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.hp = this.maxHp;
    this.grounded = true;
    this.crouched = this.sliding = this.sprinting = false;
    this.slideTimer = 0;
    this.wasCrouch = false;
    this.wasJump = false;
    this.remainingAirJumps = this.modifiers.airJumps;
    this.camera.rotation.set(0, yaw, 0, 'YXZ');
    this.camera.position.copy(this.position);
  }

  update(dt, input, look, aim = { x: 0, y: 0, strength: 0 }) {
    this.yaw -= look.x * (1 - aim.strength * .35) + aim.x * dt;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch - look.y * (1 - aim.strength * .35) + aim.y * dt));
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
      this.effects.burst(this.position.clone().setY(.12), 0xb7d8ff, 5, .1, .28);
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
      this.velocity.x = wish.x * speed;
      this.velocity.z = wish.z * speed;
    }

    const jumpPressed = input.jump && !this.wasJump;
    this.wasJump = input.jump;
    if (jumpPressed && (this.grounded || this.remainingAirJumps > 0) && !this.sliding) {
      const airJump = !this.grounded;
      if (airJump) this.remainingAirJumps--;
      this.velocity.y = 8.35;
      this.grounded = false;
      this.crouched = false;
      this.audio.play('jump');
      this.effects.burst(this.position.clone().setY(Math.max(.12, this.position.y - 1)), airJump ? 0x76eaff : 0xd9d0b7, 4, .14, .28);
    }

    this.velocity.y -= 22 * dt;
    this.moveAxis('x', this.velocity.x * dt);
    this.moveAxis('z', this.velocity.z * dt);

    const targetEye = this.sliding || this.crouched ? CROUCH_EYE : STANDING_EYE;
    if (this.grounded && this.velocity.y <= 0) {
      this.velocity.y = 0;
      this.position.y += (targetEye - this.position.y) * Math.min(1, dt * 16);
      if (Math.abs(this.position.y - targetEye) < .01) this.position.y = targetEye;
    } else {
      this.position.y += this.velocity.y * dt;
      if (this.position.y <= targetEye) {
        this.position.y = targetEye;
        this.velocity.y = 0;
        this.grounded = true;
        this.remainingAirJumps = this.modifiers.airJumps;
      } else {
        this.grounded = false;
      }
    }
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.position.copy(this.position);
  }

  moveAxis(axis, distance) {
    this.position[axis] += distance;
    const height = this.sliding || this.crouched ? 1.2 : 1.8;
    const box = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(this.position.x, height / 2, this.position.z),
      new THREE.Vector3(.9, height, .9),
    );
    if (Math.abs(this.position.x) > 19.8 || Math.abs(this.position.z) > 19.8 || this.colliders.some(collider => collider.intersectsBox(box))) {
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
