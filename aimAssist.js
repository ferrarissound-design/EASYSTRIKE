import * as THREE from 'three';
import { MOBILE_TUNING } from './mobileTuning.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export class AimAssist {
  constructor(camera, obstacles, getTargets, settings, tuning = MOBILE_TUNING.aim) {
    this.camera = camera;
    this.obstacles = obstacles;
    this.getTargets = getTargets;
    this.settings = settings;
    this.tuning = tuning;
    this.ray = new THREE.Raycaster();
    this.forward = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.target = null;
    this.targetWallClear = false;
    this.searchTimer = 0;
    this.retentionRemaining = 0;
    this.releaseRemaining = 0;
    this.breakRemaining = 0;
    this.debugState = this.emptyDebug();
  }

  emptyDebug() {
    return { target: 'NONE', angle: 0, limit: this.tuning.AssistAngle, distance: 0, strength: 0, wallClear: false, active: false };
  }

  clearTarget() {
    this.target = null;
    this.targetWallClear = false;
    this.retentionRemaining = 0;
    this.releaseRemaining = 0;
  }

  targetPoint(target) {
    return target.aimPoint?.clone?.() || target.group?.position?.clone?.() || null;
  }

  validTarget(target) {
    return !!target && target.alive !== false && target.group?.visible !== false && !target.gameEnded
      && !target.invincible && !target.spectating && target.team !== 'player';
  }

  inspect(target, angleLimit = this.tuning.AssistAngle, checkWall = true) {
    if (!this.validTarget(target)) return null;
    const point = this.targetPoint(target);
    if (!point) return null;
    this.direction.copy(point).sub(this.camera.position);
    const distance = this.direction.length();
    if (!distance || distance > this.tuning.MaxAssistDistance) return null;
    this.direction.divideScalar(distance);
    this.camera.getWorldDirection(this.forward);
    const angle = Math.acos(clamp(this.forward.dot(this.direction), -1, 1)) * 180 / Math.PI;
    if (angle > angleLimit) return null;
    let wallClear = this.targetWallClear;
    if (checkWall) {
      this.ray.set(this.camera.position, this.direction);
      const blocker = this.ray.intersectObjects(this.obstacles, false)[0];
      wallClear = !blocker || blocker.distance >= distance - .15;
    }
    if (!wallClear) return { target, point, distance, angle, wallClear, blocked: true };
    return { target, point, distance, angle, wallClear, blocked: false };
  }

  chooseTarget() {
    const candidates = (this.getTargets?.() || [])
      .map(target => this.inspect(target))
      .filter(candidate => candidate && !candidate.blocked)
      .sort((a, b) => (a.angle / this.tuning.AssistAngle + a.distance / this.tuning.MaxAssistDistance * .12)
        - (b.angle / this.tuning.AssistAngle + b.distance / this.tuning.MaxAssistDistance * .12));
    return candidates[0] || null;
  }

  update(dt, { touchInput, touchLooking, firing, look, active }) {
    this.searchTimer = Math.max(0, this.searchTimer - dt);
    this.retentionRemaining = Math.max(0, this.retentionRemaining - dt);
    this.releaseRemaining = Math.max(0, this.releaseRemaining - dt);
    this.breakRemaining = Math.max(0, this.breakRemaining - dt);
    if (this.target && !this.targetWallClear && this.releaseRemaining <= 0) this.clearTarget();
    const engaged = active && touchInput && (touchLooking || firing) && this.settings.aimAssistEnabled;
    if (!engaged) {
      this.debugState = { ...this.emptyDebug(), active: false };
      return { yaw: 0, pitch: 0, strength: 0, slowdown: 1 };
    }

    if (this.searchTimer <= 0) {
      const retained = this.target && this.inspect(this.target, this.tuning.AssistAngle * 1.12, true);
      if (retained && !retained.blocked) {
        this.targetWallClear = true;
        this.releaseRemaining = this.tuning.TargetReleaseTime;
      } else if (this.target) {
        this.targetWallClear = false;
      }
      const next = (!this.target || this.retentionRemaining <= 0) ? this.chooseTarget() : null;
      this.searchTimer = this.tuning.TargetSearchInterval;
      if (next && next.target !== this.target) {
        this.target = next.target;
        this.targetWallClear = true;
        this.retentionRemaining = this.tuning.TargetRetentionTime;
        this.releaseRemaining = this.tuning.TargetReleaseTime;
      }
    }

    const data = this.target && this.inspect(this.target, this.tuning.AssistAngle * 1.12, false);
    if (!data || !this.targetWallClear || this.breakRemaining > 0) {
      this.debugState = { ...this.emptyDebug(), active: true, wallClear: data?.wallClear || false };
      return { yaw: 0, pitch: 0, strength: 0, slowdown: 1 };
    }

    const desiredYaw = Math.atan2(-this.direction.x, -this.direction.z);
    const desiredPitch = Math.atan2(this.direction.y, Math.hypot(this.direction.x, this.direction.z));
    const yawDelta = normalizeAngle(desiredYaw - this.camera.rotation.y);
    const pitchDelta = desiredPitch - this.camera.rotation.x;
    const correctionX = yawDelta;
    const correctionY = pitchDelta;
    const lookMagnitude = Math.hypot(look.x, look.y);
    const userYaw = -look.x;
    const userPitch = -look.y;
    if (lookMagnitude > this.tuning.SwipeBreakThreshold && userYaw * correctionX + userPitch * correctionY < 0) {
      this.breakRemaining = this.tuning.SwipeBreakDuration;
      this.clearTarget();
      this.debugState = { ...this.emptyDebug(), active: true };
      return { yaw: 0, pitch: 0, strength: 0, slowdown: 1 };
    }

    const settingStrength = clamp((this.settings.aimAssistStrength || 0) / 100, 0, 1);
    const angleWeight = clamp(1 - data.angle / this.tuning.AssistAngle, 0, 1);
    const distanceWeight = 1 + (this.tuning.CloseRangeAssistMultiplier - 1)
      * clamp(1 - data.distance / this.tuning.MaxAssistDistance, 0, 1);
    const firingWeight = firing ? this.tuning.FiringMultiplier : 1;
    const strength = settingStrength * angleWeight * distanceWeight * firingWeight;
    const rate = this.tuning.AssistStrength * this.tuning.TrackingStrength * strength;
    const slowdown = 1 - (1 - this.tuning.SlowdownMultiplier) * settingStrength * angleWeight;
    this.debugState = {
      target: data.target.name || data.target.group?.name || 'RIVAL',
      angle: data.angle,
      limit: this.tuning.AssistAngle,
      distance: data.distance,
      strength,
      wallClear: data.wallClear,
      active: true,
    };
    return { yaw: yawDelta * rate, pitch: pitchDelta * rate, strength, slowdown };
  }
}
