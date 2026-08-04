export class Controls{
 constructor(element){this.move={x:0,y:0};this.look={x:0,y:0};this.fire=false;this.jump=false;this.dash=false;this.keys={};this.mobile=matchMedia('(pointer:coarse)').matches;
  addEventListener('keydown',e=>{this.keys[e.code]=true;if(e.code==='KeyR')this.reload?.()});addEventListener('keyup',e=>this.keys[e.code]=false);
  element.addEventListener('click',()=>{if(!this.mobile)element.requestPointerLock()});addEventListener('mousemove',e=>{if(document.pointerLockElement===element){this.look.x+=e.movementX;this.look.y+=e.movementY}});addEventListener('mousedown',()=>this.fire=true);addEventListener('mouseup',()=>this.fire=false);
  this.touchStick();this.touchLook();[['fire','fire'],['jump','jump'],['dash','dash']].forEach(([id,p])=>{const b=document.getElementById(id);b.onpointerdown=e=>{e.stopPropagation();this[p]=true};b.onpointerup=b.onpointercancel=e=>{e.stopPropagation();this[p]=false}});
 }
 touchStick(){const s=document.getElementById('stick'),knob=s.querySelector('i');let id;s.onpointerdown=e=>{id=e.pointerId;s.setPointerCapture(id)};s.onpointermove=e=>{if(e.pointerId!==id)return;const r=s.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,l=Math.hypot(x,y),k=Math.min(45,l)/(l||1);this.move={x:x/45*k,y:-y/45*k};knob.style.transform=`translate(${x*k}px,${y*k}px)`};s.onpointerup=s.onpointercancel=()=>{id=null;this.move={x:0,y:0};knob.style.transform=''}}
 touchLook(){const a=document.getElementById('look');let id,x,y;a.onpointerdown=e=>{id=e.pointerId;x=e.clientX;y=e.clientY;a.setPointerCapture(id)};a.onpointermove=e=>{if(e.pointerId===id){this.look.x+=(e.clientX-x)*1.4;this.look.y+=(e.clientY-y)*1.4;x=e.clientX;y=e.clientY}};a.onpointerup=a.onpointercancel=()=>id=null}
 sample(){const x=this.move.x+(this.keys.KeyD?1:0)-(this.keys.KeyA?1:0),y=this.move.y+(this.keys.KeyW?1:0)-(this.keys.KeyS?1:0);return{x,y,jump:this.jump||this.keys.Space,dash:this.dash||this.keys.ShiftLeft,fire:this.fire}}
}
