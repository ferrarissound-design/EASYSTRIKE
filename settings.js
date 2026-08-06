const defaults = {
  sfx: 70, bgm: 20, sensitivity: 50, aimAssistEnabled: true, aimAssistStrength: 65, cameraShake: false,
  crosshairSize: 100, crosshairColor: '#ffffff', buttonSize: 100, leftHanded: false,
  jumpButtonSize: 105, jumpButtonPosition: 'standard', fireButtonSize: 110, fireButtonPosition: 'standard', autoJump: true,
  // 端末で分けない。スマホでも影と質感をそのまま出す。
  quality: 'medium', qualityPinned: false,
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('firstBlastSettings') || '{}');
    const merged = { ...defaults, ...(saved && typeof saved === 'object' ? saved : {}) };
    if (saved?.aimAssist && saved.aimAssistEnabled === undefined) {
      merged.aimAssistEnabled = saved.aimAssist !== 'off';
      merged.aimAssistStrength = { weak: 35, normal: 65, strong: 90 }[saved.aimAssist] || 65;
    }
    // 以前はタッチ端末に「低」を自動で割り当てていた。自分で選んだ画質だけを残し、
    // 割り当てられただけのものは新しい既定に戻す。
    if (!merged.qualityPinned) merged.quality = defaults.quality;
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
      if (id === 'quality') settings.qualityPinned = true;
      saveSettings(settings); applySettings(settings); onChange?.();
    });
  });
  ['aimAssistEnabled', 'autoJump', 'cameraShake', 'leftHanded'].forEach(id => {
    const input = document.getElementById(`setting-${id}`); input.checked = settings[id];
    input.addEventListener('change', () => { settings[id] = input.checked; saveSettings(settings); applySettings(settings); onChange?.(); });
  });
}

