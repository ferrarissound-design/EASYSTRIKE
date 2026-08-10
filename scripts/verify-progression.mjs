import assert from 'node:assert/strict';
import { createDailyChallenge, DailyProgress, localDayKey } from '../daily.js';
import { WeaponMastery } from '../mastery.js';

class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.get(key) || null; }
  setItem(key, value) { this.data.set(key, value); }
}

assert.equal(localDayKey(new Date(2026, 7, 10)), '2026-08-10');
const first = createDailyChallenge('2026-08-10');
const repeat = createDailyChallenge('2026-08-10');
assert.deepEqual(first.rivals.map(rival => rival.id), repeat.rivals.map(rival => rival.id));
assert.equal(first.rivals.length, 3);
assert.equal(new Set(first.rivals.map(rival => rival.name)).size, 3);

const dailyStorage = new MemoryStorage();
const today = new DailyProgress('2026-08-10', dailyStorage, () => 1000);
today.start();
today.recordWin(0, 1);
assert.equal(today.data.bestStage, 1);
const tomorrow = new DailyProgress('2026-08-11', dailyStorage, () => 2000);
assert.equal(tomorrow.data.bestStage, 0);
assert.equal(tomorrow.hasRun, false);

const masteryStorage = new MemoryStorage();
const mastery = new WeaponMastery(masteryStorage);
mastery.recordShot('pulse-rifle');
mastery.recordDamage('pulse-rifle', 480, true);
assert.equal(mastery.summary('pulse-rifle').level, 2);
assert.equal(mastery.entry('pulse-rifle').kills, 1);
assert.equal(new WeaponMastery(masteryStorage).xp('pulse-rifle'), 585);

console.log('Daily challenge and mastery checks passed');
