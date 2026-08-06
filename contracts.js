export const CONTRACTS = [
  { id: 'rounds', stat: 'roundsWon', title: 'ラウンドハンター', detail: 'ラウンドを5本取る', target: 5, reward: 1 },
  { id: 'heads', stat: 'headshots', title: 'ヘッドライン', detail: 'ヘッドショットを10回決める', target: 10, reward: 1 },
  { id: 'slides', stat: 'slides', title: 'ローフライヤー', detail: 'スライドを15回使う', target: 15, reward: 1 },
  { id: 'utility', stat: 'utilityHits', title: 'ツールマスター', detail: '道具を5回命中させる', target: 5, reward: 2 },
  { id: 'matches', stat: 'matchesWon', title: '連勝への一歩', detail: 'デュエルで3勝する', target: 3, reward: 3 },
  { id: 'range', stat: 'rangeHits', title: 'ウォームアップ', detail: '射撃場で25回命中させる', target: 25, reward: 1 },
];

const STORAGE_KEY = 'firstBlastContractsV1';

export class ContractTracker {
  constructor() {
    const empty = { keys: 0, stats: {}, claimed: {} };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      this.data = { ...empty, ...saved, stats: { ...empty.stats, ...(saved.stats || {}) }, claimed: { ...empty.claimed, ...(saved.claimed || {}) } };
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
    const completed = [];
    CONTRACTS.filter(contract => contract.stat === stat).forEach(contract => {
      if ((this.data.stats[stat] || 0) >= contract.target && !this.data.claimed[contract.id]) {
        this.data.claimed[contract.id] = true;
        this.data.keys += contract.reward;
        completed.push(contract);
      }
    });
    this.save();
    return completed;
  }

  progress(contract) {
    return Math.min(contract.target, this.data.stats[contract.stat] || 0);
  }

  save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); }
}
