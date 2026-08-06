export const RIVAL_STYLES = {
  brawler: {
    id: 'brawler', name: 'ラッシュ', label: '突撃型', detail: '一気に距離を詰め、長い連射を仕掛ける',
    preferredMin: 3.5, preferredMax: 8, speed: 1.13, burst: 4, burstPause: .55, reactionScale: .86, accuracyBonus: -.05,
  },
  tactician: {
    id: 'tactician', name: 'マインド', label: '戦術型', detail: '遮蔽物を使って左右に動き、状況に対応する',
    preferredMin: 7, preferredMax: 12, speed: 1, burst: 3, burstPause: .85, reactionScale: 1, accuracyBonus: 0,
  },
  marksman: {
    id: 'marksman', name: 'エイム', label: '狙撃型', detail: '距離を保ち、正確な単発射撃を狙う',
    preferredMin: 13, preferredMax: 22, speed: .92, burst: 1, burstPause: .58, reactionScale: 1.12, accuracyBonus: .12,
  },
  adaptive: {
    id: 'adaptive', name: 'シフト', label: '適応型', detail: 'HPに応じて武器と距離の取り方を変える',
    preferredMin: 8, preferredMax: 16, speed: 1.05, burst: 3, burstPause: .68, reactionScale: .86, accuracyBonus: .04, adaptive: true,
  },
};

export function loadRivalStyle() {
  const value = localStorage.getItem('firstBlastRivalStyle');
  return RIVAL_STYLES[value] ? value : 'tactician';
}
