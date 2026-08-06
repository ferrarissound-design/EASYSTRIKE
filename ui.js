import * as THREE from 'three';

export class UI {
  constructor(camera) {
    const byId = id => document.getElementById(id);
    this.camera = camera;
    this.hp = byId('hpBar');
    this.hpText = byId('hpText');
    this.ammo = byId('ammo');
    this.reload = byId('reloadText');
    this.weaponName = byId('weaponName');
    this.crosshair = byId('crosshair');
    this.damageLayer = byId('damageNumbers');
    this.buffs = byId('buffs');
    this.nametagBox = byId('nametag');
    this.nametagBar = byId('nametagBar');
    this.killfeed = byId('killfeed');
    this.banner = byId('roundBanner');
    this.hitDirectionBox = byId('hitDirection');
    this.damageFlash = byId('damageFlash');
    this.combatCallout = byId('combatCallout');
    this.previous = {};
    this.projected = new THREE.Vector3();
    this.markerTimer = 0;
    this.bannerTimer = 0;
    this.hitTimer = 0;
    this.flashTimer = 0;
    this.calloutTimer = 0;
  }

  write(element, key, value) {
    if (this.previous[key] === value) return;
    this.previous[key] = value;
    element.textContent = value;
  }

  configureSlots(definitions, activeIndex, onSelect) {
    const container = document.getElementById('weaponSlots');
    container.replaceChildren();
    definitions.forEach((definition, index) => {
      const button = document.createElement('button');
      button.dataset.weapon = index;
      button.innerHTML = `<b>${index + 1}</b> ${definition.shortName}<small>${definition.slotLabel}</small>`;
      button.onclick = event => { event.stopPropagation(); onSelect(index); };
      container.append(button);
    });
    this.selectWeapon(activeIndex);
  }

  setGears(gears = []) {
    document.getElementById('gearHud').innerHTML = gears.map(gear => `<span>${gear.name}</span>`).join('');
  }

  setRivalStyle(style) {
    document.getElementById('rivalName').textContent = style?.label || 'RIVAL';
  }

  selectWeapon(index) {
    document.querySelectorAll('#weaponSlots button').forEach((button, buttonIndex) => button.classList.toggle('selected', buttonIndex === index));
    document.querySelector('.ammo')?.animate([{ transform: 'translateY(7px)', opacity: .45 }, { transform: 'none', opacity: 1 }], 170);
  }

  setRounds(playerRounds, rivalRounds, roundNumber, mode = 'DUEL', target = 5) {
    this.write(document.getElementById('playerRounds'), 'playerRounds', playerRounds);
    this.write(document.getElementById('rivalRounds'), 'rivalRounds', rivalRounds);
    this.write(document.getElementById('roundNumber'), 'roundNumber', mode === 'RANGE' ? 'FREE PRACTICE' : `ROUND ${roundNumber}`);
    this.write(document.getElementById('modeLabel'), 'modeLabel', mode);
    [['playerRoundDots', playerRounds], ['rivalRoundDots', rivalRounds]].forEach(([id, score]) => {
      const box = document.getElementById(id);
      box.style.gridTemplateColumns = `repeat(${target}, 1fr)`;
      if (box.children.length !== target) {
        box.replaceChildren();
        for (let index = 0; index < target; index++) box.append(document.createElement('s'));
      }
      [...box.children].forEach((dot, index) => dot.classList.toggle('on', index < score));
    });
  }

  showBanner(title, subtitle = '', duration = 0) {
    clearTimeout(this.bannerTimer);
    this.banner.querySelector('b').textContent = title;
    this.banner.querySelector('small').textContent = subtitle;
    this.banner.classList.remove('hidden');
    if (duration) this.bannerTimer = setTimeout(() => this.hideBanner(), duration);
  }

  hideBanner() { this.banner.classList.add('hidden'); }

  update(player, weapon, enemy) {
    const ratio = Math.max(0, player.hp / player.maxHp * 100);
    if (this.previous.hpRatio !== ratio) {
      this.previous.hpRatio = ratio;
      this.hp.style.width = `${ratio}%`;
      this.hp.style.background = ratio < 30 ? '#ff3f59' : '';
    }
    this.write(this.hpText, 'hpText', Math.ceil(player.hp));
    this.write(this.ammo, 'ammo', weapon.currentAmmo);
    this.write(this.reload, 'reload', weapon.reloading ? 'RELOADING...' : weapon.cooldownLabel);
    this.write(this.weaponName, 'weaponName', weapon.definition.name);
    this.write(this.buffs, 'buffs', player.sliding ? 'SLIDING' : player.crouched ? 'CROUCHED' : player.sprinting ? 'SPRINTING' : '');
    this.nametag(enemy);
  }

  nametag(enemy) {
    if (!enemy) return;
    const distance = this.camera.position.distanceTo(enemy.group.position);
    this.projected.copy(enemy.labelPoint).project(this.camera);
    const show = enemy.alive && enemy.visibleToPlayer && this.projected.z < 1 && distance < 42;
    if (!show) {
      this.nametagBox.classList.add('hidden');
      return;
    }
    this.nametagBox.classList.remove('hidden');
    const scale = Math.max(.55, Math.min(1.05, 1.35 - distance / 40));
    const x = (this.projected.x * .5 + .5) * innerWidth;
    const y = (-this.projected.y * .5 + .5) * innerHeight;
    this.nametagBox.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%) scale(${scale.toFixed(2)})`;
    const hp = Math.max(0, enemy.hp / enemy.maxHp * 100);
    this.nametagBar.style.width = `${hp}%`;
    this.nametagBar.style.background = hp < 30 ? '#ff3b4e' : '';
  }

  marker({ kill = false, headshot = false } = {}) {
    clearTimeout(this.markerTimer);
    this.crosshair.classList.remove('hit', 'kill', 'headshot');
    void this.crosshair.offsetWidth;
    this.crosshair.classList.add(kill ? 'kill' : 'hit');
    if (headshot) this.crosshair.classList.add('headshot');
    this.markerTimer = setTimeout(() => this.crosshair.classList.remove('hit', 'kill', 'headshot'), 170);
  }

  damage(amount, position, meta = {}) {
    const vector = position.clone().project(this.camera);
    const element = document.createElement('div');
    element.className = `damage-number ${meta.headshot ? 'headshot' : ''} ${meta.kill ? 'kill' : ''}`;
    element.textContent = meta.kill ? `KO ${amount}` : meta.headshot ? `HEAD ${amount}` : amount;
    element.style.left = `${(vector.x * .5 + .5) * innerWidth}px`;
    element.style.top = `${(-vector.y * .5 + .5) * innerHeight}px`;
    this.damageLayer.append(element);
    setTimeout(() => element.remove(), 850);
    this.marker(meta);
    if (meta.kill) this.callout('ELIMINATED', meta.headshot ? 'HEADSHOT FINISH' : 'ROUND POINT', true);
    else if (meta.headshot) this.callout('HEADSHOT', `${amount} DAMAGE`);
  }

  feed(text, mine = false) {
    const item = document.createElement('li');
    if (mine) item.className = 'mine';
    item.textContent = text;
    this.killfeed.prepend(item);
    while (this.killfeed.children.length > 3) this.killfeed.lastChild.remove();
    setTimeout(() => item.remove(), 3500);
  }

  callout(title, detail = '', kill = false) {
    clearTimeout(this.calloutTimer);
    this.combatCallout.querySelector('b').textContent = title;
    this.combatCallout.querySelector('small').textContent = detail;
    this.combatCallout.classList.remove('hidden', 'kill');
    if (kill) this.combatCallout.classList.add('kill');
    void this.combatCallout.offsetWidth;
    this.combatCallout.style.animation = 'none';
    void this.combatCallout.offsetWidth;
    this.combatCallout.style.animation = '';
    this.calloutTimer = setTimeout(() => this.combatCallout.classList.add('hidden'), kill ? 760 : 520);
  }

  damageTaken(source, hpRatio = 1) {
    clearTimeout(this.hitTimer);
    clearTimeout(this.flashTimer);
    const dx = source.x - this.camera.position.x;
    const dz = source.z - this.camera.position.z;
    const angle = (Math.atan2(dx, -dz) + this.camera.rotation.y) * 180 / Math.PI;
    this.hitDirectionBox.style.transform = `translate(-50%, -50%) rotate(${angle.toFixed(1)}deg)`;
    this.hitDirectionBox.classList.remove('hidden');
    this.damageFlash.style.setProperty('--damage-opacity', Math.min(.82, .38 + (1 - hpRatio) * .5).toFixed(2));
    this.damageFlash.classList.toggle('critical', hpRatio < .3);
    this.damageFlash.classList.add('active');
    void this.damageFlash.offsetWidth;
    this.hitTimer = setTimeout(() => this.hitDirectionBox.classList.add('hidden'), 360);
    this.flashTimer = setTimeout(() => this.damageFlash.classList.remove('active'), 75);
  }

  end(win, playerRounds, rivalRounds, stats, contractText = '', playerTitle = 'FIRST BLAST', rivalName = 'RIVAL') {
    document.exitPointerLock?.();
    document.getElementById('resultEyebrow').textContent = playerTitle;
    document.getElementById('resultReward').textContent = contractText;
    document.getElementById('result').textContent = win ? 'VICTORY' : 'DEFEAT';
    document.getElementById('resultDetail').textContent = `YOU ${playerRounds}  —  ${rivalRounds} ${rivalName}`;
    const accuracy = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0;
    document.getElementById('matchStats').innerHTML = `
      <div><b>${accuracy}%</b><small>命中率</small></div>
      <div><b>${stats.headshots}</b><small>ヘッドショット</small></div>
      <div><b>${stats.damage}</b><small>総ダメージ</small></div>
      <div><b>${stats.bestHit}</b><small>最大一撃</small></div>
      <div><b>${stats.damageTaken}</b><small>被ダメージ</small></div>
      <div><b>${stats.clutches}</b><small>クラッチ</small></div>`;
    document.getElementById('message').classList.remove('hidden');
  }
}
