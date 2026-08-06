import assert from 'node:assert/strict';
import { JumpController } from '../jumpController.js';

const settings = { autoJump: true };
const state = (held, grounded, airJumps = 0) => ({ held, grounded, sliding: false, airJumps });

const coyote = new JumpController(settings);
coyote.update(.016, state(false, true));
assert.equal(coyote.update(.05, state(true, false)).jump, true, 'coyote jump should fire after leaving ground');

const buffered = new JumpController(settings);
buffered.update(.2, state(false, false));
assert.equal(buffered.update(.016, state(true, false)).jump, false, 'air input should be buffered');
assert.equal(buffered.update(.05, state(false, true)).jump, true, 'buffered input should fire on landing');

const auto = new JumpController(settings);
assert.equal(auto.update(.016, state(true, true)).jump, true, 'held jump should fire immediately');
assert.equal(auto.update(.1, state(true, false)).jump, false, 'held jump should not create an air jump');
assert.equal(auto.update(.1, state(true, true)).jump, true, 'held jump should repeat after landing');

const slideCancel = new JumpController(settings);
assert.equal(slideCancel.update(.016, { ...state(true, true), sliding: true }).jump, true, 'jump should cancel a slide immediately');

console.log('Mobile jump timing checks passed');
