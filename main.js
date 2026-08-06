import * as THREE from 'three';
import { createArena, PLAYER_SPAWN, RIVAL_SPAWN } from './arena.js';
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
const obstacles = createArena(scene, colliders);
const effects = new Effects(scene, settings.quality);
const controls = new Controls(renderer.domElement, settings);
const player = new Player(camera, colliders, effects, audio);
let currentLoadout = loadLoadout();
const weapon = new Weapon(scene, camera, effects, audio, currentLoadout);
const enemy = new Enemy(scene, colliders, obstacles, effects, audio);
const ui = new UI(camera);
const contracts = new ContractTracker();
const clock = new THREE.Clock();
scene.add(camera);

let difficultyKey = loadDifficulty();
let config = DIFFICULTIES[difficultyKey];
let state = 'menu';
let mode = 'duel';
let roundNumber = 1;
let playerRounds = 0;
let rivalRounds = 0;
let roundToken = 0;
let rangeTarget = 0;
let pendingRewards = [];
let stats = freshStats();

function freshStats() {
  return { shots: 0, hits: 0, headshots: 0, damage: 0 };
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

function record(statName, amount = 1) {
  const completed = contracts.record(statName, amount);
  if (completed.length) pendingRewards.push(...completed);
  renderContracts();
}

player.onSlide = () => {
  if (state === 'playing' || state === 'range') record('slides');
};

function openPanel(id) {
  ['loadout', 'contracts', 'settings'].forEach(panel => setPanel(panel, panel === id));
}

document.getElementById('loadoutButton').onclick = () => { renderLoadout(); openPanel('loadout'); };
document.getElementById('contractsButton').onclick = () => { renderContracts(); openPanel('contracts'); };
document.getElementById('settingsButton').onclick = () => openPanel('settings');
document.querySelectorAll('.close-panel').forEach(button => {
  button.onclick = () => setPanel(button.dataset.close, false);
});

function preparePlayView() {
  ['start', 'loadout', 'contracts', 'settings', 'message'].forEach(id => setPanel(id, false));
  document.getElementById('hud').classList.remove('hidden');
  configureHudSlots();
  if (!controls.mobile) renderer.domElement.requestPointerLock();
}

function startDuel() {
  audio.unlock();
  mode = 'duel';
  stats = freshStats();
  pendingRewards = [];
  playerRounds = rivalRounds = 0;
  roundNumber = 1;
  config = DIFFICULTIES[difficultyKey];
  player.configure(config.playerHp);
  enemy.configure(config);
  enemy.gameEnded = false;
  preparePlayView();
  beginRound();
}

function startRange() {
  audio.unlock();
  mode = 'range';
  state = 'range';
  roundToken++;
  rangeTarget = 0;
  stats = freshStats();
  pendingRewards = [];
  player.configure(100);
  player.respawn(new THREE.Vector3(14, 1.7, 16), 0);
  enemy.configure({ ...DIFFICULTIES.easy, enemyHp: 100, enemySpeed: 0, reaction: 99, attack: 0 });
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
  enemy.configure(config);
  player.respawn(PLAYER_SPAWN, 0);
  enemy.respawn(RIVAL_SPAWN);
  weapon.refillAll();
  controls.clearActions();
  ui.setRounds(playerRounds, rivalRounds, roundNumber, 'DUEL');
  ui.update(player, weapon, enemy);
  effects.ring(PLAYER_SPAWN, 0x64c7ff);
  effects.ring(RIVAL_SPAWN, 0xff5b82);
  ui.showBanner(`ROUND ${roundNumber}`, 'FIRST TO 5');
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
    record('roundsWon');
    ui.feed('YOU ▸ RIVAL', true);
  } else {
    rivalRounds++;
    ui.feed('RIVAL ▸ YOU');
  }
  ui.setRounds(playerRounds, rivalRounds, roundNumber, 'DUEL');
  ui.showBanner(playerWon ? 'ROUND WON' : 'ROUND LOST', `${playerRounds} — ${rivalRounds}`);
  if (playerRounds >= 5 || rivalRounds >= 5) {
    setTimeout(() => finishMatch(playerRounds >= 5), 1200);
    return;
  }
  roundNumber++;
  setTimeout(() => beginRound(), 1350);
}

function finishMatch(win) {
  if (state !== 'roundEnd') return;
  state = 'matchEnd';
  enemy.gameEnded = true;
  enemy.clearShots();
  weapon.clearProjectiles();
  if (win) record('matchesWon');
  audio.play(win ? 'victory' : 'defeat');
  const rewardText = pendingRewards.length ? `${pendingRewards.reduce((sum, contract) => sum + contract.reward, 0)} KEYS獲得` : '';
  ui.end(win, playerRounds, rivalRounds, stats, rewardText);
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
  ['message', 'loadout', 'contracts', 'settings'].forEach(id => setPanel(id, false));
  setPanel('start', true);
  enemy.respawn(RIVAL_SPAWN);
  renderContracts();
}

document.getElementById('menuButton').onclick = showMenu;
document.getElementById('resultMenu').onclick = showMenu;
document.getElementById('again').onclick = startDuel;

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

function hurt(amount) {
  if (!amount || state !== 'playing') return;
  player.takeDamage(amount);
  ui.hitDirection();
  audio.play('oof');
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
    if (meta.headshot) { stats.headshots++; record('headshots'); }
    if (meta.utility) record('utilityHits');
    if (state === 'range') record('rangeHits');
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
configureHudSlots();
enemy.configure(config);
ui.setRounds(0, 0, 1, 'DUEL');
loop();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  weapon.layout();
});
addEventListener('contextmenu', event => event.preventDefault());
