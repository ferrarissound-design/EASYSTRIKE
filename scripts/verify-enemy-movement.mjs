import assert from 'node:assert/strict';
import { resolveEnemyMove } from '../enemyMovement.js';

const origin = { x: 0, y: 0, z: 0 };
const forward = { x: 1, y: 0, z: 0 };

const clear = resolveEnemyMove(origin, forward, 1, () => false);
assert.deepEqual(clear, { position: { x: 1, y: 0, z: 0 }, moved: true, deflected: false });

const slide = resolveEnemyMove(origin, forward, 1, position => position.x > 0 || position.z > 0);
assert.deepEqual(slide, { position: { x: 0, y: 0, z: -1 }, moved: true, deflected: true });

const trapped = resolveEnemyMove(origin, forward, 1, () => true);
assert.deepEqual(trapped, { position: origin, moved: false, deflected: true });

console.log('Enemy movement collision checks passed');
