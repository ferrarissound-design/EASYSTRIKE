// CPUの戦闘スタイル。間合い・速度・バースト・武器を決め、tacticsで「どんな動きを引きやすいか」を決める。
// tacticsの中身は enemyTactics.js の戦術ID→重み。重みが違うだけで、同じ戦術でも別人のように見える。
export const RIVAL_STYLES = {
  brawler: {
    id: 'brawler', name: 'ラッシュ', label: '突撃型', detail: '一気に距離を詰め、散弾で押し切る', weapon: 'scatter',
    preferredMin: 3.5, preferredMax: 8, speed: 1.13, burst: 4, burstPause: .55, reactionScale: .86, accuracyBonus: -.05,
    tactics: { press: 4, juke: 2.5, hop: 2, strafe: 1.4, flank: 1, backstep: .4 },
  },
  tactician: {
    id: 'tactician', name: 'マインド', label: '戦術型', detail: '遮蔽物を使って左右に動き、状況に対応する', weapon: 'pulse',
    preferredMin: 7, preferredMax: 12, speed: 1, burst: 3, burstPause: .85, reactionScale: 1, accuracyBonus: 0,
    tactics: { strafe: 3, flank: 2.4, backstep: 1.8, press: 1.4, hold: 1, juke: 1 },
  },
  marksman: {
    id: 'marksman', name: 'エイム', label: '狙撃型', detail: '距離を保ち、レールガンの単発を狙う', weapon: 'rail',
    preferredMin: 13, preferredMax: 22, speed: .92, burst: 1, burstPause: .58, reactionScale: 1.12, accuracyBonus: .12,
    tactics: { hold: 3, backstep: 2.6, strafe: 2.2, flank: 1.2, juke: .6, press: .4 },
  },
  phantom: {
    id: 'phantom', name: 'ファントム', label: 'かく乱型', detail: '跳ねながら不規則に動き、狙いを絞らせない', weapon: 'pulse',
    preferredMin: 5, preferredMax: 13, speed: 1.1, burst: 2, burstPause: .6, reactionScale: .94, accuracyBonus: -.02,
    tactics: { juke: 3.4, hop: 3, strafe: 2.2, flank: 1.6, press: 1.2, backstep: 1 },
  },
  breaker: {
    id: 'breaker', name: 'ブレイカー', label: '制圧型', detail: '足を止めてキャノンを撃ち、正面から押し込む', weapon: 'cannon',
    preferredMin: 6, preferredMax: 14, speed: .9, burst: 1, burstPause: .72, reactionScale: 1.05, accuracyBonus: .05,
    tactics: { press: 3, hold: 2.6, strafe: 1.8, backstep: 1.4, flank: 1, hop: .4 },
  },
  ambusher: {
    id: 'ambusher', name: 'アンブッシュ', label: '待ち伏せ型', detail: '大きく回り込み、間合いに入った瞬間に仕掛ける', weapon: 'scatter',
    preferredMin: 4, preferredMax: 10, speed: 1.06, burst: 1, burstPause: .5, reactionScale: .9, accuracyBonus: -.03,
    tactics: { flank: 3.2, press: 2.4, hold: 1.6, juke: 1.6, strafe: 1.4, backstep: .8 },
  },
  adaptive: {
    id: 'adaptive', name: 'シフト', label: '適応型', detail: 'HPに応じて武器と距離の取り方を変える', weapon: 'adaptive',
    preferredMin: 8, preferredMax: 16, speed: 1.05, burst: 3, burstPause: .68, reactionScale: .86, accuracyBonus: .04, adaptive: true,
    tactics: { strafe: 2, press: 2, backstep: 2, flank: 1.6, juke: 1.6, hop: 1.2, hold: 1.2 },
  },
};

export const RANDOM_STYLE = 'random';
export const DEFAULT_STYLE = RIVAL_STYLES.tactician;
export const STYLE_KEYS = Object.keys(RIVAL_STYLES);
export const RANDOM_STYLE_DETAIL = 'ラウンドごとに戦い方と武器が入れ替わる';

// 適応型のHP段階。ベースを丸ごと差し替えるのではなく上書きにして、tacticsや命中補正を残す。
const ADAPTIVE_PHASES = [
  { above: .66, preferredMin: 13, preferredMax: 22, speed: .94, burst: 1, burstPause: .62, reactionScale: .92 },
  { above: .33, preferredMin: 7, preferredMax: 12, speed: 1.05, burst: 3, burstPause: .7, reactionScale: .86 },
  { above: -1, preferredMin: 3.5, preferredMax: 8, speed: 1.2, burst: 1, burstPause: .45, reactionScale: .72 },
];

export function styleForHp(style, hpRatio = 1) {
  const base = style || DEFAULT_STYLE;
  if (!base.adaptive) return base;
  const phase = ADAPTIVE_PHASES.find(entry => hpRatio > entry.above) || ADAPTIVE_PHASES[ADAPTIVE_PHASES.length - 1];
  return { ...base, ...phase };
}

// ランダム選択。直前と同じスタイルは避けて、2ラウンド続けて同じ戦い方にならないようにする。
export function rollRivalStyle(exclude = null, random = Math.random) {
  const pool = STYLE_KEYS.filter(key => key !== exclude);
  const keys = pool.length ? pool : STYLE_KEYS;
  return keys[Math.min(keys.length - 1, Math.floor(random() * keys.length))];
}

export function loadRivalStyle() {
  const value = localStorage.getItem('firstBlastRivalStyle');
  return RIVAL_STYLES[value] ? value : RANDOM_STYLE;
}
