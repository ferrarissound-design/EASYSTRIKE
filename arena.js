import * as THREE from 'three';
export const ARENA_SIZE=42;
const WALL_HEIGHT=9;
// 本家ロブロックスのFPSステージに寄せた配色。白いタイル床と、青・ピンクのパネル壁。
const COLOR={floor:0xeef1f8,seam:0xa9b5d1,wallBlue:0x5f79b8,wallPink:0xa9629d,trim:0x2f3a5e,cap:0xdfe6f4,block:0xdde4f1,blockDark:0xa9b7d6,blockEdge:0x8895b6,accentBlue:0x5f79b8,accentPink:0xa9629d,pad:0x3ce0e6};

export function createArena(scene,colliders){
  const obstacles=[], mat=color=>new THREE.MeshLambertMaterial({color,flatShading:true});
  const add=(geometry,color,x,y,z,solid=true,rotation=0)=>{const mesh=new THREE.Mesh(geometry,mat(color));mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);if(solid){colliders.push(new THREE.Box3().setFromObject(mesh));obstacles.push(mesh)}return mesh};
  const edgeMaterial=new THREE.LineBasicMaterial({color:COLOR.blockEdge,transparent:true,opacity:.55});
  const seamMaterial=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.26});
  const outline=mesh=>mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),edgeMaterial));
  // 壁パネルの継ぎ目。ロブロックスの大きなブロック壁のような分割線を引く。
  const seams=(width,height,columns,rows)=>{const points=[];for(let i=1;i<columns;i++){const x=-width/2+width*i/columns;points.push(x,-height/2,0,x,height/2,0)}for(let j=1;j<rows;j++){const y=-height/2+height*j/rows;points.push(-width/2,y,0,width/2,y,0)}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));return new THREE.LineSegments(geometry,seamMaterial)};

  // 床：白いタイル。エリア色は薄い着色にして、照明で染まる本家の見た目に近づける。
  add(new THREE.BoxGeometry(ARENA_SIZE,.5,ARENA_SIZE),COLOR.floor,0,-.25,0,false);
  [[-10,-10,0x9dc1f7],[10,-10,0xf2dba6],[-10,10,0x9fe3bf],[10,10,0xf2a9d6]].forEach(([x,z,color])=>{const zone=add(new THREE.PlaneGeometry(19,19),color,x,.012,z,false);zone.rotation.x=-Math.PI/2;zone.material.transparent=true;zone.material.opacity=.22;zone.material.depthWrite=false;zone.castShadow=false});
  const grid=new THREE.GridHelper(ARENA_SIZE,14,COLOR.seam,COLOR.seam);grid.position.y=.03;grid.material.transparent=true;grid.material.opacity=.75;scene.add(grid);

  // 外周の壁：青とピンクのパネル、足元の暗い幅木、上端の明るいキャップ付き。
  [[0,-21,0,COLOR.wallBlue],[0,21,Math.PI,COLOR.wallPink],[-21,0,Math.PI/2,COLOR.wallBlue],[21,0,-Math.PI/2,COLOR.wallPink]].forEach(([x,z,rotation,color])=>{
    const wall=add(new THREE.BoxGeometry(ARENA_SIZE,WALL_HEIGHT,.7),color,x,WALL_HEIGHT/2,z,true,rotation);
    const panel=seams(ARENA_SIZE,WALL_HEIGHT,7,3);panel.position.z=.36;wall.add(panel);
    const trim=new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE,.7,.9),mat(COLOR.trim));trim.position.set(0,-WALL_HEIGHT/2+.35,.12);wall.add(trim);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE,.5,1.1),mat(COLOR.cap));cap.position.set(0,WALL_HEIGHT/2-.25,0);wall.add(cap);
  });
  [[-20,-20],[20,-20],[-20,20],[20,20]].forEach(([x,z])=>outline(add(new THREE.BoxGeometry(2.6,WALL_HEIGHT,2.6),COLOR.cap,x,WALL_HEIGHT/2,z)));

  const crates=[[-14,-12],[-8,-5],[-15,7],[-7,14],[0,-13],[4,8],[12,-10],[15,2],[12,14],[-2,1]];
  crates.forEach(([x,z],i)=>outline(add(new THREE.BoxGeometry(2.8,2.8,2.8),i%3?COLOR.block:COLOR.blockDark,x,1.4,z)));
  [[-12,1],[10,-1],[0,-18]].forEach(([x,z])=>{const pad=add(new THREE.CylinderGeometry(2.3,2.3,.35,12),COLOR.pad,x,.18,z,false);pad.material.emissive=new THREE.Color(COLOR.pad);pad.material.emissiveIntensity=.6;pad.userData.jumpPad=true});
  [[-4,-7,5,1.6],[7,14,7,1.1],[10,7,1.5,6]].forEach(([x,z,w,d])=>outline(add(new THREE.BoxGeometry(w,2.2,d),COLOR.accentPink,x,1.1,z)));
  // 高台、坂、橋、トンネル、円柱、コンテナ、低い遮蔽物。
  outline(add(new THREE.BoxGeometry(8,1.5,6),COLOR.accentBlue,-8,.75,-14));add(new THREE.BoxGeometry(6,.5,5),COLOR.block,-3,.5,-14,true,0).rotation.z=-.16;
  outline(add(new THREE.BoxGeometry(7,.45,2.2),COLOR.cap,5,1.8,-7));add(new THREE.BoxGeometry(.5,1.8,2.2),COLOR.blockDark,1.8,.9,-7);add(new THREE.BoxGeometry(.5,1.8,2.2),COLOR.blockDark,8.2,.9,-7);
  add(new THREE.BoxGeometry(6,.6,4),COLOR.cap,-7,3,6);add(new THREE.BoxGeometry(.6,3,4),COLOR.accentBlue,-10,1.5,6);add(new THREE.BoxGeometry(.6,3,4),COLOR.accentBlue,-4,1.5,6);
  [[-16,-5],[16,-8],[2,15]].forEach(([x,z],i)=>add(new THREE.CylinderGeometry(1.1,1.1,3,10),[COLOR.block,COLOR.accentPink,COLOR.accentBlue][i],x,1.5,z));
  [[14,-15,COLOR.accentBlue],[-16,14,COLOR.accentPink]].forEach(([x,z,color])=>outline(add(new THREE.BoxGeometry(5,2.5,2.5),color,x,1.25,z)));
  [[-1,6,5],[14,7,4],[-14,-1,4]].forEach(([x,z,w])=>outline(add(new THREE.BoxGeometry(w,1.25,.7),COLOR.blockDark,x,.625,z)));

  // 昼間の空。上へ行くほど濃い青、地平線へ向かうほど淡くなるドームを張る。
  const sky=new THREE.SphereGeometry(70,16,12),skyColors=[],vertices=sky.attributes.position,zenith=new THREE.Color(0x4d8ed6),horizon=new THREE.Color(0xdcecfb);
  for(let i=0;i<vertices.count;i++){const height=Math.max(0,Math.min(1,vertices.getY(i)/70*1.5+.25)),color=horizon.clone().lerp(zenith,height);skyColors.push(color.r,color.g,color.b)}
  sky.setAttribute('color',new THREE.Float32BufferAttribute(skyColors,3));
  scene.add(new THREE.Mesh(sky,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false})));
  scene.add(new THREE.HemisphereLight(0xdcecff,0x8a93b5,1.8));const sun=new THREE.DirectionalLight(0xfff6ec,1.7);sun.position.set(8,18,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
  // 青とピンクの照明が白い床を染め、本家のような色の光溜まりを作る。
  [[-13,7,-9,0x4f9dff],[13,7,9,0xff5aa8],[13,7,-11,0xff5aa8],[-13,7,11,0x4f9dff]].forEach(([x,y,z,color])=>{const light=new THREE.PointLight(color,300,30,2);light.position.set(x,y,z);scene.add(light)});
  return obstacles;
}
