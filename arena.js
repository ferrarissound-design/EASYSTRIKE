import * as THREE from 'three';
export const ARENA_SIZE=42;

export function createArena(scene,colliders){
  const obstacles=[], mat=color=>new THREE.MeshLambertMaterial({color,flatShading:true});
  const add=(geometry,color,x,y,z,solid=true,rotation=0)=>{const mesh=new THREE.Mesh(geometry,mat(color));mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);if(solid){colliders.push(new THREE.Box3().setFromObject(mesh));obstacles.push(mesh)}return mesh};
  add(new THREE.BoxGeometry(ARENA_SIZE,.5,ARENA_SIZE),0x5266a8,0,-.25,0,false);
  // 色分けされた4エリアで現在地を把握しやすくする。
  [[-10,-10,0x4c83c8],[10,-10,0xd5a338],[-10,10,0x48a86b],[10,10,0xc85b98]].forEach(([x,z,c])=>add(new THREE.PlaneGeometry(19,19),c,x,.012,z,false,-Math.PI/2).rotation.x=-Math.PI/2);
  add(new THREE.BoxGeometry(ARENA_SIZE,5,.7),0x263667,0,2.5,-21);add(new THREE.BoxGeometry(ARENA_SIZE,5,.7),0x263667,0,2.5,21);add(new THREE.BoxGeometry(.7,5,ARENA_SIZE),0x32447d,-21,2.5,0);add(new THREE.BoxGeometry(.7,5,ARENA_SIZE),0x32447d,21,2.5,0);
  const crates=[[-14,-12],[-8,-5],[-15,7],[-7,14],[0,-13],[4,8],[12,-10],[15,2],[12,14],[-2,1]];
  crates.forEach(([x,z],i)=>{const mesh=add(new THREE.BoxGeometry(2.8,2.8,2.8),i%2?0xf0a13b:0xe4733d,x,1.4,z);mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:0x743b28}))) });
  [[-12,1],[10,-1],[0,-18]].forEach(([x,z])=>{const pad=add(new THREE.CylinderGeometry(2.3,2.3,.35,12),0x37d5dc,x,.18,z,false);pad.userData.jumpPad=true});
  [[-4,-7,5,1.6],[7,14,7,1.1],[10,7,1.5,6]].forEach(([x,z,w,d])=>add(new THREE.BoxGeometry(w,2.2,d),0x9d50d9,x,1.1,z));
  // 高台、坂、橋、トンネル、円柱、コンテナ、低い遮蔽物。
  add(new THREE.BoxGeometry(8,1.5,6),0x3bca8b,-8,.75,-14);add(new THREE.BoxGeometry(6,.5,5),0x61df9c,-3,.5,-14,true,0).rotation.z=-.16;
  add(new THREE.BoxGeometry(7,.45,2.2),0xffcc55,5,1.8,-7);add(new THREE.BoxGeometry(.5,1.8,2.2),0xff8c42,1.8,.9,-7);add(new THREE.BoxGeometry(.5,1.8,2.2),0xff8c42,8.2,.9,-7);
  add(new THREE.BoxGeometry(6,.6,4),0x4d64a9,-7,3,6);add(new THREE.BoxGeometry(.6,3,4),0x4d64a9,-10,1.5,6);add(new THREE.BoxGeometry(.6,3,4),0x4d64a9,-4,1.5,6);
  [[-16,-5],[16,-8],[2,15]].forEach(([x,z],i)=>add(new THREE.CylinderGeometry(1.1,1.1,3,10),[0x51b9ef,0xffd24f,0x69d67c][i],x,1.5,z));
  [[14,-15,0x20bcd4],[-16,14,0xff5a87]].forEach(([x,z,c])=>add(new THREE.BoxGeometry(5,2.5,2.5),c,x,1.25,z));
  [[-1,6,5],[14,7,4],[-14,-1,4]].forEach(([x,z,w])=>add(new THREE.BoxGeometry(w,1.25,.7),0x78a7e8,x,.625,z));
  scene.add(new THREE.HemisphereLight(0xd7f2ff,0x293054,2.5));const sun=new THREE.DirectionalLight(0xffffff,1.8);sun.position.set(8,18,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
  return obstacles;
}
