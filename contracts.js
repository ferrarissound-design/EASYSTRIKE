export const CONTRACTS = [
  { id: 'rounds', stat: 'roundsWon', title: 'ラウンドハンター', detail: 'ラウンドを5本取る', target: 5, reward: 1 },
  { id: 'heads', stat: 'headshots', title: 'ヘッドライン', detail: 'ヘッドショットを10回決める', target: 10, reward: 1 },
  { id: 'slides', stat: 'slides', title: 'ローフライヤー', detail: 'スライドを15回使う', target: 15, reward: 1 },
  { id: 'utility', stat: 'utilityHits', title: 'ツールマスター', detail: '道具を5回命中させる', target: 5, reward: 2 },
  { id: 'matches', stat: 'matchesWon', title: '連勝への一歩', detail: 'デュエルで3勝する', target: 3, reward: 3 },
  { id: 'range', stat: 'rangeHits', title: 'ウォームアップ', detail: '射撃場で25回命中させる', target: 25, reward: 1 },
];

const DAILY_POOL = [
  { id: 'rounds', stat: 'roundsWon', title: '本日：ラウンド奪取', detail: 'ラウンドを3本取る', target: 3, reward: 1 },
  { id: 'heads', stat: 'headshots', title: '本日：精密射撃', detail: 'ヘッドショットを4回決める', target: 4, reward: 1 },
  { id: 'slides', stat: 'slides', title: '本日：高速移動', detail: 'スライドを6回使う', target: 6, reward: 1 },
  { id: 'utility', stat: 'utilityHits', title: '本日：道具活用', detail: '道具を2回命中させる', target: 2, reward: 1 },
  { id: 'damage', stat: 'damage', title: '本日：火力試験', detail: '合計500ダメージを与える', target: 500, reward: 1 },
];

function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dailyContracts(day = dayKey()) {
  const offset = [...day].reduce((sum, character) => sum + character.charCodeAt(0), 0) % DAILY_POOL.length;
  return Array.from({ length: 3 }, (_, index) => {
    const contract = DAILY_POOL[(offset + index * 2) % DAILY_POOL.length];
    return { ...contract, id: `daily-${day}-${contract.id}`, daily: true };
  });
}

export function activeContracts(day = dayKey()) {
  return [...CONTRACTS, ...dailyContracts(day)];
}

const STORAGE_KEY = 'firstBlastContractsV1';

export class ContractTracker {
  constructor() {
    const today = dayKey();
    const empty = { keys: 0, stats: {}, claimed: {}, daily: { day: today, stats: {}, claimed: {} } };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      this.data = { ...empty, ...saved, stats: { ...empty.stats, ...(saved.stats || {}) }, claimed: { ...empty.claimed, ...(saved.claimed || {}) } };
      if (this.data.daily?.day !== today) this.data.daily = { day: today, stats: {}, claimed: {} };
    } catch {
      this.data = empty;
    }
  }

  get keys() { return this.data.keys; }

  spend(amount) {
    if (amount < 0 || this.data.keys < amount) return false;
    this.data.keys -= amount;
    this.save();
    return true;
  }

  earn(amount = 1) {
    if (amount <= 0) return;
    this.data.keys += amount;
    this.save();
  }

  record(stat, amount = 1) {
    this.data.stats[stat] = (this.data.stats[stat] || 0) + amount;
    this.data.daily.stats[stat] = (this.data.daily.stats[stat] || 0) + amount;
    const completed = [];
    activeContracts(this.data.daily.day).filter(contract => contract.stat === stat).forEach(contract => {
      const stats = contract.daily ? this.data.daily.stats : this.data.stats;
      const claimed = contract.daily ? this.data.daily.claimed : this.data.claimed;
      if ((stats[stat] || 0) >= contract.target && !claimed[contract.id]) {
        claimed[contract.id] = true;
        this.data.keys += contract.reward;
        completed.push(contract);
      }
    });
    this.save();
    return completed;
  }

  progress(contract) {
    const stats = contract.daily ? this.data.daily.stats : this.data.stats;
    return Math.min(contract.target, stats[contract.stat] || 0);
  }

  save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); }
}
