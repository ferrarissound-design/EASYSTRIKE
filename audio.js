// トラック本体は生演奏より音量が大きいので、BGMスライダーの値にこの係数をかけて少し控えめにする。
const MUSIC_TRACK_ATTENUATION = 0.6;

export class GameAudio {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.musicStarted = false;
    this.musicElement = null;
  }

  unlock() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.sfxBus = this.context.createGain();
      this.musicBus = this.context.createGain();
      this.sfxBus.connect(this.context.destination);
      this.musicBus.connect(this.context.destination);
      this.startMusic();
    }
    if (this.context.state === 'suspended') this.context.resume();
    this.sync();
  }

  sync() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx / 100, now, .03);
    this.musicBus.gain.setTargetAtTime(this.settings.bgm / 100 * MUSIC_TRACK_ATTENUATION, now, .12);
  }

  startMusic() {
    if (this.musicStarted || !this.context) return;
    this.musicStarted = true;
    this.musicElement = new Audio('./beyond_the_last_checkpoint.mp3');
    this.musicElement.loop = true;
    this.musicElement.preload = 'auto';
    const source = this.context.createMediaElementSource(this.musicElement);
    source.connect(this.musicBus);
    this.musicElement.play().catch(() => {});
  }

  play(name) {
    if (!this.context || this.settings.sfx <= 0 || !this.sfxBus) return;
    // 4つめの要素は終わりの周波数（省略時は開始の0.7倍）。やられた合図だけ大きく下げて、
    // まんが的な「うっ」という声に近い響きにする。音源は使わず、すべて合成音。
    const sounds = { pulse:[540,.055,'square'], spark:[190,.12,'sawtooth'], bubble:[120,.22,'sine'], grenade:[105,.2,'sawtooth'], melee:[360,.09,'sawtooth'], hit:[920,.045,'square'], headshot:[1450,.08,'sine'], kill:[1200,.24,'sine'], critical:[1760,.16,'square',740], danger:[115,.28,'sawtooth',55], reload:[310,.12,'square'], switch:[700,.06,'sine'], heal:[850,.18,'sine'], shield:[430,.25,'sine'], jump:[260,.09,'triangle'], slide:[145,.12,'sawtooth'], round:[760,.18,'square'], victory:[980,.5,'sine'], defeat:[90,.5,'sawtooth'], pickup:[650,.12,'sine'], drone:[760,.08,'sine'], oof:[520,.26,'triangle',170] };
    const [frequency, duration, type, end] = sounds[name] || sounds.pickup;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain(), now = this.context.currentTime;
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now); oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, end ?? frequency * .7), now + duration);
    gain.gain.setValueAtTime(.05, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(this.sfxBus); oscillator.start(now); oscillator.stop(now + duration);
  }
}

