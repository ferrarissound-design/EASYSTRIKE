import { MOBILE_TUNING } from './mobileTuning.js';

export class JumpController {
  constructor(settings, tuning = MOBILE_TUNING.movement) {
    this.settings = settings;
    this.tuning = tuning;
    this.reset();
  }

  reset() {
    this.bufferRemaining = 0;
    this.coyoteRemaining = this.tuning.CoyoteTime;
    this.wasHeld = false;
  }

  update(dt, { held, grounded, airJumps }) {
    const pressed = held && !this.wasHeld;
    this.wasHeld = held;
    this.coyoteRemaining = grounded
      ? this.tuning.CoyoteTime
      : Math.max(0, this.coyoteRemaining - dt);

    const autoJump = this.settings.autoJump ?? this.tuning.AutoJumpEnabled;
    if (pressed || (held && autoJump)) this.bufferRemaining = this.tuning.JumpBufferTime;
    else this.bufferRemaining = Math.max(0, this.bufferRemaining - dt);

    const groundJump = this.coyoteRemaining > 0;
    const airJump = !groundJump && pressed && airJumps > 0;
    if (this.bufferRemaining <= 0 || (!groundJump && !airJump)) {
      return { jump: false, airJump: false };
    }

    this.bufferRemaining = 0;
    this.coyoteRemaining = 0;
    return { jump: true, airJump };
  }

  debug(grounded, airJumps) {
    return {
      canJump: grounded || this.coyoteRemaining > 0 || airJumps > 0,
      bufferRemaining: this.bufferRemaining,
      coyoteRemaining: this.coyoteRemaining,
    };
  }
}
