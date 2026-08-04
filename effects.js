import * as THREE from 'three';

export class Effects {
  constructor(scene, quality = 'medium') {
    this.scene = scene; this.quality = quality; this.active = [];
    this.pool = Array.from({ length: quality === 'low' ? 24 : 48 }, () => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.16), new THREE.MeshBasicMaterial({ transparent:true, opacity:0 }));
      mesh.visible = false; scene.add(mesh); return mesh;
    });
  }
  burst(position, color, count = 6, size = .16, duration = .45) {
    const available = this.pool.filter(item => !item.visible).slice(0, this.quality === 'low' ? Math.ceil(count / 2) : count);
    available.forEach((mesh, index) => { mesh.visible=true; mesh.material.color.set(color); mesh.material.opacity=1; mesh.scale.setScalar(size/.16); mesh.position.copy(position); this.active.push({mesh, velocity:new THREE.Vector3(Math.sin(index*2.4),Math.random()+.3,Math.cos(index*2.4)).multiplyScalar(2.2), life:duration, max:duration}); });
  }
  ring(position, color = 0x78eeff) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(.4, .55, 16), new THREE.MeshBasicMaterial({color, transparent:true, side:THREE.DoubleSide}));
    mesh.rotation.x=-Math.PI/2; mesh.position.copy(position); this.scene.add(mesh); this.active.push({mesh,velocity:new THREE.Vector3(),life:.7,max:.7,ring:true});
  }
  tracer(start, end, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start,end]); const line = new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true}));
    this.scene.add(line); this.active.push({mesh:line,velocity:new THREE.Vector3(),life:.09,max:.09,dispose:true});
  }
  update(dt) {
    for(let i=this.active.length-1;i>=0;i--){const effect=this.active[i];effect.life-=dt;effect.mesh.position.addScaledVector(effect.velocity,dt);effect.mesh.material.opacity=Math.max(0,effect.life/effect.max);if(effect.ring)effect.mesh.scale.addScalar(dt*4);if(effect.life<=0){effect.mesh.visible=false;if(effect.dispose){effect.mesh.geometry.dispose();effect.mesh.material.dispose();this.scene.remove(effect.mesh)}this.active.splice(i,1)}}
  }
}
