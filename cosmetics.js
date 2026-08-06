export const COSMETICS = [
  { id: 'finish-default', category: 'finish', name: 'PULSE BLUE', detail: 'Original weapon finish', cost: 0, color: null },
  { id: 'finish-sunset', category: 'finish', name: 'SUNSET', detail: 'Hot pink weapon finish', cost: 2, color: 0xff5b9d },
  { id: 'finish-gold', category: 'finish', name: 'CHAMPION GOLD', detail: 'Gold weapon finish', cost: 4, color: 0xffd24a },
  { id: 'impact-default', category: 'impact', name: 'CLASSIC', detail: 'Weapon-matched impact color', cost: 0, color: null },
  { id: 'impact-mint', category: 'impact', name: 'MINT BURST', detail: 'Mint tracers and impacts', cost: 2, color: 0x52ffc4 },
  { id: 'impact-violet', category: 'impact', name: 'VOID BURST', detail: 'Violet tracers and impacts', cost: 3, color: 0xb57bff },
  { id: 'title-default', category: 'title', name: 'FIRST BLAST', detail: 'Default result title', cost: 0, label: 'FIRST BLAST' },
  { id: 'title-clutch', category: 'title', name: 'CLUTCH PLAYER', detail: 'Result-screen player title', cost: 3, label: 'CLUTCH PLAYER' },
  { id: 'title-ace', category: 'title', name: 'ARENA ACE', detail: 'Result-screen player title', cost: 5, label: 'ARENA ACE' },
];

const STORAGE_KEY = 'firstBlastCosmeticsV1';
const DEFAULTS = { finish: 'finish-default', impact: 'impact-default', title: 'title-default' };

export class CosmeticLocker {
  constructor() {
    const base = { owned: Object.values(DEFAULTS), selected: { ...DEFAULTS } };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      this.data = { owned: [...new Set([...base.owned, ...(saved.owned || [])])], selected: { ...base.selected, ...(saved.selected || {}) } };
    } catch {
      this.data = base;
    }
    Object.entries(this.data.selected).forEach(([category, id]) => {
      if (!this.isOwned(id) || !COSMETICS.some(item => item.id === id && item.category === category)) this.data.selected[category] = DEFAULTS[category];
    });
  }

  isOwned(id) { return this.data.owned.includes(id); }
  selected(category) { return COSMETICS.find(item => item.id === this.data.selected[category]) || COSMETICS.find(item => item.id === DEFAULTS[category]); }

  unlockAndSelect(id, wallet) {
    const item = COSMETICS.find(candidate => candidate.id === id);
    if (!item) return { ok: false, reason: 'missing' };
    if (!this.isOwned(id)) {
      if (!wallet.spend(item.cost)) return { ok: false, reason: 'keys', item };
      this.data.owned.push(id);
    }
    this.data.selected[item.category] = id;
    this.save();
    return { ok: true, item };
  }

  loadout() {
    return {
      finishColor: this.selected('finish').color,
      impactColor: this.selected('impact').color,
      title: this.selected('title').label,
    };
  }

  save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); }
}
