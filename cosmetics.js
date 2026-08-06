export const COSMETICS = [
  { id: 'finish-default', category: 'finish', name: 'パルスブルー', detail: '標準の武器カラー', cost: 0, color: null },
  { id: 'finish-sunset', category: 'finish', name: 'サンセット', detail: '鮮やかなピンクの武器カラー', cost: 2, color: 0xff5b9d },
  { id: 'finish-gold', category: 'finish', name: '王者のゴールド', detail: '輝くゴールドの武器カラー', cost: 4, color: 0xffd24a },
  { id: 'finish-zero', category: 'finish', name: 'ゼロシフト', detail: 'サーキット王者の武器カラー', cost: 0, color: 0xff4f91, exclusive: true },
  { id: 'impact-default', category: 'impact', name: 'クラシック', detail: '武器カラーに合った命中エフェクト', cost: 0, color: null },
  { id: 'impact-mint', category: 'impact', name: 'ミントバースト', detail: 'ミント色の弾道と命中エフェクト', cost: 2, color: 0x52ffc4 },
  { id: 'impact-violet', category: 'impact', name: 'ボイドバースト', detail: '紫色の弾道と命中エフェクト', cost: 3, color: 0xb57bff },
  { id: 'title-default', category: 'title', name: 'ファーストブラスト', detail: '標準のリザルト称号', cost: 0, label: 'ファーストブラスト' },
  { id: 'title-clutch', category: 'title', name: 'クラッチプレイヤー', detail: 'リザルト画面に表示する称号', cost: 3, label: 'クラッチプレイヤー' },
  { id: 'title-ace', category: 'title', name: 'アリーナエース', detail: 'リザルト画面に表示する称号', cost: 5, label: 'アリーナエース' },
  { id: 'title-circuit', category: 'title', name: 'サーキットブレイカー', detail: '5人のサーキットライバルを全員倒す', cost: 0, label: 'サーキットブレイカー', exclusive: true },
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
    if (item.exclusive && !this.isOwned(id)) return { ok: false, reason: 'exclusive', item };
    if (!this.isOwned(id)) {
      if (!wallet.spend(item.cost)) return { ok: false, reason: 'keys', item };
      this.data.owned.push(id);
    }
    this.data.selected[item.category] = id;
    this.save();
    return { ok: true, item };
  }

  grant(id) {
    const item = COSMETICS.find(candidate => candidate.id === id);
    if (!item) return null;
    if (!this.isOwned(id)) this.data.owned.push(id);
    this.save();
    return item;
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
