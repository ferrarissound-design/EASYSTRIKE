import assert from 'node:assert/strict';
import { BALANCE_DISTANCES, createBalanceReport, playerShotDamage, playerSustainedDps, playerTimeToDefeat } from '../balance.js';
import { DIFFICULTIES } from '../difficulty.js';
import { ENEMY_WEAPONS } from '../enemyWeapons.js';
import { GEARS } from '../gears.js';
import { LOADOUT_OPTIONS } from '../weapon.js';

const report = createBalanceReport({ loadoutOptions: LOADOUT_OPTIONS, enemyWeapons: ENEMY_WEAPONS, difficulties: DIFFICULTIES, gears: GEARS });
const definitions = Object.entries(LOADOUT_OPTIONS).flatMap(([slot, weapons]) => weapons.map(weapon => ({ ...weapon, slot })));
const offensive = definitions.filter(weapon => weapon.damage > 0);

assert.equal(report.playerWeapons.length, definitions.length);
assert.equal(new Set(definitions.map(weapon => weapon.id)).size, definitions.length);

for (const weapon of offensive) {
  const distance = weapon.melee ? Math.min(2, weapon.range) : weapon.pellets ? BALANCE_DISTANCES.close : BALANCE_DISTANCES.mid;
  const damage = playerShotDamage(weapon, distance);
  const ttk = playerTimeToDefeat(weapon, 100, distance);
  assert.ok(damage > 0 && damage < 100, `${weapon.id} should deal meaningful, non-one-shot body damage`);
  assert.ok(ttk && ttk.seconds <= 2.2, `${weapon.id} should defeat 100 HP within 2.2s in its intended range`);
  if (Number.isFinite(weapon.ammo)) assert.ok(ttk.shots <= weapon.ammo, `${weapon.id} should defeat 100 HP within one magazine`);
}

assert.ok(playerShotDamage(LOADOUT_OPTIONS.primary[1], BALANCE_DISTANCES.close)
  > playerShotDamage(LOADOUT_OPTIONS.primary[1], BALANCE_DISTANCES.far));

for (const weapon of Object.keys(ENEMY_WEAPONS)) {
  const easy = report.enemyPressure.easy[weapon].projectedTtk;
  const normal = report.enemyPressure.normal[weapon].projectedTtk;
  const challenge = report.enemyPressure.challenge[weapon].projectedTtk;
  assert.ok(easy > normal && normal > challenge, `${weapon} pressure should increase with difficulty`);
  assert.ok(challenge >= 2.5, `${weapon} should leave a minimum reaction window on challenge`);
}

const pulse = LOADOUT_OPTIONS.primary[0];
const heavy = GEARS.find(gear => gear.id === 'heavy-round').modifiers;
const quickHands = GEARS.find(gear => gear.id === 'quick-hands').modifiers;
const baselineDps = playerSustainedDps(pulse, BALANCE_DISTANCES.mid);
assert.ok(playerSustainedDps(pulse, BALANCE_DISTANCES.mid, heavy) <= baselineDps * 1.08, 'heavy-round should remain a sidegrade');
assert.ok(playerSustainedDps(pulse, BALANCE_DISTANCES.mid, quickHands) > baselineDps, 'quick-hands should improve sustained output');

console.log('Weapon, difficulty, and gear balance checks passed');
