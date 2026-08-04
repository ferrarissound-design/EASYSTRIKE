export class UI{
 constructor(){this.hp=document.getElementById('hpBar');this.hpText=document.getElementById('hpText');this.ammo=document.getElementById('ammo');this.reload=document.getElementById('reloadText');this.hit=document.getElementById('hitmarker')}
 update(player,weapon,kills,deaths){this.hp.style.width=player.hp/2+'%';this.hp.style.background=player.hp<60?'#ff3b4e':'';this.hpText.textContent=Math.ceil(player.hp);this.ammo.textContent=weapon.ammo;this.reload.textContent=weapon.reloading?'RELOADING...':'';document.getElementById('kills').textContent=kills;document.getElementById('deaths').textContent=deaths}
 hitmark(){this.hit.classList.add('show');setTimeout(()=>this.hit.classList.remove('show'),100)}
 end(win,k,d){document.exitPointerLock?.();document.getElementById('result').textContent=win?'Victory!':'Game Over';document.getElementById('resultDetail').textContent=`撃破 ${k}　/　敗北 ${d}`;document.getElementById('message').classList.remove('hidden')}
}
