export const BALANCE_DISTANCES = Object.freeze({ close: 5, mid: 12, far: 20 });

const round = (value, digits = 3) => Number(value.toFixed(digits));

export function playerShotDamage(definition, distance = 0, modifiers = {}) {
  if (!definition || definition.utility === 'heal') return 0;
  const pellets = definition.pellets || 1;
  const falloff = definition.pellets ? Math.max(.35, 1 - distance / 24) : 1;
  return definition.damage * pellets * falloff * (modifiers.damage || 1);
}

export function playerTimeToDefeat(definition, targetHp = 100, distance = 0, modifiers = {}) {
  const damage = playerShotDamage(definition, distance, modifiers);
  if (damage <= 0 || (definition.melee && distance > definition.range)) return null;
  const shots = Math.ceil(targetHp / damage);
  const rate = definition.rate / (modifiers.fireRate || 1);
  const finiteMagazine = Number.isFinite(definition.ammo);
  const reloads = finiteMagazine ? Math.floor((shots - 1) / definition.ammo) : 0;
  const reloadTime = reloads * (definition.reload || 0) / (modifiers.reloadSpeed || 1);
  return { shots, reloads, seconds: round((shots - 1) * rate + reloadTime) };
}

export function playerSustainedDps(definition, distance = 0, modifiers = {}) {
  const damage = playerShotDamage(definition, distance, modifiers);
  if (damage <= 0 || (definition.melee && distance > definition.range)) return 0;
  const rate = definition.rate / (modifiers.fireRate || 1);
  if (!Number.isFinite(definition.ammo)) return round(damage / rate);
  const cycle = definition.ammo * rate + (definition.reload || 0) / (modifiers.reloadSpeed || 1);
  return round(definition.ammo * damage / cycle);
}

export function analyzePlayerWeapon(definition, modifiers = {}) {
  const intendedDistance = definition.melee ? Math.min(2, definition.range)
    : definition.pellets ? BALANCE_DISTANCES.close
    : BALANCE_DISTANCES.mid;
  const ranges = Object.fromEntries(Object.entries(BALANCE_DISTANCES).map(([band, distance]) => {
    const damage = playerShotDamage(definition, distance, modifiers);
    return [band, {
      distance,
      damage: round(damage),
      sustainedDps: playerSustainedDps(definition, distance, modifiers),
      ttk: playerTimeToDefeat(definition, 100, distance, modifiers),
    }];
  }));
  return {
    id: definition.id,
    slot: definition.slot,
    ammo: Number.isFinite(definition.ammo) ? definition.ammo : null,
    heal: definition.heal || 0,
    intendedDistance,
    intendedTtk: playerTimeToDefeat(definition, 100, intendedDistance, modifiers),
    intendedSustainedDps: playerSustainedDps(definition, intendedDistance, modifiers),
    ranges,
  };
}

export function analyzeEnemyWeapon(config, weapon, targetHp = 100) {
  const burst = weapon.burst || 1;
  const shotDamage = Math.max(1, Math.round(config.attack * weapon.damageScale));
  const volleyDamage = shotDamage * weapon.pellets;
  const shotInterval = weapon.rate + config.reaction * .08;
  const cycleSeconds = burst * shotInterval + weapon.pause;
  const rawDps = volleyDamage * burst / cycleSeconds;
  const pressureDps = rawDps * config.accuracy;
  return {
    shotDamage,
    volleyDamage,
    burst,
    cycleSeconds: round(cycleSeconds),
    rawDps: round(rawDps),
    pressureDps: round(pressureDps),
    projectedTtk: round(config.reaction + targetHp / pressureDps),
  };
}

export function createBalanceReport({ loadoutOptions, enemyWeapons, difficulties, gears = [] }) {
  const playerWeapons = Object.entries(loadoutOptions).flatMap(([slot, definitions]) =>
    definitions.map(definition => analyzePlayerWeapon({ ...definition, slot })));
  const enemyPressure = Object.fromEntries(Object.entries(difficulties).map(([difficulty, config]) => [
    difficulty,
    Object.fromEntries(Object.entries(enemyWeapons).map(([weapon, definition]) => [
      weapon,
      analyzeEnemyWeapon(config, definition),
    ])),
  ]));
  const baseline = loadoutOptions.primary[0];
  const gearImpact = gears.filter(gear => gear.modifiers?.damage || gear.modifiers?.fireRate || gear.modifiers?.reloadSpeed)
    .map(gear => ({
      id: gear.id,
      sustainedDps: playerSustainedDps(baseline, BALANCE_DISTANCES.mid, gear.modifiers),
      baselineDps: playerSustainedDps(baseline, BALANCE_DISTANCES.mid),
    })).map(entry => ({ ...entry, deltaPercent: round((entry.sustainedDps / entry.baselineDps - 1) * 100, 1) }));
  return { targetHp: 100, distances: BALANCE_DISTANCES, playerWeapons, enemyPressure, gearImpact };
}
