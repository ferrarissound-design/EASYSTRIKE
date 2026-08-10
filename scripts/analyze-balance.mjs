import { BALANCE_DISTANCES, createBalanceReport } from '../balance.js';
import { DIFFICULTIES } from '../difficulty.js';
import { ENEMY_WEAPONS } from '../enemyWeapons.js';
import { GEARS } from '../gears.js';
import { LOADOUT_OPTIONS } from '../weapon.js';

const report = createBalanceReport({ loadoutOptions: LOADOUT_OPTIONS, enemyWeapons: ENEMY_WEAPONS, difficulties: DIFFICULTIES, gears: GEARS });

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log('PLAYER WEAPONS — body-shot projection against 100 HP');
console.table(report.playerWeapons.map(weapon => ({
  weapon: weapon.id,
  slot: weapon.slot,
  closeDamage: weapon.ranges.close.damage,
  intendedRange: weapon.intendedDistance,
  intendedTtk: weapon.intendedTtk?.seconds ?? '—',
  midTtk: weapon.ranges.mid.ttk?.seconds ?? '—',
  farTtk: weapon.ranges.far.ttk?.seconds ?? '—',
  intendedDps: weapon.intendedSustainedDps || '—',
})));

console.log(`ENEMY PRESSURE — projected TTK against 100 HP (accuracy-weighted, reaction included)`);
console.table(Object.entries(report.enemyPressure).flatMap(([difficulty, weapons]) =>
  Object.entries(weapons).map(([weapon, metrics]) => ({
    difficulty,
    weapon,
    volleyDamage: metrics.volleyDamage,
    pressureDps: metrics.pressureDps,
    projectedTtk: metrics.projectedTtk,
  }))));

console.log(`GEAR IMPACT — ${LOADOUT_OPTIONS.primary[0].id} at ${BALANCE_DISTANCES.mid}m`);
console.table(report.gearImpact);
