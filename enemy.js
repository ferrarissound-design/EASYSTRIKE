import * as THREE from 'three';
const FIRE_RANGE=32; // 射撃を始める距離。アリーナの端から端まで届く程度。

// 角が丸いブロック（ロブロックス風の人型パーツ用）
function roundedBox(width,height,depth,radius=.18){
  const r=Math.min(radius,width/2,height/2,depth/2),shape=new THREE.Shape(),x=width/2-r,y=height/2-r;
  shape.moveTo(-x,-height/2);shape.lineTo(x,-height/2);shape.quadraticCurveTo(width/2,-height/2,width/2,-y);shape.lineTo(width/2,y);shape.quadraticCurveTo(width/2,height/2,x,height/2);shape.lineTo(-x,height/2);shape.quadraticCurveTo(-width/2,height/2,-width/2,y);shape.lineTo(-width/2,-y);shape.quadraticCurveTo(-width/2,-height/2,-x,-height/2);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:depth-r*2,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,curveSegments:3});
  geometry.translate(0,0,-(depth-r*2)/2);geometry.computeVertexNormals();return geometry;
}

export class Enemy {
  constructor(scene,colliders,obstacles,effects,audio){this.scene=scene;this.colliders=colliders;this.obstacles=obstacles;this.effects=effects;this.audio=audio;this.ray=new THREE.Raycaster();this.animTime=0;this.recoil=0;this.moving=false;this.deathTilt=0;this.muzzleWorld=new THREE.Vector3();this.group=this.createModel();scene.add(this.group);this.onDeath=null;this.gameEnded=false;this.respawn(new THREE.Vector3())}
  createModel(){
    const group=new THREE.Group();
    const body=new THREE.MeshLambertMaterial({color:0xff2b26,emissive:0x4a0a06}),metal=new THREE.MeshLambertMaterial({color:0x2b3038,emissive:0x05070a});
    this.material=body;this.baseEmissive=body.emissive.getHex();
    const piece=(parent,geometry,x,y,z,material=body)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh};
    const joint=(parent,x,y,z)=>{const pivot=new THREE.Group();pivot.position.set(x,y,z);parent.add(pivot);return pivot};
    // 上半身（走ると上下に揺れる）
    const upper=joint(group,0,0,0);this.upper=upper;
    piece(upper,roundedBox(.98,.46,.66,.2),0,1.78,0);           // 腰
    piece(upper,roundedBox(1.36,1.05,.76,.26),0,2.45,0);        // 胸
    piece(upper,roundedBox(.42,.24,.42,.11),0,3.02,0);          // 首
    this.head=joint(upper,0,3.05,0);piece(this.head,roundedBox(.9,.8,.86,.26),0,.4,0);
    // 腕（両手で銃を構えたポーズ）
    this.arms=[-1,1].map(side=>{
      const shoulder=joint(upper,side*.78,2.7,0);shoulder.rotation.set(-.55,0,-side*.34);
      piece(shoulder,roundedBox(.42,.95,.46,.18),0,-.475,0);
      const elbow=joint(shoulder,0,-.95,0);elbow.rotation.x=-1.15;
      piece(elbow,roundedBox(.38,.7,.42,.16),0,-.35,0);
      piece(elbow,roundedBox(.4,.32,.4,.14),0,-.72,.04);        // 手
      return {shoulder,elbow};
    });
    // 脚
    this.legs=[-1,1].map(side=>{
      const hip=joint(group,side*.36,1.6,0);
      piece(hip,roundedBox(.5,1.6,.56,.18),0,-.8,0);
      piece(hip,roundedBox(.56,.28,.85,.12),0,-1.48,.13);       // 足
      return hip;
    });
    // ライフル（両手の間に構える）
    const gun=new THREE.Group();gun.position.set(0,2.03,1.02);upper.add(gun);this.gun=gun;this.gunZ=gun.position.z;
    piece(gun,roundedBox(.26,.3,1.1,.09),0,0,.15,metal);
    piece(gun,roundedBox(.2,.44,.28,.07),0,-.3,.02,metal);      // マガジン
    piece(gun,roundedBox(.24,.28,.5,.09),0,-.02,-.6,metal);     // ストック
    piece(gun,roundedBox(.1,.16,.34,.05),0,.2,-.1,metal);       // サイト
    const barrel=piece(gun,new THREE.CylinderGeometry(.07,.07,.9,8),0,.02,1.1,metal);barrel.rotation.x=Math.PI/2;
    this.muzzle=new THREE.Object3D();this.muzzle.position.set(0,.02,1.6);gun.add(this.muzzle);
    return group;
  }
  configure(config,pickups){this.config=config;this.pickups=pickups;this.maxHp=config.enemyHp;this.hp=this.maxHp}
  animate(dt){
    if(!this.alive){if(this.deathTilt<Math.PI/2){const step=Math.min(dt*6,Math.PI/2-this.deathTilt);this.deathTilt+=step;this.group.rotateX(-step)}return}
    this.animTime+=dt*(this.moving?9:2.4);this.recoil=Math.max(0,this.recoil-dt*6);
    const swing=Math.sin(this.animTime)*(this.moving?.7:.06);
    this.legs[0].rotation.x=swing;this.legs[1].rotation.x=-swing;
    this.upper.position.y=Math.abs(Math.sin(this.animTime))*(this.moving?.09:.02);
    this.upper.rotation.y=swing*.12;this.head.rotation.x=-.05-this.recoil*.15;
    this.arms.forEach(({shoulder,elbow},index)=>{shoulder.rotation.x=-.55-this.recoil*.2+(this.moving?Math.sin(this.animTime)*.04*(index?1:-1):0);elbow.rotation.x=-1.15+this.recoil*.16});
    this.gun.position.z=this.gunZ-this.recoil*.14;this.gun.rotation.x=-this.recoil*.22;
  }
  muzzleFlash(){this.muzzle.getWorldPosition(this.muzzleWorld);this.effects.burst(this.muzzleWorld,0xffd27a,3,.13,.16);this.recoil=1}
  canSeePlayer(player){const origin=this.group.position.clone().add(new THREE.Vector3(0,2,0)),target=player.position.clone(),direction=target.sub(origin),distance=direction.length();this.ray.set(origin,direction.normalize());const blocker=this.ray.intersectObjects(this.obstacles,false)[0];return !blocker||blocker.distance>distance}
  safeMove(direction,distance){const previous=this.group.position.clone();this.group.position.addScaledVector(direction,distance);const box=new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(this.group.position.x,1.4,this.group.position.z),new THREE.Vector3(1.4,2.8,1.4));if(Math.abs(this.group.position.x)>19||Math.abs(this.group.position.z)>19||this.colliders.some(c=>c.intersectsBox(box))){this.group.position.copy(previous);const side=new THREE.Vector3(-direction.z,0,direction.x);this.group.position.addScaledVector(side,distance);return false}return true}
  update(dt,player,onShot){this.animate(dt);if(!this.alive)return;this.thinkTimer-=dt;this.shotTimer-=dt;this.group.position.y=Math.max(0,this.group.position.y-8*dt);const toPlayer=player.position.clone().sub(this.group.position),distance=toPlayer.length(),visible=this.canSeePlayer(player);this.group.lookAt(player.position.x,this.group.position.y,player.position.z);
    this.seenTime=visible?this.seenTime+dt:0;                       // プレイヤーを見続けた実時間。これが反応時間を超えると命中させられる。
    if(this.moveDirection){const before=this.group.position.clone();this.safeMove(this.moveDirection,this.moveSpeed*dt);this.moving=before.distanceToSquared(this.group.position)>1e-6}
    if(this.thinkTimer>0)return;this.thinkTimer=.16;                // 進む向きと射撃の判断だけを一定間隔で行い、移動自体は毎フレーム続ける。
    const forward=toPlayer.setY(0).normalize(),direction=forward.clone();let goal='fight';const health=this.pickups?.nearestHealth(this.group.position);
    if(this.hp<=this.maxHp*.3&&health){direction.copy(health.position).sub(this.group.position).setY(0).normalize();goal='heal'}else if(this.hp<=this.maxHp*.3){direction.negate();goal='retreat'}else if(distance>11)goal='approach';else if(distance<7){direction.negate();goal='retreat'}else{direction.set(-forward.z,0,forward.x).multiplyScalar(this.strafeDirection)}if(!visible&&goal==='fight'){direction.copy(forward);goal='approach'}
    this.moveDirection=direction;this.moveSpeed=this.config.enemySpeed*(goal==='retreat'?1.2:1);
    if(Math.random()<this.config.jump*.16&&this.group.position.y===0)this.group.position.y=.8;if(Math.random()<this.config.dash*.16)this.safeMove(direction,1.1);
    if(visible&&distance<FIRE_RANGE&&this.shotTimer<=0){if(this.burstShots>=3){this.shotTimer=1.3;this.burstShots=0;this.strafeDirection*=-1;return}this.shotTimer=this.config.reaction;this.burstShots++;this.muzzleFlash();if(this.seenTime>this.config.reaction&&Math.random()<this.config.accuracy)onShot(this.config.attack);else onShot(0)}}
  damage(amount){if(!this.alive)return;this.hp-=amount;this.material.emissive.set(0x88ffff);setTimeout(()=>{if(this.alive)this.material.emissive.set(this.baseEmissive)},90);if(this.hp<=0)this.die()}
  die(){if(!this.alive)return;this.alive=false;this.deathTilt=0;this.material.emissive.set(0xffffff);setTimeout(()=>{this.group.visible=false;this.effects.burst(this.group.position.clone().add(new THREE.Vector3(0,1.5,0)),0xff8a31,18,.22,.9)},420);this.audio.play('kill');this.onDeath?.();setTimeout(()=>{if(!this.gameEnded)this.respawn(this.lastPlayerPosition||new THREE.Vector3())},2000)}
  respawn(playerPosition){const candidates=[[-16,-15],[16,-15],[-16,15],[16,15],[0,-16]];const safe=candidates.map(([x,z])=>new THREE.Vector3(x,0,z)).sort((a,b)=>b.distanceToSquared(playerPosition)-a.distanceToSquared(playerPosition))[0];this.group.position.copy(safe);this.group.rotation.set(0,0,0);this.group.visible=true;this.material.emissive.set(this.baseEmissive);this.hp=this.maxHp||100;this.alive=true;this.deathTilt=0;this.recoil=0;this.moving=false;this.animTime=0;this.moveDirection=null;this.moveSpeed=0;this.thinkTimer=1;this.shotTimer=1.2;this.seenTime=0;this.burstShots=0;this.strafeDirection=Math.random()<.5?-1:1;this.effects?.ring(safe,0x7eeeff)}
}
