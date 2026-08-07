// 敵の「今この数秒をどう動くか」。スタイルが間合い・武器・反応を決め、戦術が動きの味付けを決める。
// 数秒ごとに1つ引き直すので、同じスタイルでも毎回違う組み立てになる。
//
// lean : 前後方向の強さ（+が前進、-が後退）
// side : 左右方向の強さ。実際の向きは敵が持つ strafeDirection で決まる
// hold : この戦術を続ける秒数の範囲
// speed: 移動速度の倍率
// jump : 回避ジャンプの出やすさの倍率
// firePause: バースト後の待ち時間の倍率（小さいほど手数が多い）
// flip : この秒数ごとに左右を切り返す（0なら切り返さない）
export const ENEMY_TACTICS = {
  strafe: { id: 'strafe', name: '横取り', lean: 0, side: 1, hold: [1.1, 2.1], speed: 1, jump: .8, firePause: 1, flip: 0 },
  press: { id: 'press', name: '圧力', lean: .85, side: .35, hold: [.9, 1.7], speed: 1.12, jump: .7, firePause: .9, flip: 0 },
  backstep: { id: 'backstep', name: '引き撃ち', lean: -.7, side: .55, hold: [.8, 1.5], speed: 1.05, jump: .5, firePause: 1.1, flip: 0 },
  hold: { id: 'hold', name: '据え撃ち', lean: 0, side: 0, hold: [.5, 1.1], speed: .9, jump: .15, firePause: .78, flip: 0 },
  juke: { id: 'juke', name: '切り返し', lean: .1, side: 1, hold: [.9, 1.6], speed: 1.05, jump: 1.4, firePause: 1.05, flip: .34 },
  flank: { id: 'flank', name: '回り込み', lean: .4, side: .95, hold: [1.3, 2.4], speed: 1.05, jump: .6, firePause: 1.15, flip: 0 },
  hop: { id: 'hop', name: '跳ね撃ち', lean: .25, side: .75, hold: [.8, 1.5], speed: 1, jump: 2.4, firePause: 1, flip: 0 },
};

export const DEFAULT_TACTIC = 'strafe';

// 重み付き抽選。重みは戦闘スタイルごとに違うので、引ける戦術は同じでも出方が変わる。
export function rollTactic(weights, random = Math.random) {
  const entries = Object.entries(weights || {}).filter(([id, weight]) => ENEMY_TACTICS[id] && weight > 0);
  if (!entries.length) return DEFAULT_TACTIC;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [id, weight] of entries) {
    roll -= weight;
    if (roll < 0) return id;
  }
  return entries[entries.length - 1][0];
}

export function tacticById(id) {
  return ENEMY_TACTICS[id] || ENEMY_TACTICS[DEFAULT_TACTIC];
}

export function tacticDuration(tactic, random = Math.random) {
  const [min, max] = tactic.hold;
  return min + random() * (max - min);
}

// 間合いの都合（goal）は戦術より優先する。離れすぎたら必ず詰め、近すぎたら必ず下がる。
// そうしないと「据え撃ち」を引いた敵が射程外で棒立ちになる。
export function steerLean(lean, goal) {
  if (goal === 'approach') return Math.max(lean, .6);
  if (goal === 'retreat') return Math.min(lean, -.55);
  return lean;
}
