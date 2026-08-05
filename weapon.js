import * as THREE from 'three';
const WEAPONS=[
  {name:'PULSE BLASTER',ammo:20,damage:20,rate:.12,color:0xaaffff,sound:'pulse'},
  {name:'SPARK SHOT',ammo:6,damage:12,rate:.7,color:0xffb42d,sound:'spark',pellets:6,spread:.075},
  {name:'BUBBLE LAUNCHER',ammo:4,damage:42,rate:.85,color:0xa56eff,sound:'bubble',projectile:true},
];
// 構えの位置。視界の縦横に対する割合で置くので、PCの横長画面でもスマホの縦長画面でも
// 右下の同じ場所に収まる。カメラから少し離すと銃口側だけが持ち上がる遠近が弱まり、
// 銃全体と両手が画面下部の帯に収まる。やや内向き・下向きにして横顔が見えるようにする。
const VIEW={depth:1.35,side:.52,drop:.94,tilt:-.1,turn:.14,scale:1.15};

export class Weapon {
  constructor(scene,camera,effects,audio){
    this.scene=scene;this.camera=camera;this.effects=effects;this.audio=audio;
    this.index=0;this.ammo=WEAPONS.map(w=>w.ammo);this.cooldown=0;this.reloading=false;this.relax=false;this.ray=new THREE.Raycaster();
    this.rig=new THREE.Group();this.rig.scale.setScalar(VIEW.scale);camera.add(this.rig);
    this.base=new THREE.Vector3();this.sway=new THREE.Vector2();this.swayTarget=new THREE.Vector2();
    this.time=0;this.kick=0;this.drop=0;this.reloadBlend=0;this.lastYaw=camera.rotation.y;this.lastPitch=camera.rotation.x;
    this.muzzle=new THREE.Object3D();this.rig.add(this.muzzle);this.muzzleWorld=new THREE.Vector3();
    this.models=this.createModels();this.createHands();
    this.projectiles=Array.from({length:6},()=>this.createProjectile());
    this.layout();this.switch(0,true);
  }
  get definition(){return WEAPONS[this.index]}get currentAmmo(){return this.relax?'∞':this.ammo[this.index]}
  // 画面の何割の位置に構えるかで基準位置を決める。画面サイズが変わるたびに呼ぶ。
  layout(){const halfHeight=Math.tan(this.camera.fov*Math.PI/360)*VIEW.depth,side=VIEW.side+Math.max(0,1.4-this.camera.aspect)*.12;this.base.set(halfHeight*this.camera.aspect*side,-halfHeight*VIEW.drop,-VIEW.depth)}
  createModels(){return WEAPONS.map((weapon,index)=>{
    const group=new THREE.Group(),shell=new THREE.MeshLambertMaterial({color:weapon.color,emissive:weapon.color,emissiveIntensity:.2,flatShading:true}),dark=new THREE.MeshLambertMaterial({color:0x333c63,emissive:0x0d1226,flatShading:true});
    const part=(geometry,material,x,y,z,tilt=0)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.rotation.x=tilt;group.add(mesh);return mesh};
    part(new THREE.BoxGeometry(.12,.2,.14),dark,0,-.13,.04);                                  // 握り
    part(new THREE.BoxGeometry(.14,.13,.22),dark,0,-.02,-.02);                                // 機関部
    if(index===0){                                                                            // パルス：短めの連射銃
      part(new THREE.BoxGeometry(.16,.16,.42),shell,0,.02,-.3);
      part(new THREE.CylinderGeometry(.055,.055,.18,8),shell,0,.02,-.58,Math.PI/2);
      part(new THREE.BoxGeometry(.06,.05,.12),dark,0,.12,-.16);                               // サイト
      group.userData.muzzle=new THREE.Vector3(0,.02,-.68);
    }else if(index===1){                                                                      // スパーク：三連の拡散銃
      part(new THREE.BoxGeometry(.28,.17,.34),shell,0,.01,-.26);
      [-.08,0,.08].forEach(x=>part(new THREE.CylinderGeometry(.038,.048,.16,6),shell,x,.01,-.5,Math.PI/2));
      group.userData.muzzle=new THREE.Vector3(0,.01,-.6);
    }else{                                                                                    // バブル：太い発射筒
      part(new THREE.CylinderGeometry(.12,.14,.4,8),shell,0,.01,-.28,Math.PI/2);
      part(new THREE.TorusGeometry(.12,.025,6,10),dark,0,.01,-.49);
      group.userData.muzzle=new THREE.Vector3(0,.01,-.55);
    }
    group.visible=false;this.rig.add(group);return group;
  })}
  // 両腕。本家アバターと同じく、手と腕を分けず1本の角ばったブロックにして、
  // 肩側だけシャツ色のそでを重ねる。自分もアバターを着ている感じが出る。
  // 構えの位置と大きさはVIEW・layout()側で決まるので、ここでは同じ範囲に収める。
  createHands(){
    const skin=new THREE.MeshLambertMaterial({color:0xf3c290,emissive:0x3a2517,flatShading:true}),sleeve=new THREE.MeshLambertMaterial({color:0x3f7ae0,emissive:0x102a4a,flatShading:true});
    const part=(geometry,material,x,y,z,rotation)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);if(rotation)mesh.rotation.set(...rotation);this.rig.add(mesh);return mesh};
    part(new THREE.BoxGeometry(.125,.125,.34),skin,.025,-.16,.13,[.42,0,.1]);                 // 右腕（グリップを握る側）
    part(new THREE.BoxGeometry(.142,.142,.15),sleeve,.06,-.255,.29,[.42,0,.1]);               // 右のそで
    part(new THREE.BoxGeometry(.115,.115,.32),skin,-.06,-.12,-.16,[.28,0,-.5]);               // 左腕（前を支える側）
    part(new THREE.BoxGeometry(.132,.132,.14),sleeve,-.145,-.215,.02,[.28,0,-.5]);            // 左のそで
  }
  createProjectile(){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),new THREE.MeshBasicMaterial({color:0xb78aff,transparent:true,opacity:.85}));mesh.visible=false;this.scene.add(mesh);return{mesh,active:false,velocity:new THREE.Vector3(),life:0}}
  switch(index,silent=false){if(!WEAPONS[index]||this.index===index&&!silent)return;this.models.forEach(model=>model.visible=false);this.index=index;this.models[index].visible=true;this.muzzle.position.copy(this.models[index].userData.muzzle);this.reloading=false;this.drop=1;if(!silent)this.audio.play('switch')}
  refill(){this.ammo[this.index]=this.definition.ammo}
  refillAll(){this.ammo=WEAPONS.map(weapon=>weapon.ammo)}
  reload(){if(this.relax||this.reloading||this.ammo[this.index]===this.definition.ammo)return;this.reloading=true;this.audio.play('reload');setTimeout(()=>{this.ammo[this.index]=this.definition.ammo;this.reloading=false},1300)}
  // 構えの揺れ。呼吸ぶんの上下と、視点を動かしたときのわずかな遅れだけ。
  animate(dt){
    this.time+=dt;
    let turn=this.camera.rotation.y-this.lastYaw;if(turn>Math.PI)turn-=Math.PI*2;else if(turn<-Math.PI)turn+=Math.PI*2;
    const rise=this.camera.rotation.x-this.lastPitch;this.lastYaw=this.camera.rotation.y;this.lastPitch=this.camera.rotation.x;
    this.swayTarget.set(Math.max(-.05,Math.min(.05,turn*1.5)),Math.max(-.04,Math.min(.04,-rise*1.5)));
    this.sway.lerp(this.swayTarget,Math.min(1,dt*7));this.swayTarget.multiplyScalar(Math.max(0,1-dt*9));
    this.kick=Math.max(0,this.kick-this.kick*Math.min(1,dt*11)-dt*.4);
    this.drop=Math.max(0,this.drop-dt*3.4);
    this.reloadBlend+=((this.reloading?1:0)-this.reloadBlend)*Math.min(1,dt*7);
    const breathY=Math.sin(this.time*1.5)*.006,breathX=Math.sin(this.time*1.05)*.005;
    this.rig.position.set(this.base.x+this.sway.x+breathX,this.base.y+this.sway.y+breathY-this.drop*.2-this.reloadBlend*.1,this.base.z+this.kick*.08);
    this.rig.rotation.set(VIEW.tilt+this.kick*.1-this.sway.y*.6-this.reloadBlend*.4,VIEW.turn-this.sway.x*.9,-.06-this.drop*.45+this.reloadBlend*.3);
  }
  update(dt,fire,enemy,obstacles,onDamage){this.animate(dt);this.cooldown-=dt;this.updateProjectiles(dt,enemy,obstacles,onDamage);if(!fire||this.cooldown>0||this.reloading)return;if(!this.relax&&this.ammo[this.index]<=0){this.reload();return}if(!this.relax)this.ammo[this.index]--;this.cooldown=this.definition.rate;this.audio.play(this.definition.sound);this.kick=Math.min(1,this.kick+(this.definition.projectile?.9:.55));this.muzzle.getWorldPosition(this.muzzleWorld);this.effects.burst(this.muzzleWorld,this.definition.color,2,.09,.12);if(this.definition.projectile)this.fireBubble();else this.fireHitscan(enemy,obstacles,onDamage)}
  fireHitscan(enemy,obstacles,onDamage){const count=this.definition.pellets||1;let total=0,hitPoint=null;for(let i=0;i<count;i++){const offset=new THREE.Vector2((Math.random()-.5)*(this.definition.spread||0),(Math.random()-.5)*(this.definition.spread||0));this.ray.setFromCamera(offset,this.camera);const enemyHit=enemy.alive?this.ray.intersectObject(enemy.group,true)[0]:null,wallHit=this.ray.intersectObjects(obstacles,false)[0];const end=(enemyHit&&(!wallHit||enemyHit.distance<wallHit.distance)?enemyHit:wallHit)?.point||this.ray.ray.at(30,new THREE.Vector3());this.effects.tracer(this.muzzleWorld.clone(),end,this.definition.color);if(enemyHit&&(!wallHit||enemyHit.distance<wallHit.distance)){const falloff=this.index===1?Math.max(.3,1-enemyHit.distance/24):1;total+=this.definition.damage*falloff;hitPoint=enemyHit.point}else if(wallHit)this.effects.burst(wallHit.point,this.definition.color,2,.08,.2)}if(total){enemy.damage(Math.round(total));this.effects.burst(hitPoint,this.definition.color,4,.1,.3);this.audio.play('hit');onDamage(Math.round(total),enemy.hp<=0)}}
  fireBubble(){const shot=this.projectiles.find(p=>!p.active);if(!shot)return;shot.active=true;shot.life=3.5;shot.damage=this.definition.damage;shot.mesh.visible=true;shot.mesh.position.copy(this.muzzleWorld);shot.velocity.set(0,0,-10).applyQuaternion(this.camera.quaternion);this.effects.burst(shot.mesh.position,0xa56eff,4,.12,.25)}
  updateProjectiles(dt,enemy,obstacles,onDamage){for(const shot of this.projectiles){if(!shot.active)continue;shot.life-=dt;shot.mesh.position.addScaledVector(shot.velocity,dt);const enemyCenter=enemy.aimPoint,hitEnemy=enemy.alive&&shot.mesh.position.distanceTo(enemyCenter)<enemy.hitRadius;const hitWall=obstacles.some(object=>(object.userData.collisionBox||(object.userData.collisionBox=new THREE.Box3().setFromObject(object))).distanceToPoint(shot.mesh.position)<.2);if(hitEnemy||hitWall||shot.life<=0){let damage=0;if(enemy.alive){const distance=shot.mesh.position.distanceTo(enemyCenter);damage=Math.max(0,Math.round(shot.damage*(1-distance/5)));if(damage){enemy.damage(damage);onDamage(damage,enemy.hp<=0)}}this.effects.burst(shot.mesh.position,0xa56eff,12,.25,.55);shot.active=false;shot.mesh.visible=false}}}
}
export {WEAPONS};
