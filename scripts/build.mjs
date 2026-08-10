import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const rootFiles = await readdir(root, { withFileTypes: true });

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, 'vendor'), { recursive: true });

for (const entry of rootFiles) {
  if (!entry.isFile()) continue;
  if (!/\.(?:js|css|html|webmanifest|svg)$/.test(entry.name)) continue;
  await cp(join(root, entry.name), join(dist, entry.name));
}

await cp(
  join(root, 'node_modules', 'three', 'build', 'three.module.js'),
  join(dist, 'vendor', 'three.module.js'),
);

console.log('Built dist/ with local Three.js runtime');
