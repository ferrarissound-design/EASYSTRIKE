import assert from 'node:assert/strict';
import { findPath } from '../navigation.js';

const blocked = (x, z) => x === 0 && Math.abs(z) < 5;
const path = findPath({ x: -5, z: 0 }, { x: 5, z: 0 }, blocked, { cell: 2.5, limit: 10 });
assert.ok(path.length > 0);
assert.ok(path.every(point => !blocked(point.x, point.z)));
assert.equal(path.at(-1).x, 5);
assert.equal(path.at(-1).z, 0);
assert.deepEqual(findPath({ x: 0, z: 0 }, { x: 0, z: 0 }, () => false), []);

console.log('Enemy navigation path checks passed');
