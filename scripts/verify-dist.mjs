import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const required = new Set([
  'index.html',
  'manifest.webmanifest',
  'service-worker.js',
  'vendor/three.module.js',
]);

const serviceWorker = await readFile(join(dist, 'service-worker.js'), 'utf8');
for (const match of serviceWorker.matchAll(/'\.\/([^']+)'/g)) {
  const asset = match[1];
  if (asset && asset !== '') required.add(asset);
}

for (const asset of required) {
  await access(join(dist, ...asset.split('/')));
}

const index = await readFile(join(dist, 'index.html'), 'utf8');
if (!index.includes('"three":"./vendor/three.module.js"')) {
  throw new Error('Distribution import map does not use the bundled Three.js runtime');
}

const manifest = JSON.parse(await readFile(join(dist, 'manifest.webmanifest'), 'utf8'));
if (manifest.start_url !== './' || !Array.isArray(manifest.icons) || manifest.icons.length === 0) {
  throw new Error('Manifest must keep a relative start URL and at least one icon for project-page hosting');
}

console.log(`Verified ${required.size} deployable assets and the PWA manifest`);
