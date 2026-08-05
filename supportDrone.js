import * as THREE from 'three';

export class SupportDrone {
  constructor(scene,effects,audio){this.scene=scene;this.effects=effects;this.audio=audio;this.group=new THREE.Group();const body=new THREE.Mesh(new THREE.SphereGeometry(.38,8,6),new THREE.MeshLambertMaterial({color:0x2daaff,emissive:0x1266aa,emissiveIntensity:.5})),eye=new THREE.Mesh(new THREE.ConeGeometry(.14,.5,6),new THREE.MeshBasicMaterial({color:0xaaffff}));eye.rotation.x=-Math.PI/2;eye.position.z=-.38;this.group.add(body,eye);this.group.visible=false;scene.add(this.group);this.active=false;this.healTimer=0;this.shotTimer=0}
  show(player){if(this.active)return;this.active=true;this.group.visible=true;this.group.position.copy(player.position);this.effects.ring(player.position,0x38bfff);this.audio.play('drone')}
  hide(){if(!this.active)return;this.effects.burst(this.group.position,0x38bfff,10);this.active=false;this.group.visible=false}
  update(dt,player,enemy){if(!this.active)return;const desired=player.position.clone().add(new THREE.Vector3(1.4,1,-.8).applyAxisAngle(new THREE.Vector3(0,1,0),player.yaw));this.group.position.lerp(desired,Math.min(1,dt*3));this.group.lookAt(enemy.group.position);this.healTimer-=dt;this.shotTimer-=dt;if(this.healTimer<=0){player.hp=Math.min(player.maxHp,player.hp+8);this.healTimer=5}if(enemy.alive&&this.shotTimer<=0&&this.group.position.distanceTo(enemy.group.position)<18){enemy.damage(3,{drone:true});this.effects.tracer(this.group.position,enemy.aimPoint,0x54dfff);this.shotTimer=3.5}}
}
