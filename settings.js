const defaults = {
  sfx: 70, bgm: 20, sensitivity: 50, aimAssist: 'normal', cameraShake: false,
  crosshairSize: 100, crosshairColor: '#ffffff', buttonSize: 100, leftHanded: false,
  quality: matchMedia('(pointer: coarse)').matches ? 'low' : 'medium',
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('firstBlastSettings') || '{}');
    return { ...defaults, ...(saved && typeof saved === 'object' ? saved : {}) };
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
  document.body.classList.toggle('left-handed', settings.leftHanded);
}

export function bindSettings(settings, onChange) {
  const ids = ['sfx', 'bgm', 'sensitivity', 'aimAssist', 'crosshairSize', 'crosshairColor', 'buttonSize', 'quality'];
  ids.forEach(id => {
    const input = document.getElementById(`setting-${id}`);
    input.value = settings[id];
    input.addEventListener('input', () => {
      settings[id] = input.type === 'range' ? Number(input.value) : input.value;
      saveSettings(settings); applySettings(settings); onChange?.();
    });
  });
  ['cameraShake', 'leftHanded'].forEach(id => {
    const input = document.getElementById(`setting-${id}`); input.checked = settings[id];
    input.addEventListener('change', () => { settings[id] = input.checked; saveSettings(settings); applySettings(settings); });
  });
}

