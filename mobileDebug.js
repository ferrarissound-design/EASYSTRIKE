export class MobileDebug {
  constructor(enabled = false) {
    this.enabled = enabled;
    this.panel = document.getElementById('mobileDebug');
    this.range = document.getElementById('assistRange');
    this.timer = 0;
    document.body.classList.toggle('touch-debug', enabled);
  }

  update(dt, aim, jump, controls) {
    if (!this.enabled) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = .1;
    this.panel.innerHTML = [
      `対象 ${aim.target}`,
      `角度 ${aim.angle.toFixed(1)}° / 範囲 ${aim.limit.toFixed(0)}° / 距離 ${aim.distance.toFixed(1)}`,
      `補正 ${(aim.strength * 100).toFixed(0)}% / 壁 ${aim.wallClear ? '見通しあり' : '遮られている'}`,
      `タッチ ${controls.lastInput === 'touch' ? 'あり' : 'なし'} / 視点 ${controls.touchLooking ? '操作中' : '待機'}`,
      `ジャンプ ${jump.canJump ? '可能' : '不可'}`,
      `先行入力 ${jump.bufferRemaining.toFixed(2)} / コヨーテ ${jump.coyoteRemaining.toFixed(2)}`,
    ].join('<br>');
    this.range.classList.toggle('active', aim.active);
  }
}
