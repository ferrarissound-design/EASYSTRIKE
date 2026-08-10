import { CIRCUIT_RIVALS, CircuitProgress } from './circuit.js';

const STORAGE_KEY = 'firstBlastDailyCircuitV1';
const DAILY_LENGTH = 3;

export function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function seededRandom(seedText) {
  let state = [...seedText].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function createDailyChallenge(day = localDayKey()) {
  const random = seededRandom(day);
  const pool = [...CIRCUIT_RIVALS];
  for (let index = pool.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  const rivals = pool.slice(0, DAILY_LENGTH).map((rival, index) => ({
    ...rival,
    id: `daily-${day}-${rival.id}`,
    firstTo: index === DAILY_LENGTH - 1 ? 3 : 2,
    reward: 1,
  }));
  return { day, rivals };
}

export class DailyProgress extends CircuitProgress {
  constructor(day = localDayKey(), storage = localStorage, now = () => Date.now()) {
    super(storage, now, { storageKey: STORAGE_KEY, length: DAILY_LENGTH });
    if (this.data.day !== day) {
      this.data = { day, bestStage: 0, clears: 0, bestTime: null, run: null };
      this.segmentStartedAt = 0;
      this.save();
    }
    this.day = day;
  }
}
