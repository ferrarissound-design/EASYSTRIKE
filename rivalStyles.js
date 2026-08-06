export const RIVAL_STYLES = {
  brawler: {
    id: 'brawler', name: 'RUSH', label: 'RUSHER', detail: 'Closes distance and fires long bursts',
    preferredMin: 3.5, preferredMax: 8, speed: 1.13, burst: 4, burstPause: .55, reactionScale: .86, accuracyBonus: -.05,
  },
  tactician: {
    id: 'tactician', name: 'MIND', label: 'TACTICIAN', detail: 'Strafes between cover and adapts',
    preferredMin: 7, preferredMax: 12, speed: 1, burst: 3, burstPause: .85, reactionScale: 1, accuracyBonus: 0,
  },
  marksman: {
    id: 'marksman', name: 'AIM', label: 'MARKSMAN', detail: 'Keeps range and fires precise taps',
    preferredMin: 13, preferredMax: 22, speed: .92, burst: 1, burstPause: .58, reactionScale: 1.12, accuracyBonus: .12,
  },
  adaptive: {
    id: 'adaptive', name: 'SHIFT', label: 'ADAPTIVE', detail: 'Changes weapon and spacing as HP falls',
    preferredMin: 8, preferredMax: 16, speed: 1.05, burst: 3, burstPause: .68, reactionScale: .86, accuracyBonus: .04, adaptive: true,
  },
};

export function loadRivalStyle() {
  const value = localStorage.getItem('firstBlastRivalStyle');
  return RIVAL_STYLES[value] ? value : 'tactician';
}
