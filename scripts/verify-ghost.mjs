import assert from 'node:assert/strict';
import { GhostRecorder } from '../ghost.js';

class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.get(key) || null; }
  setItem(key, value) { this.data.set(key, value); }
}

const storage = new MemoryStorage();
const recorder = new GhostRecorder(storage);
const player = { position: { x: 1, y: 1.7, z: 2 }, yaw: .5 };
for (let index = 0; index < 20; index++) {
  player.position.x += .1;
  recorder.update(.05, player);
}
recorder.finish();
const frames = new GhostRecorder(storage).load();
assert.ok(frames.length >= 9 && frames.length <= 11);
assert.equal(frames[0].length, 5);
assert.ok(frames.at(-1)[1] > frames[0][1]);

console.log('Range ghost recording checks passed');
