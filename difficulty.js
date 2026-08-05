export const DIFFICULTIES = {
  easy: { label: 'かんたん', playerHp: 200, enemyHp: 80, enemySpeed: 2.2, accuracy: 0.25, reaction: 1.15, attack: 12, assist: 0.75, dash: 0.03, jump: 0.04 },
  normal: { label: 'ふつう', playerHp: 150, enemyHp: 100, enemySpeed: 3.1, accuracy: 0.4, reaction: 0.75, attack: 16, assist: 0.45, dash: 0.08, jump: 0.09 },
  challenge: { label: 'チャレンジ', playerHp: 100, enemyHp: 120, enemySpeed: 4, accuracy: 0.58, reaction: 0.45, attack: 19, assist: 0.2, dash: 0.16, jump: 0.14 },
};

export function loadDifficulty() {
  const value = localStorage.getItem('firstBlastDifficulty');
  return DIFFICULTIES[value] ? value : 'easy';
}

