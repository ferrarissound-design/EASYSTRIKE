import * as THREE from 'three';
export class UI {
  constructor(camera){
    const id=name=>document.getElementById(name);
    this.camera=camera;this.hp=id('hpBar');this.hpText=id('hpText');this.ammo=id('ammo');this.reload=id('reloadText');this.crosshair=id('crosshair');this.damageLayer=id('damageNumbers');
    this.weaponName=id('weaponName');this.killCount=id('kills');this.deathCount=id('deaths');this.buffs=id('buffs');
    this.nametagBox=id('nametag');this.nametagBar=id('nametagBar');this.killfeed=id('killfeed');this.downedBox=id('downed');
    this.markerTimer=0;this.previous={};this.projected=new THREE.Vector3();
  }
  // 毎フレーム呼ばれるので、値が変わったときだけDOMへ書き込む。
  write(element,key,value){if(this.previous[key]===value)return;this.previous[key]=value;element.textContent=value}
  update(player,weapon,kills,deaths,enemy){
    const ratio=Math.max(0,player.hp/player.maxHp*100);
    if(this.previous.hpRatio!==ratio){this.previous.hpRatio=ratio;this.hp.style.width=`${ratio}%`;this.hp.style.background=player.hp<player.maxHp*.3?'#ff3b4e':''}
    this.write(this.hpText,'hpText',Math.ceil(player.hp));this.write(this.ammo,'ammo',weapon.currentAmmo);
    this.write(this.reload,'reload',weapon.reloading?'RELOADING...':'');this.write(this.weaponName,'weaponName',weapon.definition.name);
    this.write(this.killCount,'kills',kills);this.write(this.deathCount,'deaths',deaths);
    this.write(this.buffs,'buffs',[performance.now()<player.shieldUntil?'🛡 シールド':'',performance.now()<player.speedUntil?'⚡ スピード':''].filter(Boolean).join('　'));
    if(enemy)this.nametag(enemy);
  }
  // 敵の頭上のネームタグとHPバー。遮蔽物の向こうにいるときは隠す（本家と同じ挙動）。
  nametag(enemy){
    const distance=this.camera.position.distanceTo(enemy.group.position);
    this.projected.copy(enemy.labelPoint).project(this.camera);
    const show=enemy.alive&&enemy.visibleToPlayer&&this.projected.z<1&&distance<42;
    if(!show){if(this.previous.tagShown!==false){this.previous.tagShown=false;this.nametagBox.classList.add('hidden')}return}
    if(this.previous.tagShown!==true){this.previous.tagShown=true;this.nametagBox.classList.remove('hidden')}
    // left/topではなくtransformで動かす。毎フレームのレイアウト再計算を避けられる。
    const scale=Math.max(.55,Math.min(1.1,1.4-distance/40)),x=(this.projected.x*.5+.5)*innerWidth,y=(-this.projected.y*.5+.5)*innerHeight;
    this.nametagBox.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%) scale(${scale.toFixed(2)})`;
    const hp=Math.max(0,enemy.hp/enemy.maxHp*100);
    if(this.previous.tagHp!==hp){this.previous.tagHp=hp;this.nametagBar.style.width=`${hp}%`;this.nametagBar.style.background=hp<30?'#ff3b4e':''}
  }
  // キルフィード。最新を上に積み、3行を超えたら古いものから消す。
  feed(text,mine=false){const item=document.createElement('li');if(mine)item.className='mine';item.textContent=text;this.killfeed.prepend(item);while(this.killfeed.children.length>3)this.killfeed.lastChild.remove();setTimeout(()=>item.remove(),4000)}
  downed(show){this.downedBox.classList.toggle('hidden',!show)}
  selectWeapon(index){document.querySelectorAll('#weaponSlots button').forEach((button,i)=>button.classList.toggle('selected',i===index));document.querySelector('.ammo').animate([{transform:'translateY(8px)',opacity:.4},{transform:'none',opacity:1}],180)}
  marker(kill=false){clearTimeout(this.markerTimer);this.crosshair.classList.remove('hit','kill');void this.crosshair.offsetWidth;this.crosshair.classList.add(kill?'kill':'hit');this.markerTimer=setTimeout(()=>this.crosshair.classList.remove('hit','kill'),150)}
  damage(amount,position,kill=false){const vector=position.clone().project(this.camera);const element=document.createElement('div');element.className=`damage-number ${amount>=35?'big':''} ${kill?'kill':''}`;element.textContent=kill?`撃破! ${amount}`:amount;element.style.left=`${(vector.x*.5+.5)*innerWidth}px`;element.style.top=`${(-vector.y*.5+.5)*innerHeight}px`;this.damageLayer.append(element);setTimeout(()=>element.remove(),850);this.marker(kill)}
  end(win,kills,deaths){document.exitPointerLock?.();this.downed(false);document.getElementById('result').textContent=win?'Victory!':'Game Over';document.getElementById('resultDetail').textContent=`撃破 ${kills}　/　敗北 ${deaths}`;document.getElementById('message').classList.remove('hidden')}
}
