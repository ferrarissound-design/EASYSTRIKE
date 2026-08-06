const GAMEPLAY_SURFACE = '#game, #hud, #mobile';
const DOUBLE_TAP_WINDOW = 350;

export function bindViewportGestureLock() {
  const cancel = event => event.preventDefault();
  ['gesturestart', 'gesturechange', 'gestureend', 'dblclick'].forEach(type => {
    document.addEventListener(type, cancel, { passive: false });
  });

  let lastTouchEnd = -Infinity;
  document.addEventListener('touchend', event => {
    const target = event.target;
    if (!target?.closest?.(GAMEPLAY_SURFACE) || target.closest('button, input, select')) return;
    const now = event.timeStamp;
    if (now - lastTouchEnd <= DOUBLE_TAP_WINDOW) event.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
}
