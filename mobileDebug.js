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
      `TARGET ${aim.target}`,
      `ANGLE ${aim.angle.toFixed(1)}° / CONE ${aim.limit.toFixed(0)}° / DIST ${aim.distance.toFixed(1)}`,
      `ASSIST ${(aim.strength * 100).toFixed(0)}% / WALL ${aim.wallClear ? 'CLEAR' : 'BLOCKED'}`,
      `TOUCH ${controls.lastInput === 'touch' ? 'YES' : 'NO'} / LOOK ${controls.touchLooking ? 'DRAG' : 'IDLE'}`,
      `JUMP ${jump.canJump ? 'READY' : 'LOCKED'}`,
      `BUFFER ${jump.bufferRemaining.toFixed(2)} / COYOTE ${jump.coyoteRemaining.toFixed(2)}`,
    ].join('<br>');
    this.range.classList.toggle('active', aim.active);
  }
}
