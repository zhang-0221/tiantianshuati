import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist-desktop');

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const entry of ['index.html', 'auth-config.js', 'assets']) {
  cpSync(resolve(root, entry), resolve(output, entry), { recursive: true });
}

console.log('Desktop assets prepared in dist-desktop');
