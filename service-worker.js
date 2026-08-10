const CACHE = 'first-blast-v2';
const SHELL = [
  './', './index.html', './style.css', './manifest.webmanifest', './icon.svg',
  './vendor/three.module.js', './main.js', './arena.js', './controls.js', './player.js',
  './weapon.js', './enemy.js', './ui.js', './effects.js', './difficulty.js', './settings.js',
  './contracts.js', './audio.js', './gears.js', './rivalStyles.js', './cosmetics.js',
  './circuit.js', './aimAssist.js', './mobileDebug.js', './viewportGuard.js', './graphics.js',
  './enemyWeapons.js', './enemyTactics.js', './enemyMovement.js', './mobileTuning.js',
  './jumpController.js', './collision.js', './daily.js', './mastery.js', './navigation.js', './ghost.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
