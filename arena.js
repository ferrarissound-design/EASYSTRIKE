import * as THREE from 'three';
export const ARENA_SIZE=42;
export function createArena(scene,colliders){
 const mat=c=>new THREE.MeshLambertMaterial({color:c,flatShading:true});
 const add=(geo,color,x,y,z,solid=true)=>{const m=new THREE.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);if(solid)colliders.push(new THREE.Box3().setFromObject(m));return m};
 add(new THREE.BoxGeometry(ARENA_SIZE,.5,ARENA_SIZE),0x5266a8,0,-.25,0,false);
 add(new THREE.BoxGeometry(ARENA_SIZE,5,.7),0x263667,0,2.5,-21);add(new THREE.BoxGeometry(ARENA_SIZE,5,.7),0x263667,0,2.5,21);add(new THREE.BoxGeometry(.7,5,ARENA_SIZE),0x32447d,-21,2.5,0);add(new THREE.BoxGeometry(.7,5,ARENA_SIZE),0x32447d,21,2.5,0);
 const crates=[[-14,-12],[-8,-5],[-15,7],[-7,14],[0,-13],[4,8],[12,-10],[15,2],[12,14],[-2,1]];
 crates.forEach(([x,z],i)=>{const m=add(new THREE.BoxGeometry(2.8,2.8,2.8),i%2?0xf0a13b:0xe4733d,x,1.4,z);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color:0x743b28}));m.add(edge)});
 [[-12,1],[10,-1]].forEach(([x,z])=>{const pad=add(new THREE.BoxGeometry(5,.45,5),0x37d5dc,x,.22,z,false);pad.userData.jumpPad=true});
 [[-4,-7,5,1.6],[7,14,7,1.1],[10,7,1.5,6]].forEach(([x,z,w,d])=>add(new THREE.BoxGeometry(w,2.2,d),0x9d50d9,x,1.1,z));
 const hemi=new THREE.HemisphereLight(0xaedfff,0x25264b,2.3);scene.add(hemi);const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(8,18,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
}
