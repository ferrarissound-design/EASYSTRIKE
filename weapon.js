import * as THREE from 'three';
export class Weapon{
 constructor(scene,camera){this.scene=scene;this.camera=camera;this.ammo=20;this.cooldown=0;this.reloading=false;this.ray=new THREE.Raycaster();this.audio=new (window.AudioContext||window.webkitAudioContext)()}
 tone(freq,d=.06){if(this.audio.state==='suspended')this.audio.resume();const o=this.audio.createOscillator(),g=this.audio.createGain();o.frequency.value=freq;o.type='square';g.gain.setValueAtTime(.035,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+d);o.connect(g).connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+d)}
 update(dt,fire,enemy,onHit){this.cooldown-=dt;if(fire&&this.cooldown<=0&&!this.reloading){if(!this.ammo)return this.reload();this.ammo--;this.cooldown=.12;this.tone(520);this.flash();this.ray.setFromCamera(new THREE.Vector2(),this.camera);if(enemy.alive&&this.ray.intersectObject(enemy.group,true).length){enemy.damage(20);this.tone(900,.04);onHit()}}}
 reload(){if(this.reloading||this.ammo===20)return;this.reloading=true;setTimeout(()=>{this.ammo=20;this.reloading=false},1300)}
 flash(){const s=new THREE.Mesh(new THREE.SphereGeometry(.08,6,6),new THREE.MeshBasicMaterial({color:0xaaffff}));s.position.copy(this.camera.position).add(new THREE.Vector3(0,-.15,-.7).applyQuaternion(this.camera.quaternion));this.scene.add(s);setTimeout(()=>this.scene.remove(s),70)}
}
