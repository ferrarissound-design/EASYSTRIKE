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
import { RIVAL_STYLES, loadRivalStyle } from './rivalStyles.js';
import { CosmeticLocker, COSMETICS } from './cosmetics.js';
import { CIRCUIT_RIVALS, CircuitProgress } from './circuit.js';

const settings = loadSettings();
applySettings(settings);
const audio = new GameAudio(settings);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfdcf8);
scene.fog = new THREE.Fog(0xcfe5fa, 46, 92);
const camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, .1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: settings.quality !== 'low', powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, settings.quality === 'high' ? 2 : 1.25));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = settings.quality !== 'low';
document.getElementById('game').append(renderer.domElement);

const colliders = [];
const obstacles = [];
let arenaMapKey = loadArenaMap();
let activeArenaKey = arenaMapKey;
let arenaRoot = createArena(scene, colliders, activeArenaKey, obstacles).root;
const effects = new Effects(scene, settings.quality);
const controls = new Controls(renderer.domElement, settings);
const player = new Player(camera, colliders, effects, audio);
let currentLoadout = loadLoadout();
const weapon = new Weapon(scene, camera, effects, audio, currentLoadout);
const enemy = new Enemy(scene, colliders, obstacles, effects, audio);
const ui = new UI(camera);
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
let rivalStyle = RIVAL_STYLES[rivalStyleKey];
let activeStyle = rivalStyle;
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
bindSettings(settings, () => { audio.settings = settings; });

function selectRivalStyle(value) {
  rivalStyleKey = value;
  rivalStyle = RIVAL_STYLES[value];
  localStorage.setItem('firstBlastRivalStyle', value);
  document.querySelectorAll('#rivalStyle button').forEach(button => button.classList.toggle('selected', button.dataset.value === value));
  document.getElementById('styleHint').textContent = rivalStyle.detail;
  ui.setRivalStyle(rivalStyle);
}

document.querySelectorAll('#rivalStyle button').forEach(button => { button.onclick = () => selectRivalStyle(button.dataset.value); });
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
  document.getElementById('circuitRecord').textContent = `BEST ${circuitProgress.data.bestStage}/5 · ${circuitProgress.formatTime()}`;
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
  ensureArena(activeRival.map);
  document.exitPointerLock?.();
  document.getElementById('hud').classList.add('hidden');
  ['start', 'loadout', 'locker', 'contracts', 'settings', 'message', 'gearSelect'].forEach(id => setPanel(id, false));
  setPanel('circuit', true);
  const card = document.querySelector('.circuit-card');
  card.style.setProperty('--rival-color', activeRival.color);
  document.getElementById('circuitStage').textContent = `STAGE ${circuitIndex + 1} / ${CIRCUIT_RIVALS.length}`;
  document.getElementById('circuitKeys').textContent = `+${activeRival.reward} KEY · FIRST TO ${activeRival.firstTo}`;
  document.getElementById('circuitName').textContent = activeRival.name;
  document.getElementById('circuitTitle').textContent = activeRival.title;
  document.getElementById('circuitQuote').textContent = `“${activeRival.quote}”`;
  document.getElementById('circuitWeapon').textContent = activeRival.weapon === 'adaptive' ? 'SHIFT ARSENAL' : activeRival.weapon.toUpperCase();
  document.getElementById('circuitStyle').textContent = activeStyle.label;
  document.getElementById('circuitMap').textContent = ARENA_MAPS[activeRival.map].name;
  document.getElementById('circuitWeakness').textContent = activeRival.weakness;
  document.getElementById('rivalEmblem').textContent = activeRival.name[0];
  document.getElementById('circuitLaunch').textContent = circuitIndex === CIRCUIT_RIVALS.length - 1 ? 'FACE THE CHAMPION' : 'CHALLENGE';
  const route = document.getElementById('circuitRoute');
  route.replaceChildren(...CIRCUIT_RIVALS.map((_, index) => {
    const node = document.createElement('i');
    node.className = index < circuitIndex ? 'done' : index === circuitIndex ? 'active' : '';
    return node;
  }));
  config = { playerHp: 100, ...activeRival.config };
  enemy.configure(config, activeStyle, activeRival.weapon);
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
  enemy.configure(config, activeStyle, activeRival.weapon);
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
  document.getElementById('menuKeys').textContent = `${contracts.keys} KEY`;
  document.getElementById('contractKeys').textContent = contracts.keys;
  const list = document.getElementById('contractList');
  list.replaceChildren();
  CONTRACTS.forEach(contract => {
    const progress = contracts.progress(contract);
    const row = document.createElement('div');
    row.className = `contract ${progress >= contract.target ? 'done' : ''}`;
    row.innerHTML = `<div><b>${contract.title}</b><small>${contract.detail}</small></div><b>${progress >= contract.target ? '完了' : `${progress}/${contract.target} • +${contract.reward} KEY`}</b><div class="contract-progress"><i style="width:${progress / contract.target * 100}%"></i></div>`;
    list.append(row);
  });
}

function renderCosmetics() {
  document.getElementById('lockerKeys').textContent = contracts.keys;
  const grid = document.getElementById('cosmeticGrid');
  grid.replaceChildren();
  [['finish', 'WEAPON FINISH'], ['impact', 'IMPACT FX'], ['title', 'PLAYER TITLE']].forEach(([category, label]) => {
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
      button.innerHTML = `<b>${item.name}</b><small>${item.detail}</small><em>${selected ? 'EQUIPPED' : owned ? 'OWNED' : item.exclusive ? 'CIRCUIT REWARD' : `${item.cost} KEY`}</em>`;
      button.onclick = () => {
        const result = locker.unlockAndSelect(item.id, contracts);
        if (!result.ok) {
          audio.play('defeat');
          button.querySelector('em').textContent = `NEED ${item.cost} KEY`;
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
  activeStyle = rivalStyle;
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
  enemy.configure(config, activeStyle, 'pulse');
  ui.setRivalStyle(activeStyle);
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
  ui.showBanner('SHOOTING RANGE', '命中・ヘッドショット・Utilityを練習', 1250);
}

document.getElementById('duelButton').onclick = startDuel;
document.getElementById('rangeButton').onclick = startRange;

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function beginRound() {
  const token = ++roundToken;
  state = 'countdown';
  enemy.gameEnded = false;
  enemy.configure(config, activeStyle, activeRival?.weapon || 'pulse');
  player.respawn(PLAYER_SPAWN, 0);
  enemy.respawn(RIVAL_SPAWN);
  weapon.refillAll();
  controls.clearActions();
  const matchLabel = mode === 'circuit' ? 'CIRCUIT' : 'DUEL';
  ui.setRounds(playerRounds, rivalRounds, roundNumber, matchLabel, roundTarget);
  ui.update(player, weapon, enemy);
  effects.ring(PLAYER_SPAWN, 0x64c7ff);
  effects.ring(RIVAL_SPAWN, 0xff5b82);
  ui.showBanner(`ROUND ${roundNumber}`, `FIRST TO ${roundTarget}`);
  await delay(650);
  for (const count of ['3', '2', '1']) {
    if (token !== roundToken || state !== 'countdown') return;
    ui.showBanner(count, 'GET READY');
    audio.play('round');
    await delay(520);
  }
  if (token !== roundToken || state !== 'countdown') return;
  ui.showBanner('BLAST!', 'FIGHT', 520);
  state = 'playing';
}

function finishRound(playerWon) {
  if (state !== 'playing') return;
  state = 'roundEnd';
  roundToken++;
  enemy.clearShots();
  weapon.clearProjectiles();
  controls.clearActions();
  if (playerWon) {
    playerRounds++;
    if (player.hp <= Math.min(25, player.maxHp * .25)) stats.clutches++;
    record('roundsWon');
    ui.feed('YOU ▸ RIVAL', true);
  } else {
    rivalRounds++;
    ui.feed('RIVAL ▸ YOU');
  }
  ui.setRounds(playerRounds, rivalRounds, roundNumber, mode === 'circuit' ? 'CIRCUIT' : 'DUEL', roundTarget);
  ui.showBanner(playerWon ? 'ROUND WON' : 'ROUND LOST', `${playerRounds} — ${rivalRounds}`);
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
  document.getElementById('gearEyebrow').textContent = clutch ? 'CLUTCH PICK' : 'ROUND UPGRADE';
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
  const rewardText = earnedKeys ? `${earnedKeys} KEY獲得` : '';
  ui.end(win, playerRounds, rivalRounds, stats, rewardText, locker.loadout().title);
}

function finishCircuitMatch(win) {
  const contractKeys = pendingRewards.reduce((sum, contract) => sum + contract.reward, 0);
  if (!win) {
    audio.play('defeat');
    document.getElementById('again').textContent = 'RETRY STAGE';
    ui.end(false, playerRounds, rivalRounds, stats, '', `${activeRival.name} STOPPED THE RUN`, activeRival.name);
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
    ui.showBanner('RIVAL DEFEATED', `${activeRival.name} · +${activeRival.reward + contractKeys} KEY`, 900);
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
  document.getElementById('again').textContent = 'RUN AGAIN';
  ui.end(true, playerRounds, rivalRounds, stats, `${circuitRunKeys} KEY · ${circuitProgress.formatTime(elapsed)}`, 'CIRCUIT CHAMPION', activeRival.name);
}

function showMenu() {
  roundToken++;
  state = 'menu';
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
  activeStyle = rivalStyle;
  ui.setRivalStyle(rivalStyle);
  ensureArena(arenaMapKey);
  enemy.respawn(RIVAL_SPAWN);
  renderContracts();
  renderCircuitRecord();
}

document.getElementById('menuButton').onclick = showMenu;
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
  ui.feed(`TARGET ${rangeTarget}`, true);
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

function aimAssist() {
  if (settings.aimAssist === 'off' || !enemy.alive) return { x: 0, y: 0, strength: 0 };
  const projected = enemy.aimPoint.project(camera);
  if (projected.z > 1 || Math.abs(projected.x) > .3 || Math.abs(projected.y) > .3) return { x: 0, y: 0, strength: 0 };
  const levels = { weak: .2, normal: .45, strong: .75 };
  const strength = (levels[settings.aimAssist] || 0) * config.assist * (controls.mobile ? 1.2 : 1);
  return { x: -projected.x * strength, y: projected.y * strength, strength };
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
    if (type === 'heal') ui.feed('HEAL +45', true);
  },
};

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .04);
  const active = state === 'playing' || state === 'range';
  if (active) {
    const input = controls.sample();
    player.update(dt, input, controls.look, aimAssist());
    weapon.update(dt, input, player, enemy, obstacles, weaponHandlers);
    enemy.update(dt, player, hurt);
    ui.update(player, weapon, enemy);
  }
  effects.update(dt);
  renderer.render(scene, camera);
}

renderLoadout();
renderContracts();
renderCircuitRecord();
configureHudSlots();
enemy.configure(config, rivalStyle, 'pulse');
ui.setRounds(0, 0, 1, 'DUEL', 5);
loop();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  weapon.layout();
});
addEventListener('contextmenu', event => event.preventDefault());
