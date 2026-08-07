import * as THREE from 'three';
import { createArena, destroyArena, ARENA_MAPS, loadArenaMap, PLAYER_SPAWN, RIVAL_SPAWN } from './arena.js';
import { Controls } from './controls.js';
import { Player } from './player.js';
import { Weapon, LOADOUT_OPTIONS, SLOT_ORDER, SLOT_LABELS, loadLoadout, saveLoadout } from './weapon.js';
import { Enemy } from './enemy.js';
import { UI } from './ui.js';
import { Effects } from './effects.js';
import { DIFFICULTIES, loadDifficulty } from './difficulty.js';
import { loadSettings, applySettings, bindSettings } from './settings.js';
import { ContractTracker, CONTRACTS } from './contracts.js';
import { GameAudio } from './audio.js';
import { GearDraft } from './gears.js';
import { RIVAL_STYLES, STYLE_KEYS, RANDOM_STYLE, RANDOM_STYLE_DETAIL, DEFAULT_STYLE, loadRivalStyle, rollRivalStyle } from './rivalStyles.js';
import { CosmeticLocker, COSMETICS } from './cosmetics.js';
import { CIRCUIT_RIVALS, CircuitProgress } from './circuit.js';
import { AimAssist } from './aimAssist.js';
import { MobileDebug } from './mobileDebug.js';
import { bindViewportGestureLock } from './viewportGuard.js';
import { setQuality, configureRenderer, createSkyEnvironment, refreshQuality } from './graphics.js';

bindViewportGestureLock();
const settings = loadSettings();
applySettings(settings);
setQuality(settings.quality);
const audio = new GameAudio(settings);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfdcf8);
scene.fog = new THREE.Fog(0xcfe5fa, 46, 92);
const camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, .1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: settings.quality !== 'low', powerPreference: 'high-performance' });
configureRenderer(renderer);
renderer.setSize(innerWidth, innerHeight);
document.getElementById('game').append(renderer.domElement);
scene.environment = createSkyEnvironment(renderer);

const colliders = [];
const obstacles = [];
let arenaMapKey = loadArenaMap();
let activeArenaKey = arenaMapKey;
let arenaRoot = createArena(scene, colliders, activeArenaKey, obstacles).root;
const effects = new Effects(scene, settings.quality);
const controls = new Controls(renderer.domElement, settings);
const player = new Player(camera, colliders, effects, audio, settings);
let currentLoadout = loadLoadout();
const weapon = new Weapon(scene, camera, effects, audio, currentLoadout);
const enemy = new Enemy(scene, colliders, obstacles, effects, audio);
const ui = new UI(camera);
const touchAimAssist = new AimAssist(camera, obstacles, () => [enemy], settings);
const mobileDebug = new MobileDebug(new URLSearchParams(location.search).has('touchDebug'));
const contracts = new ContractTracker();
const locker = new CosmeticLocker();
const gearDraft = new GearDraft();
const circuitProgress = new CircuitProgress();
const clock = new THREE.Clock();
scene.add(camera);
weapon.setCosmetics(locker.loadout());

let difficultyKey = loadDifficulty();
let config = DIFFICULTIES[difficultyKey];
let rivalStyleKey = loadRivalStyle();
let rivalStyle = RIVAL_STYLES[rivalStyleKey] || DEFAULT_STYLE;   // 「ランダム」選択中はメニュー表示用の控えとして使う。
let activeStyle = rivalStyle;
let activeWeapon = rivalStyle.weapon || 'pulse';
let rolledStyleKey = null;
let activeRival = null;
let state = 'menu';
let mode = 'duel';
let roundTarget = 5;
let circuitIndex = 0;
let circuitRunKeys = 0;
let lastMatchWon = false;
let roundNumber = 1;
let playerRounds = 0;
let rivalRounds = 0;
let roundToken = 0;
let rangeTarget = 0;
let pendingRewards = [];
let stats = freshStats();

function freshStats() {
  return { shots: 0, hits: 0, headshots: 0, damage: 0, damageTaken: 0, bestHit: 0, clutches: 0 };
}

function setPanel(id, visible) {
  document.getElementById(id).classList.toggle('hidden', !visible);
}

function selectDifficulty(value) {
  difficultyKey = value;
  config = DIFFICULTIES[value];
  localStorage.setItem('firstBlastDifficulty', value);
  document.querySelectorAll('#difficulty button').forEach(button => button.classList.toggle('selected', button.dataset.value === value));
}

document.querySelectorAll('#difficulty button').forEach(button => { button.onclick = () => selectDifficulty(button.dataset.value); });
selectDifficulty(difficultyKey);
let appliedQuality = settings.quality;
bindSettings(settings, () => {
  audio.settings = settings;
  if (settings.quality === appliedQuality) return;
  appliedQuality = settings.quality;
  refreshQuality(renderer, scene, settings.quality);
});

const isRandomStyle = () => rivalStyleKey === RANDOM_STYLE;

// スタイルの一覧はrivalStyles.jsが持つ。増やしてもメニューのボタンは自動で増える。
function renderRivalStyles() {
  const container = document.getElementById('rivalStyle');
  container.replaceChildren(...[RANDOM_STYLE, ...STYLE_KEYS].map(key => {
    const button = document.createElement('button');
    button.dataset.value = key;
    button.textContent = key === RANDOM_STYLE ? 'ランダム' : RIVAL_STYLES[key].name;
    button.onclick = () => selectRivalStyle(key);
    return button;
  }));
}

function selectRivalStyle(value) {
  rivalStyleKey = RIVAL_STYLES[value] ? value : RANDOM_STYLE;
  rivalStyle = RIVAL_STYLES[rivalStyleKey] || DEFAULT_STYLE;
  localStorage.setItem('firstBlastRivalStyle', rivalStyleKey);
  document.querySelectorAll('#rivalStyle button').forEach(button => button.classList.toggle('selected', button.dataset.value === rivalStyleKey));
  document.getElementById('styleHint').textContent = isRandomStyle() ? RANDOM_STYLE_DETAIL : rivalStyle.detail;
  ui.setRivalStyle(isRandomStyle() ? { label: 'ランダム' } : rivalStyle);
}

// デュエルで実際に使うスタイル。武器もスタイルに紐づくので、戦い方と攻撃手段が一緒に変わる。
function useDuelStyle(key) {
  activeStyle = RIVAL_STYLES[key] || DEFAULT_STYLE;
  activeWeapon = activeStyle.weapon || 'pulse';
  ui.setRivalStyle(activeStyle);
}

function rollDuelStyle() {
  rolledStyleKey = rollRivalStyle(rolledStyleKey);
  useDuelStyle(rolledStyleKey);
}

function prepareDuelStyle() {
  if (isRandomStyle()) rollDuelStyle();
  else { rolledStyleKey = null; useDuelStyle(rivalStyleKey); }
}

renderRivalStyles();
selectRivalStyle(rivalStyleKey);

function ensureArena(value) {
  if (activeArenaKey === value) return;
  destroyArena(scene, arenaRoot);
  activeArenaKey = value;
  arenaRoot = createArena(scene, colliders, activeArenaKey, obstacles).root;
  enemy.colliders = colliders;
  enemy.obstacles = obstacles;
}

function selectArenaMap(value) {
  if (!ARENA_MAPS[value]) return;
  arenaMapKey = value;
  localStorage.setItem('firstBlastArenaMap', value);
  document.querySelectorAll('#arenaMap button').forEach(button => button.classList.toggle('selected', button.dataset.value === value));
  document.getElementById('mapHint').textContent = ARENA_MAPS[value].detail;
  if (state === 'menu') ensureArena(value);
}

document.querySelectorAll('#arenaMap button').forEach(button => { button.onclick = () => selectArenaMap(button.dataset.value); });
selectArenaMap(arenaMapKey);

function renderCircuitRecord() {
  document.getElementById('circuitRecord').textContent = `最高 ${circuitProgress.data.bestStage}/5 · ${circuitProgress.formatTime()}`;
}

function startCircuit() {
  audio.unlock();
  mode = 'circuit';
  circuitIndex = 0;
  circuitRunKeys = 0;
  circuitProgress.start();
  showCircuitCard();
}

function showCircuitCard() {
  roundToken++;
  state = 'circuit';
  mode = 'circuit';
  activeRival = CIRCUIT_RIVALS[circuitIndex];
  activeStyle = RIVAL_STYLES[activeRival.style];
  activeWeapon = activeRival.weapon;
  ensureArena(activeRival.map);
  document.exitPointerLock?.();
  document.getElementById('hud').classList.add('hidden');
  ['start', 'loadout', 'locker', 'contracts', 'settings', 'message', 'gearSelect'].forEach(id => setPanel(id, false));
  setPanel('circuit', true);
  const card = document.querySelector('.circuit-card');
  card.style.setProperty('--rival-color', activeRival.color);
  document.getElementById('circuitStage').textContent = `ステージ ${circuitIndex + 1} / ${CIRCUIT_RIVALS.length}`;
  document.getElementById('circuitKeys').textContent = `+${activeRival.reward} キー · ${activeRival.firstTo}本先取`;
  document.getElementById('circuitName').textContent = activeRival.name;
  document.getElementById('circuitTitle').textContent = activeRival.title;
  document.getElementById('circuitQuote').textContent = `“${activeRival.quote}”`;
  document.getElementById('circuitWeapon').textContent = ({ adaptive: '変化する武器', scatter: '散弾銃', pulse: 'パルス', rail: 'レールガン', cannon: 'キャノン' })[activeRival.weapon] || activeRival.weapon;
  document.getElementById('circuitStyle').textContent = activeStyle.label;
  document.getElementById('circuitMap').textContent = ARENA_MAPS[activeRival.map].name;
  document.getElementById('circuitWeakness').textContent = activeRival.weakness;
  document.getElementById('rivalEmblem').textContent = activeRival.name[0];
  document.getElementById('circuitLaunch').textContent = circuitIndex === CIRCUIT_RIVALS.length - 1 ? '王者に挑戦' : '挑戦する';
  const route = document.getElementById('circuitRoute');
  route.replaceChildren(...CIRCUIT_RIVALS.map((_, index) => {
    const node = document.createElement('i');
    node.className = index < circuitIndex ? 'done' : index === circuitIndex ? 'active' : '';
    return node;
  }));
  config = { playerHp: 100, ...activeRival.config };
  enemy.configure(config, activeStyle, activeWeapon);
  enemy.respawn(RIVAL_SPAWN);
}

function launchCircuitMatch() {
  if (state !== 'circuit') return;
  stats = freshStats();
  pendingRewards = [];
  playerRounds = rivalRounds = 0;
  roundNumber = 1;
  roundTarget = activeRival.firstTo;
  gearDraft.reset();
  applyGearModifiers();
  player.configure(config.playerHp);
  enemy.configure(config, activeStyle, activeWeapon);
  enemy.gameEnded = false;
  ui.setRivalStyle({ label: activeRival.name });
  preparePlayView();
  beginRound();
}

document.getElementById('circuitButton').onclick = startCircuit;
document.getElementById('circuitLaunch').onclick = launchCircuitMatch;
document.getElementById('circuitMenu').onclick = () => showMenu();

function switchWeapon(index) {
  if (!['playing', 'range'].includes(state)) return;
  weapon.switch(index);
  ui.selectWeapon(index);
}

function configureHudSlots() {
  ui.configureSlots(weapon.definitions, weapon.index, switchWeapon);
}

controls.switchWeapon = switchWeapon;
controls.reload = () => weapon.reload();
controls.menu = () => { if (state !== 'menu') showMenu(); };

function renderLoadout() {
  const grid = document.getElementById('loadoutGrid');
  grid.replaceChildren();
  SLOT_ORDER.forEach(slot => {
    const column = document.createElement('section');
    column.className = 'loadout-column';
    const heading = document.createElement('h3');
    heading.textContent = SLOT_LABELS[slot];
    column.append(heading);
    LOADOUT_OPTIONS[slot].forEach(definition => {
      const button = document.createElement('button');
      button.className = `loadout-option ${currentLoadout[slot] === definition.id ? 'selected' : ''}`;
      button.innerHTML = `<span>${definition.name}</span><small>${definition.description}</small>`;
      button.onclick = () => {
        currentLoadout[slot] = definition.id;
        saveLoadout(currentLoadout);
        weapon.configureLoadout(currentLoadout);
        configureHudSlots();
        renderLoadout();
      };
      column.append(button);
    });
    grid.append(column);
  });
}

function renderContracts() {
  document.getElementById('menuKeys').textContent = `${contracts.keys} キー`;
  document.getElementById('contractKeys').textContent = contracts.keys;
  const list = document.getElementById('contractList');
  list.replaceChildren();
  CONTRACTS.forEach(contract => {
    const progress = contracts.progress(contract);
    const row = document.createElement('div');
    row.className = `contract ${progress >= contract.target ? 'done' : ''}`;
    row.innerHTML = `<div><b>${contract.title}</b><small>${contract.detail}</small></div><b>${progress >= contract.target ? '完了' : `${progress}/${contract.target} • +${contract.reward} キー`}</b><div class="contract-progress"><i style="width:${progress / contract.target * 100}%"></i></div>`;
    list.append(row);
  });
}

function renderCosmetics() {
  document.getElementById('lockerKeys').textContent = contracts.keys;
  const grid = document.getElementById('cosmeticGrid');
  grid.replaceChildren();
  [['finish', '武器カラー'], ['impact', '命中エフェクト'], ['title', 'プレイヤー称号']].forEach(([category, label]) => {
    const group = document.createElement('section');
    group.className = 'cosmetic-group';
    group.innerHTML = `<h3>${label}</h3>`;
    COSMETICS.filter(item => item.category === category).forEach(item => {
      const owned = locker.isOwned(item.id);
      const selected = locker.selected(category).id === item.id;
      const button = document.createElement('button');
      button.dataset.cosmetic = item.id;
      button.className = `cosmetic-item ${selected ? 'selected' : ''} ${owned ? '' : 'locked'}`;
      button.disabled = !!item.exclusive && !owned;
      button.innerHTML = `<b>${item.name}</b><small>${item.detail}</small><em>${selected ? '装備中' : owned ? '入手済み' : item.exclusive ? 'サーキット報酬' : `${item.cost} キー`}</em>`;
      button.onclick = () => {
        const result = locker.unlockAndSelect(item.id, contracts);
        if (!result.ok) {
          audio.play('defeat');
          button.querySelector('em').textContent = `${item.cost} キー必要`;
          return;
        }
        weapon.setCosmetics(locker.loadout());
        configureHudSlots();
        audio.play('pickup');
        renderCosmetics();
        renderContracts();
      };
      group.append(button);
    });
    grid.append(group);
  });
}

function record(statName, amount = 1) {
  const completed = contracts.record(statName, amount);
  if (completed.length) pendingRewards.push(...completed);
  renderContracts();
}

player.onSlide = () => {
  if (state === 'playing' || state === 'range') record('slides');
};

function openPanel(id) {
  ['loadout', 'locker', 'contracts', 'settings'].forEach(panel => setPanel(panel, panel === id));
}

document.getElementById('loadoutButton').onclick = () => { renderLoadout(); openPanel('loadout'); };
document.getElementById('lockerButton').onclick = () => { renderCosmetics(); openPanel('locker'); };
document.getElementById('contractsButton').onclick = () => { renderContracts(); openPanel('contracts'); };
document.getElementById('settingsButton').onclick = () => openPanel('settings');
document.querySelectorAll('.close-panel').forEach(button => {
  button.onclick = () => setPanel(button.dataset.close, false);
});

function preparePlayView() {
  ['start', 'loadout', 'locker', 'contracts', 'settings', 'message', 'circuit'].forEach(id => setPanel(id, false));
  document.getElementById('hud').classList.remove('hidden');
  configureHudSlots();
  if (!controls.mobile) renderer.domElement.requestPointerLock();
}

function startDuel() {
  audio.unlock();
  ensureArena(arenaMapKey);
  mode = 'duel';
  activeRival = null;
  rolledStyleKey = null;
  prepareDuelStyle();
  roundTarget = 5;
  document.getElementById('again').textContent = 'もう一度';
  stats = freshStats();
  pendingRewards = [];
  playerRounds = rivalRounds = 0;
  gearDraft.reset();
  applyGearModifiers();
  roundNumber = 1;
  config = DIFFICULTIES[difficultyKey];
  player.configure(config.playerHp);
  enemy.configure(config, activeStyle, activeWeapon);
  enemy.gameEnded = false;
  preparePlayView();
  beginRound();
}

function startRange() {
  audio.unlock();
  ensureArena('crossline');
  mode = 'range';
  activeRival = null;
  activeStyle = rivalStyle;
  activeWeapon = 'pulse';
  roundTarget = 5;
  state = 'range';
  roundToken++;
  rangeTarget = 0;
  stats = freshStats();
  pendingRewards = [];
  gearDraft.reset();
  applyGearModifiers();
  player.configure(100);
  player.respawn(new THREE.Vector3(14, 1.7, 16), 0);
  enemy.configure({ ...DIFFICULTIES.easy, enemyHp: 100, enemySpeed: 0, reaction: 99, attack: 0 }, activeStyle, 'pulse');
  enemy.gameEnded = false;
  enemy.respawn(new THREE.Vector3(14, 0, 4));
  weapon.refillAll();
  controls.clearActions();
  preparePlayView();
  ui.setRounds(0, 0, 0, 'RANGE');
  ui.startRoundClock();
  ui.showBanner('射撃場', '命中・ヘッドショット・道具を練習', 1250);
}

document.getElementById('duelButton').onclick = startDuel;
document.getElementById('rangeButton').onclick = startRange;

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function beginRound() {
  const token = ++roundToken;
  state = 'countdown';
  enemy.gameEnded = false;
  // ランダム指定なら毎ラウンド引き直す。同じ試合でも相手の戦い方と武器が入れ替わる。
  if (mode === 'duel' && isRandomStyle()) rollDuelStyle();
  enemy.configure(config, activeStyle, activeWeapon);
  player.respawn(PLAYER_SPAWN, 0);
  enemy.respawn(RIVAL_SPAWN);
  weapon.refillAll();
  controls.clearActions();
  const matchLabel = mode === 'circuit' ? 'CIRCUIT' : 'DUEL';
  ui.setRounds(playerRounds, rivalRounds, roundNumber, matchLabel, roundTarget);
  // カウントダウン中は state が playing ではないため、ループ側で経過時間は進まない。
  ui.startRoundClock();
  ui.update(player, weapon, enemy);
  effects.ring(PLAYER_SPAWN, 0x64c7ff);
  effects.ring(RIVAL_SPAWN, 0xff5b82);
  const styleNote = mode === 'duel' && isRandomStyle() ? ` · ${activeStyle.name}（${activeStyle.label}）` : '';
  ui.showBanner(`ラウンド ${roundNumber}`, `${roundTarget}本先取${styleNote}`);
  await delay(650);
  for (const count of ['3', '2', '1']) {
    if (token !== roundToken || state !== 'countdown') return;
    ui.showBanner(count, '準備');
    audio.play('round');
    await delay(520);
  }
  if (token !== roundToken || state !== 'countdown') return;
  ui.showBanner('ブラスト！', '開始', 520);
  state = 'playing';
}

function finishRound(playerWon) {
  if (state !== 'playing') return;
  state = 'roundEnd';
  ui.stopRoundClock();
  roundToken++;
  enemy.clearShots();
  weapon.clearProjectiles();
  controls.clearActions();
  if (playerWon) {
    playerRounds++;
    if (player.hp <= Math.min(25, player.maxHp * .25)) stats.clutches++;
    record('roundsWon');
    ui.feed('自分 ▸ ライバル', true);
  } else {
    rivalRounds++;
    ui.feed('ライバル ▸ 自分');
  }
  ui.setRounds(playerRounds, rivalRounds, roundNumber, mode === 'circuit' ? 'CIRCUIT' : 'DUEL', roundTarget);
  ui.showBanner(playerWon ? 'ラウンド勝利' : 'ラウンド敗北', `${playerRounds} — ${rivalRounds}`);
  if (playerRounds >= roundTarget || rivalRounds >= roundTarget) {
    setTimeout(() => finishMatch(playerRounds >= roundTarget), 1200);
    return;
  }
  roundNumber++;
  if (!gearDraft.complete) setTimeout(() => showGearDraft(!playerWon), 850);
  else setTimeout(() => beginRound(), 1350);
}

function applyGearModifiers() {
  const modifiers = gearDraft.modifiers();
  player.setModifiers(modifiers);
  weapon.setModifiers(modifiers);
  ui.setGears(gearDraft.owned);
}

function showGearDraft(clutch = false) {
  if (state !== 'roundEnd') return;
  state = 'gearSelect';
  document.exitPointerLock?.();
  const choices = gearDraft.choices();
  document.getElementById('gearEyebrow').textContent = clutch ? '逆転ギア' : 'ラウンド強化';
  const container = document.getElementById('gearChoices');
  container.replaceChildren();
  choices.forEach((gear, index) => {
    const button = document.createElement('button');
    button.className = `gear-choice ${clutch && index === 0 ? 'clutch' : ''}`;
    button.innerHTML = `<i>${gear.icon}</i><b>${gear.name}</b><small>${gear.detail}</small>`;
    button.onclick = () => {
      const selected = gearDraft.add(gear.id);
      if (!selected) return;
      applyGearModifiers();
      audio.play('pickup');
      setPanel('gearSelect', false);
      if (!controls.mobile) renderer.domElement.requestPointerLock();
      beginRound();
    };
    container.append(button);
  });
  setPanel('gearSelect', true);
}

function finishMatch(win) {
  if (state !== 'roundEnd') return;
  state = 'matchEnd';
  lastMatchWon = win;
  enemy.gameEnded = true;
  enemy.clearShots();
  weapon.clearProjectiles();
  if (mode === 'circuit') {
    finishCircuitMatch(win);
    return;
  }
  if (win) {
    record('matchesWon');
    contracts.earn(1);
  }
  audio.play(win ? 'victory' : 'defeat');
  const earnedKeys = (win ? 1 : 0) + pendingRewards.reduce((sum, contract) => sum + contract.reward, 0);
  const rewardText = earnedKeys ? `${earnedKeys} キー獲得` : '';
  ui.end(win, playerRounds, rivalRounds, stats, rewardText, locker.loadout().title);
}

function finishCircuitMatch(win) {
  const contractKeys = pendingRewards.reduce((sum, contract) => sum + contract.reward, 0);
  if (!win) {
    audio.play('defeat');
    document.getElementById('again').textContent = 'ステージ再挑戦';
    ui.end(false, playerRounds, rivalRounds, stats, '', `${activeRival.name}に阻止された`, activeRival.name);
    return;
  }

  circuitProgress.recordWin(circuitIndex);
  contracts.earn(activeRival.reward);
  circuitRunKeys += activeRival.reward + contractKeys;
  renderContracts();
  const finalStage = circuitIndex === CIRCUIT_RIVALS.length - 1;
  if (!finalStage) {
    state = 'circuitTransition';
    audio.play('victory');
    ui.showBanner('ライバル撃破', `${activeRival.name} · +${activeRival.reward + contractKeys} キー`, 900);
    setTimeout(() => {
      if (state !== 'circuitTransition') return;
      circuitIndex++;
      showCircuitCard();
    }, 1050);
    return;
  }

  const elapsed = circuitProgress.complete();
  locker.grant('finish-zero');
  locker.grant('title-circuit');
  weapon.setCosmetics(locker.loadout());
  renderCircuitRecord();
  audio.play('victory');
  document.getElementById('again').textContent = 'もう一度挑戦';
  ui.end(true, playerRounds, rivalRounds, stats, `${circuitRunKeys} キー · ${circuitProgress.formatTime(elapsed)}`, 'サーキット王者', activeRival.name);
}

function showMenu() {
  roundToken++;
  state = 'menu';
  ui.stopRoundClock();
  enemy.gameEnded = true;
  enemy.clearShots();
  weapon.clearProjectiles();
  controls.clearActions();
  ui.hideBanner();
  document.exitPointerLock?.();
  document.getElementById('hud').classList.add('hidden');
  ['message', 'loadout', 'locker', 'contracts', 'settings', 'gearSelect', 'circuit'].forEach(id => setPanel(id, false));
  setPanel('start', true);
  activeRival = null;
  rolledStyleKey = null;
  activeStyle = rivalStyle;
  activeWeapon = rivalStyle.weapon || 'pulse';
  ui.setRivalStyle(isRandomStyle() ? { label: 'ランダム' } : rivalStyle);
  ensureArena(arenaMapKey);
  enemy.respawn(RIVAL_SPAWN);
  renderContracts();
  renderCircuitRecord();
}

document.getElementById('menuButton').onclick = showMenu;
// 左上の目のアイコン。ギア・キルログなど二次情報を隠して画面を広く見せる。
document.getElementById('hudToggle').onclick = event => {
  event.stopPropagation();
  const lite = document.body.classList.toggle('hud-lite');
  event.currentTarget.setAttribute('aria-label', lite ? '表示を戻す' : '表示を減らす');
};
document.getElementById('resultMenu').onclick = showMenu;
document.getElementById('again').onclick = () => {
  if (mode !== 'circuit') { startDuel(); return; }
  if (lastMatchWon && circuitIndex === CIRCUIT_RIVALS.length - 1) startCircuit();
  else showCircuitCard();
};

enemy.onDeath = () => {
  if (state === 'playing') {
    finishRound(true);
    return;
  }
  if (state !== 'range') return;
  rangeTarget++;
  ui.feed(`ターゲット ${rangeTarget}`, true);
  const token = roundToken;
  setTimeout(() => {
    if (state !== 'range' || token !== roundToken) return;
    const x = [10, 14, 18][rangeTarget % 3];
    enemy.respawn(new THREE.Vector3(x, 0, 4));
  }, 650);
};

function hurt(amount, source) {
  if (!amount || state !== 'playing') return;
  stats.damageTaken += player.takeDamage(amount);
  ui.damageTaken(source || enemy.group.position, player.hp / player.maxHp);
  audio.play('oof');
  if (player.hp > 0 && player.hp / player.maxHp < .3) audio.play('danger');
  if (player.hp <= 0) finishRound(false);
}

const weaponHandlers = {
  onFire(info) {
    if (info.slot === 'primary' || info.slot === 'secondary') stats.shots++;
  },
  onDamage(damage, position, meta) {
    if (!meta.utility && !meta.melee) stats.hits++;
    stats.damage += damage;
    stats.bestHit = Math.max(stats.bestHit, damage);
    if (meta.headshot) { stats.headshots++; record('headshots'); }
    if (meta.utility) record('utilityHits');
    if (state === 'range') record('rangeHits');
    const modifiers = gearDraft.modifiers();
    if (modifiers.reveal) enemy.revealTimer = 2.5;
    if (modifiers.gravityShot && meta.pushDirection) enemy.displace(meta.pushDirection);
    if (meta.kill && meta.headshot) audio.play('critical');
    ui.damage(damage, position, meta);
  },
  onUtility(type) {
    if (type === 'heal') ui.feed('回復 +45', true);
  },
};

function loop() {
  requestAnimationFrame(loop);
  // 物理は1フレーム .04 秒で頭打ちにする。経過時間の表示だけは実測値を渡し、
  // 低フレームレートの端末で時計が遅れないようにする。
  const frameSeconds = clock.getDelta();
  const dt = Math.min(frameSeconds, .04);
  const active = state === 'playing' || state === 'range';
  if (active) {
    const input = controls.sample();
    const assist = touchAimAssist.update(dt, {
      touchInput: controls.lastInput === 'touch',
      touchLooking: controls.touchLooking,
      firing: input.fire,
      look: controls.look,
      active,
    });
    player.update(dt, input, controls.look, assist);
    weapon.update(dt, input, player, enemy, obstacles, weaponHandlers);
    enemy.update(dt, player, hurt);
    ui.update(player, weapon, enemy, frameSeconds);
    mobileDebug.update(dt, touchAimAssist.debugState, player.jumpDebug(), controls);
  }
  effects.update(dt);
  renderer.render(scene, camera);
}

renderLoadout();
renderContracts();
renderCircuitRecord();
configureHudSlots();
enemy.configure(config, rivalStyle, activeWeapon);
ui.setRounds(0, 0, 1, 'DUEL', 5);
loop();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  weapon.layout();
});
addEventListener('contextmenu', event => event.preventDefault());
