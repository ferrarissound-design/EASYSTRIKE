import * as THREE from 'three';

const DEFINITIONS = {
  health: { color:0x42ed78, label:'HP', respawn:10 }, ammo:{ color:0xffdc46, label:'AMMO', respawn:8 },
  shield:{ color:0x68dfff, label:'SHIELD', respawn:14 }, speed:{ color:0xff66d9, label:'SPEED', respawn:14 },
};

export class Pickups {
  constructor(scene, effects, audio) {
    this.scene=scene; this.effects=effects; this.audio=audio;
    this.items=[['health',-15,-2],['health',14,10],['ammo',0,12],['ammo',11,-14],['shield',-12,14],['speed',14,-2]].map(v=>this.create(...v));
  }
  create(type,x,z){const def=DEFINITIONS[type],group=new THREE.Group(),core=new THREE.Mesh(new THREE.OctahedronGeometry(.65),new THREE.MeshLambertMaterial({color:def.color,emissive:def.color,emissiveIntensity:.4})),ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.08,6,16),new THREE.MeshBasicMaterial({color:def.color}));ring.rotation.x=Math.PI/2;group.add(core,ring);group.position.set(x,1.1,z);group.userData={type,active:true,timer:0};this.scene.add(group);return group}
  nearestHealth(position){return this.items.filter(i=>i.userData.active&&i.userData.type==='health').sort((a,b)=>a.position.distanceToSquared(position)-b.position.distanceToSquared(position))[0]}
  collect(item, actor, weapon, isPlayer){const type=item.userData.type;if(type==='health'){const max=actor.maxHp||200;if(actor.hp>=max)return false;actor.hp=Math.min(max,actor.hp+50)}else if(!isPlayer)return false;else if(type==='ammo')weapon.refill();else if(type==='shield')actor.shieldUntil=performance.now()+7000;else if(type==='speed')actor.speedUntil=performance.now()+7000;item.userData.active=false;item.visible=false;item.userData.timer=DEFINITIONS[type].respawn;this.effects.burst(item.position,DEFINITIONS[type].color,8,.18,.6);this.audio.play(type==='health'?'heal':type==='shield'?'shield':'pickup');return true}
  update(dt,player,weapon,enemy){for(const item of this.items){item.rotation.y+=dt;item.position.y=1.1+Math.sin(performance.now()*.003+item.position.x)*.18;if(!item.userData.active){item.userData.timer-=dt;if(item.userData.timer<=0){item.userData.active=true;item.visible=true;this.effects.ring(item.position,DEFINITIONS[item.userData.type].color)}continue}if(item.position.distanceToSquared(player.position)<2.3)this.collect(item,player,weapon,true);else if(enemy.alive&&item.position.distanceToSquared(enemy.group.position)<2.3)this.collect(item,enemy,weapon,false)}}
}

