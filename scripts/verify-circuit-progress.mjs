import assert from 'node:assert/strict';
import { CircuitProgress } from '../circuit.js';

class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.get(key) || null; }
  setItem(key, value) { this.data.set(key, value); }
}

const storage = new MemoryStorage();
let now = 1000;
const progress = new CircuitProgress(storage, () => now);

progress.start();
now += 2300;
progress.recordWin(0, 1);
assert.equal(progress.data.run.stage, 1);
assert.equal(progress.data.run.runKeys, 1);
assert.equal(progress.elapsed(), 2300);

now += 700;
progress.pause();
now += 5000;
assert.equal(progress.elapsed(), 3000, 'paused time must not count');

const restored = new CircuitProgress(storage, () => now);
const run = restored.resume();
assert.equal(run.stage, 1);
assert.equal(run.runKeys, 1);
now += 1200;
assert.equal(restored.elapsed(), 4200);

restored.recordWin(4, 9);
const elapsed = restored.complete();
assert.equal(elapsed, 4200);
assert.equal(restored.hasRun, false);
assert.equal(restored.data.bestStage, 5);
assert.equal(restored.data.bestTime, 4200);

console.log('Circuit persistence checks passed');
