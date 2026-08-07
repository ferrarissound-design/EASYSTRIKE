import assert from 'node:assert/strict';
import { ENEMY_TACTICS, rollTactic, tacticById, tacticDuration, steerLean, DEFAULT_TACTIC } from '../enemyTactics.js';
import { RIVAL_STYLES, STYLE_KEYS, RANDOM_STYLE, DEFAULT_STYLE, rollRivalStyle, styleForHp } from '../rivalStyles.js';
import { ENEMY_WEAPONS, enemyWeaponFor } from '../enemyWeapons.js';

// 抽選は重みどおりの区間に落ちる。0や未知のIDは候補から外す。
const weights = { press: 1, strafe: 3 };
assert.equal(rollTactic(weights, () => 0), 'press');
assert.equal(rollTactic(weights, () => .3), 'strafe');
assert.equal(rollTactic({ press: 0, unknown: 5 }, () => .5), DEFAULT_TACTIC, 'empty weights fall back to the default tactic');
assert.equal(rollTactic(undefined, () => .5), DEFAULT_TACTIC);
assert.equal(rollTactic(weights, () => .999999), 'strafe', 'the top of the range must stay in bounds');

// 戦術は必ず解決でき、継続時間は宣言した範囲に収まる。
assert.equal(tacticById('nope').id, DEFAULT_TACTIC);
for (const tactic of Object.values(ENEMY_TACTICS)) {
  const [min, max] = tactic.hold;
  assert.ok(min > 0 && max > min, `${tactic.id} needs a positive hold range`);
  assert.equal(tacticDuration(tactic, () => 0), min);
  assert.ok(tacticDuration(tactic, () => .999) <= max);
  assert.ok(tactic.speed >= 0 && tactic.firePause > 0 && tactic.jump >= 0, `${tactic.id} has out of range scales`);
}

// 間合いの都合は戦術より優先する。射程外で棒立ちにならないこと。
assert.equal(steerLean(ENEMY_TACTICS.hold.lean, 'approach') >= .6, true);
assert.equal(steerLean(ENEMY_TACTICS.press.lean, 'retreat') <= -.55, true);
assert.equal(steerLean(ENEMY_TACTICS.press.lean, 'fight'), ENEMY_TACTICS.press.lean, '間合いの中では戦術の値をそのまま使う');
assert.equal(steerLean(ENEMY_TACTICS.hold.lean, 'fight'), 0, '据え撃ちは間合いの中でだけ足を止める');

// スタイル定義の健全性。武器も戦術も実在するキーだけを指すこと。
assert.ok(STYLE_KEYS.length >= 5, 'ランダムで選べるパターンが十分にあること');
assert.ok(!STYLE_KEYS.includes(RANDOM_STYLE), '"random" はスタイルではなく選択肢の名前');
for (const key of STYLE_KEYS) {
  const style = RIVAL_STYLES[key];
  assert.equal(style.id, key);
  assert.ok(ENEMY_WEAPONS[style.weapon] || style.weapon === 'adaptive', `${key} references an unknown weapon`);
  assert.ok(enemyWeaponFor(style.weapon, 1), `${key} must resolve to a weapon`);
  assert.ok(style.preferredMin < style.preferredMax, `${key} has an inverted preferred range`);
  const ids = Object.keys(style.tactics);
  assert.ok(ids.length >= 4, `${key} needs several tactics to stay unpredictable`);
  ids.forEach(id => assert.ok(ENEMY_TACTICS[id], `${key} references an unknown tactic: ${id}`));
}

// 直前と同じスタイルは引かない。候補が1つしかない場合だけ同じものを返す。
assert.notEqual(rollRivalStyle(STYLE_KEYS[0], () => 0), STYLE_KEYS[0]);
assert.equal(rollRivalStyle(null, () => .999999), STYLE_KEYS[STYLE_KEYS.length - 1], 'the top of the range must stay in bounds');
const seen = new Set();
let previous = null;
for (let index = 0; index < 400; index++) {
  const key = rollRivalStyle(previous);
  assert.ok(RIVAL_STYLES[key], `rolled an unknown style: ${key}`);
  assert.notEqual(key, previous, '同じスタイルが2回続かないこと');
  seen.add(key);
  previous = key;
}
assert.equal(seen.size, STYLE_KEYS.length, 'すべてのスタイルが抽選に出ること');

// 適応型はHPで上書きされるが、命中補正と戦術表は残る。
const shift = RIVAL_STYLES.adaptive;
assert.equal(styleForHp(RIVAL_STYLES.tactician, .1), RIVAL_STYLES.tactician, '適応型以外は素通し');
const wounded = styleForHp(shift, .2);
assert.ok(wounded.preferredMax < shift.preferredMax, 'HPが減ると間合いを詰める');
assert.equal(wounded.accuracyBonus, shift.accuracyBonus);
assert.equal(wounded.tactics, shift.tactics);
assert.ok(styleForHp(shift, .9).preferredMin > styleForHp(shift, .5).preferredMin);
assert.ok(styleForHp(shift, 0).speed > shift.speed);
assert.equal(styleForHp(null, 1), DEFAULT_STYLE, 'スタイル未設定でも既定にフォールバックする');

console.log('Enemy tactic and rival style checks passed');
