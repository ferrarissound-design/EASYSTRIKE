const STORAGE_KEY = 'firstBlastMasteryV1';
const THRESHOLDS = [0, 500, 1500, 3500, 7000];

export class WeaponMastery {
  constructor(storage = localStorage) {
    this.storage = storage;
    try { this.data = JSON.parse(storage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { this.data = {}; }
  }

  entry(id) {
    return this.data[id] || { shots: 0, hits: 0, damage: 0, kills: 0 };
  }

  xp(id) {
    const entry = this.entry(id);
    return Math.round(entry.damage + entry.hits * 5 + entry.kills * 100);
  }

  summary(id) {
    const xp = this.xp(id);
    const level = Math.min(THRESHOLDS.length, THRESHOLDS.filter(threshold => xp >= threshold).length);
    const next = THRESHOLDS[level] ?? null;
    return { level, xp, next, maxed: next === null };
  }

  recordShot(id) {
    if (!id) return;
    const entry = this.entry(id);
    entry.shots++;
    this.data[id] = entry;
    this.save();
  }

  recordDamage(id, damage, kill = false) {
    if (!id || damage <= 0) return;
    const entry = this.entry(id);
    entry.hits++;
    entry.damage += damage;
    if (kill) entry.kills++;
    this.data[id] = entry;
    this.save();
  }

  save() { this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data)); }
}
