export class Controls {
  constructor(element, settings) {
    this.element = element;
    this.settings = settings;
    this.move = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.keys = {};
    this.fire = this.aim = this.jump = this.crouch = false;
    this.firePressed = this.jumpPressed = false;
    this.crouchPressed = false;
    this.quickMelee = this.quickUtility = false;
    this.mobile = matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).has('forceTouch');
    this.lastInput = this.mobile ? 'touch' : 'mouse';
    this.touchLooking = false;
    document.body.classList.toggle('force-touch', this.mobile);
    this.bindKeyboard();
    this.bindPointer();
    this.bindTouchControls();
  }

  bindKeyboard() {
    addEventListener('keydown', event => {
      this.keys[event.code] = true;
      if (event.code === 'KeyR') this.reload?.();
      if ((event.code === 'KeyC' || event.code === 'ControlLeft') && !event.repeat) this.crouchPressed = true;
      if (event.code === 'KeyQ' && !event.repeat) this.quickMelee = true;
      if (event.code === 'KeyE' && !event.repeat) this.quickUtility = true;
      if (event.code === 'Escape') this.menu?.();
      if (/^Digit[1234]$/.test(event.code)) this.switchWeapon?.(Number(event.code.at(-1)) - 1);
    });
    addEventListener('keyup', event => { this.keys[event.code] = false; });
  }

  bindPointer() {
    this.element.addEventListener('click', () => {
      if (!this.mobile) this.element.requestPointerLock();
    });
    addEventListener('mousemove', event => {
      if (document.pointerLockElement !== this.element) return;
      this.lastInput = 'mouse';
      const scale = .001 + this.settings.sensitivity * .00002;
      this.look.x += event.movementX * scale;
      this.look.y += event.movementY * scale;
    });
    addEventListener('mousedown', event => {
      if (this.mobile) return;
      this.lastInput = 'mouse';
      if (event.button === 0) { this.fire = true; this.firePressed = true; }
      if (event.button === 2) this.aim = true;
    });
    addEventListener('mouseup', event => {
      if (this.mobile) return;
      if (event.button === 0) this.fire = false;
      if (event.button === 2) this.aim = false;
    });
  }

  bindTouchControls() {
    // ポインタキャプチャは環境によって失敗する。取れなくても操作は続行させる。
    const capture = (element, pointerId) => {
      try { element.setPointerCapture(pointerId); } catch { /* キャプチャ無しで続行 */ }
    };

    const stick = document.getElementById('stick');
    const knob = stick.querySelector('i');
    let stickId = null;
    stick.onpointerdown = event => {
      event.preventDefault();
      this.lastInput = 'touch';
      stickId = event.pointerId;
      capture(stick, stickId);
    };
    stick.onpointermove = event => {
      if (event.pointerId !== stickId) return;
      const rect = stick.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      const length = Math.hypot(x, y);
      const ratio = Math.min(42, length) / (length || 1);
      this.move = { x: x / 42 * ratio, y: -y / 42 * ratio };
      knob.style.transform = `translate(${x * ratio}px,${y * ratio}px)`;
    };
    stick.onpointerup = stick.onpointercancel = () => {
      stickId = null;
      this.move = { x: 0, y: 0 };
      knob.style.transform = '';
    };

    const look = document.getElementById('look');
    let lookId = null;
    let lastX = 0;
    let lastY = 0;
    look.onpointerdown = event => {
      event.preventDefault();
      this.lastInput = 'touch';
      this.touchLooking = true;
      lookId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      capture(look, lookId);
    };
    look.onpointermove = event => {
      if (event.pointerId !== lookId) return;
      this.lastInput = 'touch';
      const scale = .0013 + this.settings.sensitivity * .000018;
      this.look.x += (event.clientX - lastX) * scale;
      this.look.y += (event.clientY - lastY) * scale;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    look.onpointerup = look.onpointercancel = event => {
      if (event.pointerId !== lookId) return;
      lookId = null;
      this.touchLooking = false;
    };

    ['fire', 'jump', 'crouch', 'aim', 'reload', 'quickMelee', 'quickUtility'].forEach(property => {
      const button = document.getElementById(property);
      button.onpointerdown = event => {
        event.preventDefault();
        event.stopPropagation();
        this.lastInput = 'touch';
        // 入力を先に確定させる。setPointerCapture はiOSで NotFoundError を投げることが
        // あり、先に呼ぶとその1タップが丸ごと無視されてしまう。
        if (property === 'reload') this.reload?.();
        else this[property] = true;
        if (property === 'fire') this.firePressed = true;
        if (property === 'jump') this.jumpPressed = true;
        if (property === 'crouch') this.crouchPressed = true;
        capture(button, event.pointerId);
      };
      // 離した瞬間は押下フラグを立てない。ジャンプは押し始めの1回だけ発火する。
      const release = event => {
        event?.stopPropagation();
        if (!['reload', 'quickMelee', 'quickUtility'].includes(property)) this[property] = false;
      };
      button.onpointerup = button.onpointercancel = release;
      // iOSでpointerupが届かずキャプチャだけ外れることがある。押しっぱなし扱いで
      // 固まらないよう、キャプチャ喪失も離した扱いにする。
      button.onlostpointercapture = release;
    });
  }

  clearActions() {
    this.fire = this.aim = this.jump = this.crouch = false;
    this.firePressed = this.jumpPressed = false;
    this.crouchPressed = false;
    this.quickMelee = this.quickUtility = false;
    this.touchLooking = false;
    this.keys = {};
  }

  sample() {
    const x = this.move.x + (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0);
    const y = this.move.y + (this.keys.KeyW ? 1 : 0) - (this.keys.KeyS ? 1 : 0);
    const result = {
      x, y,
      jump: this.jump || this.jumpPressed || this.keys.Space,
      crouch: this.crouch || this.keys.KeyC || this.keys.ControlLeft || this.crouchPressed,
      sprint: this.keys.ShiftLeft || this.keys.ShiftRight,
      fire: this.fire || this.firePressed,
      aim: this.aim,
      quickMelee: this.quickMelee,
      quickUtility: this.quickUtility,
    };
    this.firePressed = false;
    this.jumpPressed = false;
    this.crouchPressed = false;
    this.quickMelee = this.quickUtility = false;
    return result;
  }
}
