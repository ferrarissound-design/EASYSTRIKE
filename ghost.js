import * as THREE from 'three';

const STORAGE_KEY = 'firstBlastRangeGhostV1';

export class GhostRecorder {
  constructor(storage = localStorage) { this.storage = storage; this.start(); }
  start() { this.frames = []; this.elapsed = 0; this.sampleTimer = 0; }
  update(dt, player) {
    this.elapsed += dt;
    this.sampleTimer -= dt;
    if (this.sampleTimer > 0) return;
    this.sampleTimer += .1;
    this.frames.push([this.elapsed, player.position.x, player.position.y, player.position.z, player.yaw]);
    if (this.frames.length > 900) this.frames.shift();
  }
  finish() {
    if (this.frames.length >= 2) this.storage.setItem(STORAGE_KEY, JSON.stringify(this.frames));
    return this.frames;
  }
  load() {
    try { return JSON.parse(this.storage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
}

export class MovementGhost {
  constructor(scene) {
    const material = new THREE.MeshBasicMaterial({ color: 0x66edff, transparent: true, opacity: .28, depthWrite: false });
    this.group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.05, .42), material);
    body.position.y = .8;
    const head = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .5), material);
    head.position.y = 1.55;
    this.group.add(body, head);
    this.group.visible = false;
    scene.add(this.group);
  }
  play(frames = []) { this.frames = frames; this.elapsed = 0; this.index = 0; this.group.visible = frames.length > 1; }
  stop() { this.group.visible = false; }
  update(dt) {
    if (!this.group.visible) return;
    this.elapsed += dt;
    while (this.index < this.frames.length - 2 && this.frames[this.index + 1][0] < this.elapsed) this.index++;
    const from = this.frames[this.index];
    const to = this.frames[this.index + 1];
    if (!to) { this.stop(); return; }
    const blend = Math.max(0, Math.min(1, (this.elapsed - from[0]) / Math.max(.001, to[0] - from[0])));
    this.group.position.set(
      from[1] + (to[1] - from[1]) * blend,
      from[2] - 1.7 + (to[2] - from[2]) * blend,
      from[3] + (to[3] - from[3]) * blend,
    );
    this.group.rotation.y = from[4] + (to[4] - from[4]) * blend;
  }
}
