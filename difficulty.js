export const DIFFICULTIES = {
  easy: {
    label: 'ルーキー', playerHp: 100, enemyHp: 100, enemySpeed: 4.8,
    accuracy: .58, reaction: .72, attack: 14, jump: .02,
  },
  normal: {
    label: 'ライバル', playerHp: 100, enemyHp: 100, enemySpeed: 6.2,
    accuracy: .76, reaction: .48, attack: 16, jump: .06,
  },
  challenge: {
    label: 'エース', playerHp: 100, enemyHp: 100, enemySpeed: 7.3,
    accuracy: .9, reaction: .3, attack: 18, jump: .1,
  },
};

export function loadDifficulty() {
  const value = localStorage.getItem('firstBlastDifficulty');
  return DIFFICULTIES[value] ? value : 'easy';
}
