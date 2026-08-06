export const ENEMY_WEAPONS = {
  pulse: { name: 'PULSE', color: 0xffbd67, speed: 25, damageScale: 1, pellets: 1, spread: 1, rate: .16, burst: 3, pause: .82, size: 1 },
  scatter: { name: 'SCATTER', color: 0xff765f, speed: 22, damageScale: .38, pellets: 5, spread: 2.5, rate: .52, burst: 1, pause: .52, size: 1.1 },
  rail: { name: 'RAIL', color: 0x64ecff, speed: 38, damageScale: 1.72, pellets: 1, spread: .42, rate: .78, burst: 1, pause: .62, size: .72 },
  cannon: { name: 'CANNON', color: 0xffd65f, speed: 17, damageScale: 1.5, pellets: 1, spread: 1.25, rate: .72, burst: 1, pause: .75, size: 1.8 },
};

export function enemyWeaponFor(key = 'pulse', hpRatio = 1) {
  if (key !== 'adaptive') return ENEMY_WEAPONS[key] || ENEMY_WEAPONS.pulse;
  if (hpRatio > .66) return ENEMY_WEAPONS.rail;
  if (hpRatio > .33) return ENEMY_WEAPONS.pulse;
  return ENEMY_WEAPONS.scatter;
}
