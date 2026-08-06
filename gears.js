export const GEARS = [
  { id: 'quick-hands', name: 'QUICK HANDS', icon: '>>', detail: 'Reload 35% faster', modifiers: { reloadSpeed: 1.54 } },
  { id: 'air-step', name: 'AIR STEP', icon: 'UP', detail: 'Gain one mid-air jump', modifiers: { airJumps: 1 } },
  { id: 'hunter', name: 'HUNTER', icon: '◎', detail: 'Hits reveal the rival for 2.5s', modifiers: { reveal: true } },
  { id: 'heavy-round', name: 'HEAVY ROUND', icon: '◆', detail: '+18% damage, -12% fire rate', modifiers: { damage: 1.18, fireRate: .88 } },
  { id: 'second-wind', name: 'SECOND WIND', icon: '+', detail: '+24% speed below 30 HP', modifiers: { lowHealthSpeed: 1.24 } },
  { id: 'gravity-shot', name: 'GRAVITY SHOT', icon: 'G', detail: 'Hits push the rival off their line', modifiers: { gravityShot: true } },
];

export class GearDraft {
  constructor() { this.reset(); }

  reset() { this.owned = []; }
  get complete() { return this.owned.length >= 3; }
  has(id) { return this.owned.some(gear => gear.id === id); }

  choices() {
    const pool = GEARS.filter(gear => !this.has(gear.id));
    for (let index = pool.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[swap]] = [pool[swap], pool[index]];
    }
    return pool.slice(0, 3);
  }

  add(id) {
    const gear = GEARS.find(candidate => candidate.id === id);
    if (!gear || this.has(id) || this.complete) return null;
    this.owned.push(gear);
    return gear;
  }

  modifiers() {
    return this.owned.reduce((combined, gear) => ({ ...combined, ...gear.modifiers }), {
      reloadSpeed: 1,
      fireRate: 1,
      damage: 1,
      airJumps: 0,
      lowHealthSpeed: 1,
      reveal: false,
      gravityShot: false,
    });
  }
}
