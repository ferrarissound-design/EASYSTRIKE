import * as THREE from 'three';
const FIRE_RANGE=32; // 射撃を始める距離。アリーナの端から端まで届く程度。
// 1スタッド＝この世界単位。本家R6の体格（全高5.25スタッド）が約2.0になり、プレイヤー
// （身長1.8・目線1.7）とほぼ同じ背丈で並ぶ。体はスタッド単位で組み、外側のrigを一様に縮める。
// 一様スケール限定。強調シェルはnormalMatrixで輪郭を出すので、軸ごとに違う倍率だと崩れる。
const S=.375;
const HEIGHT=5.25*S,CENTER_Y=2.6*S,HEAD_Y=4.63*S,TAG_Y=HEIGHT+.35,HIT_RADIUS=.95;
const AIM_ARM=-1.38; // 銃を持つ腕の角度。真横（-π/2）より少し下げると銃が胸の前に来て見やすい。

// 角が丸いブロック（ロブロックス風の人型パーツ用）。面取りはごく浅くするが、0にはしない。
// 強調シェルの陰影は法線の傾きで作っているので、完全な平面だと面全体が均一に光ってしまう。
function roundedBox(width,height,depth,radius=.08){
  const r=Math.min(radius,width/2,height/2,depth/2),shape=new THREE.Shape(),x=width/2-r,y=height/2-r;
  shape.moveTo(-x,-height/2);shape.lineTo(x,-height/2);shape.quadraticCurveTo(width/2,-height/2,width/2,-y);shape.lineTo(width/2,y);shape.quadraticCurveTo(width/2,height/2,x,height/2);shape.lineTo(-x,height/2);shape.quadraticCurveTo(-width/2,height/2,-width/2,y);shape.lineTo(-width/2,-y);shape.quadraticCurveTo(-width/2,-height/2,-x,-height/2);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:depth-r*2,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,curveSegments:3});
  geometry.translate(0,0,-(depth-r*2)/2);geometry.computeVertexNormals();return geometry;
}

// 敵を強調するシェル。面の向きが視線と垂直に近いほど（＝輪郭ほど）明るく光り、
// 内側はごく薄い赤のオーバーレイになる。加算合成なので背景から少し浮いて見える。
// アバターを色分けしたぶん内側の塗りは薄くし、そのぶん輪郭を強めて視認性を保つ。
function highlightMaterial(){
  return new THREE.ShaderMaterial({
    uniforms:{glowColor:{value:new THREE.Color(0xff5545)},rimPower:{value:2.6},rimStrength:{value:.95},fill:{value:.07}},
    vertexShader:'varying vec3 vNormalView;varying vec3 vViewDir;void main(){vec4 viewPosition=modelViewMatrix*vec4(position,1.);vNormalView=normalize(normalMatrix*normal);vViewDir=normalize(-viewPosition.xyz);gl_Position=projectionMatrix*viewPosition;}',
    fragmentShader:'uniform vec3 glowColor;uniform float rimPower;uniform float rimStrength;uniform float fill;varying vec3 vNormalView;varying vec3 vViewDir;void main(){float rim=pow(1.-abs(dot(normalize(vNormalView),normalize(vViewDir))),rimPower);gl_FragColor=vec4(glowColor,fill+rim*rimStrength);}',
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
  });
}
// 背後に敷く柔らかい赤い光。ポストエフェクトを使わずに軽くブルームのように見せる。
function haloSprite(){
  const size=128,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const context=canvas.getContext('2d'),gradient=context.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  gradient.addColorStop(0,'rgba(255,90,70,.55)');gradient.addColorStop(.45,'rgba(255,60,45,.2)');gradient.addColorStop(1,'rgba(255,40,30,0)');
  context.fillStyle=gradient;context.fillRect(0,0,size,size);
  const texture=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));
  sprite.scale.set(2.3,2.8,1);sprite.position.y=CENTER_Y;sprite.raycast=()=>{};return sprite;
}
// 顔。本家のスマイルに寄せた3種類をcanvasで描いて使い回す。
const FACES={};
function faceTexture(kind){
  if(FACES[kind])return FACES[kind];
  const size=128,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const c=canvas.getContext('2d');c.fillStyle=c.strokeStyle='#191919';c.lineWidth=9;c.lineCap='round';
  const cross=(x,y)=>{c.beginPath();c.moveTo(x-11,y-11);c.lineTo(x+11,y+11);c.moveTo(x+11,y-11);c.lineTo(x-11,y+11);c.stroke()};
  const oval=(x,y,w,h)=>{c.beginPath();c.ellipse(x,y,w,h,0,0,Math.PI*2);c.fill()};
  if(kind==='ko'){cross(42,50);cross(86,50);oval(64,88,11,13)}                                    // やられ顔
  else if(kind==='hurt'){                                                                          // 被弾した困り顔（「><」）
    [[42,50],[86,50]].forEach(([x,y],i)=>{const s=i?-1:1;c.beginPath();c.moveTo(x-11*s,y-9);c.lineTo(x+11*s,y);c.lineTo(x-11*s,y+9);c.stroke()});oval(64,86,12,9);
  }else{oval(42,50,9,13);oval(86,50,9,13);c.beginPath();c.arc(64,66,27,.22*Math.PI,.78*Math.PI);c.stroke()} // にっこり顔
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;FACES[kind]=texture;return texture;
}

export class Enemy {
  constructor(scene,colliders,obstacles,effects,audio){this.scene=scene;this.colliders=colliders;this.obstacles=obstacles;this.effects=effects;this.audio=audio;this.ray=new THREE.Raycaster();this.animTime=0;this.recoil=0;this.moving=false;this.exploding=0;this.flashToken=0;this.visibleToPlayer=false;this.muzzleWorld=new THREE.Vector3();this.group=this.createModel();scene.add(this.group);this.shots=Array.from({length:12},()=>this.createShot());this.onDeath=null;this.gameEnded=false;this.respawn(new THREE.Vector3(0,0,-16))}
  createModel(){
    const group=new THREE.Group();
    // 本家アバターの色分け。シャツは赤のままにしてシルエットの赤さを保ち、
    // ズボンは濃紺、頭は本家らしい黄色みのある肌色にする。
    const shirt=new THREE.MeshLambertMaterial({color:0xc4281c,emissive:0x2a0705}),pants=new THREE.MeshLambertMaterial({color:0x25355e,emissive:0x050a14}),
          skin=new THREE.MeshLambertMaterial({color:0xf5cd30,emissive:0x2a2205}),metal=new THREE.MeshLambertMaterial({color:0x2b3038,emissive:0x05070a});
    this.bodyMaterials=[shirt,pants,skin];this.baseEmissive=this.bodyMaterials.map(material=>material.emissive.getHex());
    this.highlight=highlightMaterial();
    // スプライトは親のスケールが掛かるので、縮小するrigの外（groupの直下）に置く。
    this.halo=haloSprite();group.add(this.halo);
    const rig=new THREE.Group();rig.scale.setScalar(S);group.add(rig);this.rig=rig;this.parts=[];
    // 強調シェルは本体パーツにだけ重ねる。銃には付けない。
    const piece=(parent,geometry,x,y,z,material,glow=true)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);if(glow){mesh.userData.hitZone='body';const shell=new THREE.Mesh(geometry,this.highlight);shell.scale.setScalar(1.05);shell.renderOrder=1;shell.raycast=()=>{};mesh.add(shell);this.parts.push({mesh,rest:mesh.position.clone(),velocity:new THREE.Vector3(),spin:0})}return mesh};
    const joint=(parent,x,y,z)=>{const pivot=new THREE.Group();pivot.position.set(x,y,z);parent.add(pivot);return pivot};
    // 上半身（走ると上下に揺れる）
    const upper=joint(rig,0,0,0);this.upper=upper;
    piece(upper,roundedBox(2,2,1),0,3,0,shirt);                                                  // 胴＝シャツ
    this.head=joint(upper,0,4,0);const head=piece(this.head,roundedBox(1.5,1.25,1.15),0,.625,0,skin);head.userData.hitZone='head';  // 頭は胴より細く、奥行きも胴とほぼ同じにして張り出さないようにする。
    // 顔。ExtrudeGeometryのUVは素直でないので、頭の前に薄い板を1枚重ねる。
    // シェル（1.05倍・加算合成）より前に出し、描画順も後にして赤く染まらないようにする。
    this.face=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.95),new THREE.MeshBasicMaterial({map:faceTexture('normal'),transparent:true,depthWrite:false}));
    this.face.position.z=.62;this.face.renderOrder=3;this.face.raycast=()=>{};head.add(this.face);
    // 腕。R6なので肘はなく1本の棒。銃を持つ側は前へ真っ直ぐ伸ばし、もう片方だけ歩行で振る。
    this.arms=[-1,1].map(side=>{const shoulder=joint(upper,side*1.53,4,0);piece(shoulder,roundedBox(1,2,1),0,-1,0,skin);return shoulder});
    this.arms[1].rotation.x=AIM_ARM;
    // 脚＝ズボン
    this.legs=[-1,1].map(side=>{const hip=joint(rig,side*.52,2,0);piece(hip,roundedBox(1,2,1),0,-1,0,pants);return hip});
    // ライフル。銃を持つ腕の先に付ける。腕を倒したぶんを打ち消して、銃口は正面へ向ける。
    const gun=new THREE.Group();gun.position.set(0,-2,.3);gun.rotation.x=-AIM_ARM;this.arms[1].add(gun);this.gun=gun;
    piece(gun,roundedBox(.5,.6,2.2),0,0,0,metal,false);
    piece(gun,roundedBox(.4,.9,.5),0,-.6,-.2,metal,false);
    const barrel=piece(gun,new THREE.CylinderGeometry(.16,.16,1.6,8),0,.05,1.7,metal,false);barrel.rotation.x=Math.PI/2;
    this.muzzle=new THREE.Object3D();this.muzzle.position.set(0,.05,2.6);gun.add(this.muzzle);
    this.parts.push({mesh:gun,rest:gun.position.clone(),velocity:new THREE.Vector3(),spin:0});
    // 当たり判定を補う見えない箱。等身を縮めたぶん狙いにくくならないよう、胴・頭・肩の
    // 隙間を埋める。materialがvisible:falseなので描画はされず、レイキャストだけ拾う。
    const proxy=new THREE.Mesh(new THREE.BoxGeometry(3.6,3.4,1.6),new THREE.MeshBasicMaterial({visible:false}));proxy.position.set(0,3.5,0);proxy.userData.hitZone='body';rig.add(proxy);
    return group;
  }
  createShot(){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.09,6,4),new THREE.MeshBasicMaterial({color:0xffbd67}));mesh.visible=false;this.scene.add(mesh);return{mesh,active:false,velocity:new THREE.Vector3(),life:0}}
  configure(config,style=null){this.config=config;if(style)this.style=style;this.maxHp=config.enemyHp;this.hp=this.maxHp;this.clearShots()}
  // 敵の高さに依存する参照点。他のファイルはこれを使い、直接オフセットを書かない。
  get aimPoint(){return new THREE.Vector3(this.group.position.x,this.group.position.y+CENTER_Y,this.group.position.z)}   // 胸のあたり。狙点と視線の原点。
  get labelPoint(){return new THREE.Vector3(this.group.position.x,this.group.position.y+TAG_Y,this.group.position.z)}    // 頭上。ダメージ数字とネームタグ用。
  get hitRadius(){return HIT_RADIUS}                                                                                    // 爆風などの当たり半径。
  setFace(kind){this.face.material.map=faceTexture(kind)}
  tint(hex){this.bodyMaterials.forEach(material=>material.emissive.set(hex))}
  untint(){this.bodyMaterials.forEach((material,index)=>material.emissive.setHex(this.baseEmissive[index]))}
  animate(dt){
    // 撃破時はパーツを弾き飛ばす。シェルと顔は各パーツの子なので一緒に飛ぶ。
    if(!this.alive){if(this.exploding>0){this.exploding-=dt;for(const part of this.parts){part.mesh.position.addScaledVector(part.velocity,dt);part.velocity.y-=14*dt;part.mesh.rotation.x+=part.spin*dt;part.mesh.rotation.z+=part.spin*.7*dt}}return}
    this.animTime+=dt*(this.moving?9:2.4);this.recoil=Math.max(0,this.recoil-dt*6);
    const swing=Math.sin(this.animTime)*(this.moving?.75:.05);
    this.legs[0].rotation.x=swing;this.legs[1].rotation.x=-swing;                 // R6は膝がないので股関節から真っ直ぐ振る。
    this.arms[0].rotation.x=-swing*.9;                                            // 空いている腕だけ脚と逆位相で振る。
    this.arms[1].rotation.x=AIM_ARM+this.recoil*.28;                           // 銃を持つ腕は前へ固定。反動は腕ごと跳ねる。
    this.upper.position.y=Math.abs(Math.sin(this.animTime))*(this.moving?.22:.05);
    this.head.rotation.x=-.03-this.recoil*.1;
  }
  muzzleFlash(){this.muzzle.getWorldPosition(this.muzzleWorld);this.effects.burst(this.muzzleWorld,0xffd27a,3,.13,.16);this.recoil=1}
  canSeePlayer(player){const origin=new THREE.Vector3(this.group.position.x,this.group.position.y+HEAD_Y,this.group.position.z),target=player.position.clone(),direction=target.sub(origin),distance=direction.length();this.ray.set(origin,direction.normalize());const blocker=this.ray.intersectObjects(this.obstacles,false)[0];return !blocker||blocker.distance>distance}
  safeMove(direction,distance){const previous=this.group.position.clone();this.group.position.addScaledVector(direction,distance);const box=new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(this.group.position.x,1,this.group.position.z),new THREE.Vector3(1.4,2,1.4));if(Math.abs(this.group.position.x)>19||Math.abs(this.group.position.z)>19||this.colliders.some(c=>c.intersectsBox(box))){this.group.position.copy(previous);const side=new THREE.Vector3(-direction.z,0,direction.x);this.group.position.addScaledVector(side,distance);return false}return true}
  fire(player){const shot=this.shots.find(candidate=>!candidate.active);if(!shot)return;this.muzzle.getWorldPosition(this.muzzleWorld);const target=player.position.clone();const direction=target.sub(this.muzzleWorld).normalize();const accuracy=Math.min(.97,Math.max(.25,this.config.accuracy+(this.style?.accuracyBonus||0))),spread=(1-accuracy)*.12;direction.x+=(Math.random()-.5)*spread;direction.y+=(Math.random()-.5)*spread;direction.z+=(Math.random()-.5)*spread;direction.normalize();shot.active=true;shot.life=2;shot.mesh.visible=true;shot.mesh.position.copy(this.muzzleWorld);shot.velocity.copy(direction).multiplyScalar(25);this.effects.tracer(this.muzzleWorld.clone(),this.muzzleWorld.clone().addScaledVector(direction,2.2),0xffc36f)}
  updateShots(dt,player,onShot){for(const shot of this.shots){if(!shot.active)continue;shot.life-=dt;const previous=shot.mesh.position.clone(),step=shot.velocity.clone().multiplyScalar(dt),distance=step.length(),direction=step.clone().normalize();this.ray.set(previous,direction);const blocker=this.ray.intersectObjects(this.obstacles,false)[0];if(blocker&&blocker.distance<=distance){this.effects.burst(blocker.point,0xffb56d,2,.07,.16);shot.active=false;shot.mesh.visible=false;continue}shot.mesh.position.add(step);const segment=new THREE.Line3(previous,shot.mesh.position),closest=segment.closestPointToPoint(player.position,true,new THREE.Vector3());if(closest.distanceTo(player.position)<.58){onShot(this.config.attack,previous);shot.active=false;shot.mesh.visible=false;continue}if(shot.life<=0){shot.active=false;shot.mesh.visible=false}}}
  clearShots(){this.shots?.forEach(shot=>{shot.active=false;shot.mesh.visible=false})}
  displace(direction,distance=.55){if(!this.alive)return;const flat=direction.clone().setY(0);if(flat.lengthSq()>.001)this.safeMove(flat.normalize(),distance)}
  update(dt,player,onShot){this.animate(dt);this.updateShots(dt,player,onShot);if(!this.alive)return;this.thinkTimer-=dt;this.shotTimer-=dt;this.group.position.y=Math.max(0,this.group.position.y-8*dt);const toPlayer=player.position.clone().sub(this.group.position),distance=toPlayer.length(),visible=this.canSeePlayer(player);this.group.lookAt(player.position.x,this.group.position.y,player.position.z);
    this.revealTimer=Math.max(0,(this.revealTimer||0)-dt);this.visibleToPlayer=visible||this.revealTimer>0; // HUNTERギア中は遮蔽物越しでも短時間追跡する。
    this.seenTime=visible?this.seenTime+dt:0;                        // プレイヤーを見続けた実時間。これが反応時間を超えると命中させられる。
    if(this.moveDirection){const before=this.group.position.clone();this.safeMove(this.moveDirection,this.moveSpeed*dt);this.moving=before.distanceToSquared(this.group.position)>1e-6}
    if(this.thinkTimer>0)return;this.thinkTimer=.16;                 // 進む向きと射撃の判断だけを一定間隔で行い、移動自体は毎フレーム続ける。
    const style=this.style||{preferredMin:7,preferredMax:12,speed:1,burst:3,burstPause:.85,reactionScale:1},forward=toPlayer.setY(0).normalize(),direction=forward.clone();let goal='fight';
    if(this.hp<=this.maxHp*.3){direction.negate();goal='retreat'}else if(distance>style.preferredMax)goal='approach';else if(distance<style.preferredMin){direction.negate();goal='retreat'}else{direction.set(-forward.z,0,forward.x).multiplyScalar(this.strafeDirection)}if(!visible&&goal==='fight'){direction.copy(forward);goal='approach'}
    this.moveDirection=direction;this.moveSpeed=this.config.enemySpeed*style.speed*(goal==='retreat'?1.2:1);
    if(Math.random()<this.config.jump*.16&&this.group.position.y===0)this.group.position.y=.5;
    if(visible&&distance<FIRE_RANGE&&this.shotTimer<=0&&this.seenTime>this.config.reaction*style.reactionScale){if(this.burstShots>=style.burst){this.shotTimer=style.burstPause;this.burstShots=0;this.strafeDirection*=-1;return}this.shotTimer=.16+this.config.reaction*.18;this.burstShots++;this.muzzleFlash();this.fire(player)}}
  flash(hit){this.highlight.uniforms.glowColor.value.set(hit?0xffffff:0xff5545);this.highlight.uniforms.rimStrength.value=hit?1.7:.95;this.highlight.uniforms.fill.value=hit?.35:.07}
  damage(amount){if(!this.alive)return;this.hp-=amount;const token=++this.flashToken;this.tint(0x88ffff);this.flash(true);this.setFace('hurt');setTimeout(()=>{if(this.alive&&token===this.flashToken){this.untint();this.flash(false);this.setFace('normal')}},160);if(this.hp<=0)this.die()}
  // 撃破。白フラッシュは一瞬だけにして、飛び散るパーツはアバター本来の色で見せる。
  die(){if(!this.alive)return;this.alive=false;this.clearShots();this.tint(0xffffff);this.flash(true);this.setFace('ko');this.exploding=.5;setTimeout(()=>{this.untint();this.flash(false)},110);
    this.parts.forEach((part,index)=>{part.velocity.set(Math.sin(index*2.4)*7,6+Math.random()*3,Math.cos(index*2.4)*7);part.spin=4+index*.9});
    setTimeout(()=>{this.group.visible=false;this.effects.burst(this.group.position.clone().add(new THREE.Vector3(0,CENTER_Y,0)),0xff8a31,18,.22,.9)},380);
    this.audio.play('kill');this.audio.play('oof');this.onDeath?.()}
  respawn(spawnPoint=new THREE.Vector3(0,0,-16)){const safe=spawnPoint.clone();this.clearShots();this.group.position.copy(safe);this.group.rotation.set(0,0,0);this.group.visible=true;
    this.parts.forEach(part=>{part.mesh.position.copy(part.rest);part.mesh.rotation.set(0,0,0)});this.gun.rotation.x=-AIM_ARM;this.exploding=0;
    this.upper.position.y=0;this.legs.forEach(leg=>leg.rotation.set(0,0,0));this.arms[0].rotation.set(0,0,0);this.arms[1].rotation.set(AIM_ARM,0,0);
    this.untint();this.flash(false);this.setFace('normal');this.flashToken++;
    this.hp=this.maxHp||100;this.alive=true;this.recoil=0;this.moving=false;this.animTime=0;this.moveDirection=null;this.moveSpeed=0;this.thinkTimer=1;this.shotTimer=1.2;this.seenTime=0;this.burstShots=0;this.visibleToPlayer=false;this.revealTimer=0;this.strafeDirection=Math.random()<.5?-1:1;this.effects?.ring(safe,0x7eeeff)}
}
