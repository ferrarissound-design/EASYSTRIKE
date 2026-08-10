import assert from 'node:assert/strict';
import { activeContracts, dailyContracts } from '../contracts.js';

const today = dailyContracts('2026-08-10');
const repeat = dailyContracts('2026-08-10');
const tomorrow = dailyContracts('2026-08-11');
assert.equal(today.length, 3);
assert.deepEqual(today.map(item => item.id), repeat.map(item => item.id));
assert.notDeepEqual(today.map(item => item.id), tomorrow.map(item => item.id));
assert.equal(activeContracts('2026-08-10').length, 9);
assert.ok(today.every(item => item.daily && item.reward === 1));

console.log('Daily contract rotation checks passed');
