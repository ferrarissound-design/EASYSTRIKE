const defaults = {
  sfx: 70, bgm: 20, sensitivity: 50, aimAssistEnabled: true, aimAssistStrength: 65, cameraShake: false,
  crosshairSize: 100, crosshairColor: '#ffffff', buttonSize: 100, leftHanded: false,
  jumpButtonSize: 105, jumpButtonPosition: 'standard', fireButtonSize: 110, fireButtonPosition: 'standard', autoJump: true,
  quality: matchMedia('(pointer: coarse)').matches ? 'low' : 'medium',
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('firstBlastSettings') || '{}');
    const merged = { ...defaults, ...(saved && typeof saved === 'object' ? saved : {}) };
    if (saved?.aimAssist && saved.aimAssistEnabled === undefined) {
      merged.aimAssistEnabled = saved.aimAssist !== 'off';
      merged.aimAssistStrength = { weak: 35, normal: 65, strong: 90 }[saved.aimAssist] || 65;
    }
    return merged;
  } catch { return { ...defaults }; }
}

export function saveSettings(settings) {
  localStorage.setItem('firstBlastSettings', JSON.stringify(settings));
}

export function applySettings(settings) {
  const root = document.documentElement;
  root.style.setProperty('--crosshair-size', `${settings.crosshairSize / 100}`);
  root.style.setProperty('--crosshair-color', settings.crosshairColor);
  root.style.setProperty('--button-scale', `${settings.buttonSize / 100}`);
  root.style.setProperty('--jump-button-scale', `${settings.jumpButtonSize / 100}`);
  root.style.setProperty('--fire-button-scale', `${settings.fireButtonSize / 100}`);
  document.body.dataset.jumpPosition = settings.jumpButtonPosition;
  document.body.dataset.firePosition = settings.fireButtonPosition;
  document.body.classList.toggle('left-handed', settings.leftHanded);
}

export function bindSettings(settings, onChange) {
  const ids = ['sfx', 'bgm', 'sensitivity', 'aimAssistStrength', 'crosshairSize', 'crosshairColor', 'buttonSize',
    'jumpButtonSize', 'jumpButtonPosition', 'fireButtonSize', 'fireButtonPosition', 'quality'];
  ids.forEach(id => {
    const input = document.getElementById(`setting-${id}`);
    input.value = settings[id];
    input.addEventListener('input', () => {
      settings[id] = input.type === 'range' ? Number(input.value) : input.value;
      saveSettings(settings); applySettings(settings); onChange?.();
    });
  });
  ['aimAssistEnabled', 'autoJump', 'cameraShake', 'leftHanded'].forEach(id => {
    const input = document.getElementById(`setting-${id}`); input.checked = settings[id];
    input.addEventListener('change', () => { settings[id] = input.checked; saveSettings(settings); applySettings(settings); onChange?.(); });
  });
}

