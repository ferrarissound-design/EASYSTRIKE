export const CIRCUIT_RIVALS = [
  {
    id: 'jet', name: 'ジェット', title: '突撃のライバル', quote: '距離を詰める。迷う暇はない。',
    style: 'brawler', map: 'pocket', weapon: 'scatter', firstTo: 3, reward: 1,
    color: '#ff6a55', weakness: '散弾の間合いから離れ、長いバースト後を狙え。',
    config: { enemyHp: 90, enemySpeed: 6.7, accuracy: .64, reaction: .44, attack: 15, assist: .58, jump: .08 },
  },
  {
    id: 'vex', name: 'ヴェックス', title: '戦術のライバル', quote: '先に動いた方が、先に読まれる。',
    style: 'tactician', map: 'crossline', weapon: 'pulse', firstTo: 3, reward: 1,
    color: '#a77bff', weakness: '遮蔽物を変え、同じ角度から二度ピークしない。',
    config: { enemyHp: 100, enemySpeed: 6.2, accuracy: .77, reaction: .4, attack: 16, assist: .45, jump: .07 },
  },
  {
    id: 'scope', name: 'スコープ', title: '狙撃のライバル', quote: '見えた瞬間には、もう遅い。',
    style: 'marksman', map: 'longshot', weapon: 'rail', firstTo: 3, reward: 2,
    color: '#5fe8ff', weakness: '精密射撃の直後に横切り、近距離へ持ち込め。',
    config: { enemyHp: 92, enemySpeed: 5.8, accuracy: .9, reaction: .34, attack: 17, assist: .34, jump: .04 },
  },
  {
    id: 'titan', name: 'タイタン', title: '鉄壁のライバル', quote: 'ここから先は、一歩も通さない。',
    style: 'tactician', map: 'pocket', weapon: 'cannon', firstTo: 3, reward: 2,
    color: '#ffd35d', weakness: '高耐久だが砲撃は遅い。着弾を見てから反撃できる。',
    config: { enemyHp: 135, enemySpeed: 5.2, accuracy: .72, reaction: .5, attack: 18, assist: .38, jump: .02 },
  },
  {
    id: 'zero', name: 'ゼロ', title: 'サーキット王者', quote: 'お前の戦い方は、すべて記録した。',
    style: 'adaptive', map: 'crossline', weapon: 'adaptive', firstTo: 5, reward: 4,
    color: '#ff4f91', weakness: 'HPで武器と間合いが変わる。変化を先読みしろ。',
    config: { enemyHp: 120, enemySpeed: 7, accuracy: .86, reaction: .27, attack: 18, assist: .25, jump: .1 },
  },
];

const STORAGE_KEY = 'firstBlastCircuitV1';

export class CircuitProgress {
  constructor(storage = localStorage, now = () => Date.now(), options = {}) {
    this.storage = storage;
    this.now = now;
    this.storageKey = options.storageKey || STORAGE_KEY;
    this.length = options.length || CIRCUIT_RIVALS.length;
    const empty = { bestStage: 0, clears: 0, bestTime: null, run: null };
    try { this.data = { ...empty, ...JSON.parse(this.storage.getItem(this.storageKey) || '{}') }; }
    catch { this.data = empty; }
    this.segmentStartedAt = 0;
  }

  get hasRun() { return !!this.data.run && this.data.run.stage < this.length; }

  start() {
    this.data.run = { stage: 0, elapsed: 0, runKeys: 0 };
    this.segmentStartedAt = this.now();
    this.save();
  }

  resume() {
    if (!this.hasRun) this.start();
    else this.segmentStartedAt = this.now();
    return this.data.run;
  }

  pause() {
    if (!this.hasRun || !this.segmentStartedAt) return;
    this.data.run.elapsed = this.elapsed();
    this.segmentStartedAt = 0;
    this.save();
  }

  elapsed() {
    if (!this.data.run) return 0;
    const active = this.segmentStartedAt ? Math.max(0, this.now() - this.segmentStartedAt) : 0;
    return Math.max(0, this.data.run.elapsed + active);
  }

  recordWin(stage, runKeys = 0) {
    this.data.bestStage = Math.max(this.data.bestStage, stage + 1);
    if (this.data.run) {
      this.data.run.elapsed = this.elapsed();
      this.data.run.stage = stage + 1;
      this.data.run.runKeys = runKeys;
      this.segmentStartedAt = this.now();
    }
    this.save();
  }

  complete() {
    const elapsed = this.elapsed();
    this.data.clears++;
    if (!this.data.bestTime || elapsed < this.data.bestTime) this.data.bestTime = elapsed;
    this.data.run = null;
    this.segmentStartedAt = 0;
    this.save();
    return elapsed;
  }

  abandon() {
    this.data.run = null;
    this.segmentStartedAt = 0;
    this.save();
  }

  formatTime(milliseconds = this.data.bestTime) {
    if (!milliseconds) return '--:--';
    const totalSeconds = Math.floor(milliseconds / 1000);
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
  }

  save() { this.storage.setItem(this.storageKey, JSON.stringify(this.data)); }
}
