export const GEARS = [
  { id: 'quick-hands', name: '高速装填', icon: '>>', detail: 'リロード速度が35%アップ', modifiers: { reloadSpeed: 1.54 } },
  { id: 'air-step', name: '空中ステップ', icon: 'UP', detail: '空中ジャンプを1回追加', modifiers: { airJumps: 1 } },
  { id: 'hunter', name: 'ハンター', icon: '◎', detail: '命中したライバルを2.5秒間表示', modifiers: { reveal: true } },
  { id: 'heavy-round', name: '強装弾', icon: '◆', detail: 'ダメージ+18%、連射速度-12%', modifiers: { damage: 1.18, fireRate: .88 } },
  { id: 'second-wind', name: 'セカンドウィンド', icon: '+', detail: 'HP30%未満で移動速度+24%', modifiers: { lowHealthSpeed: 1.24 } },
  { id: 'gravity-shot', name: '重力弾', icon: 'G', detail: '命中したライバルを押し出す', modifiers: { gravityShot: true } },
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
