import { cpSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const hostal = dirname(fileURLToPath(import.meta.url));
const root = resolve(hostal, '..');
const frontend = join(root, 'frontend');
const output = join(hostal, 'dist');
const publicDir = join(output, 'httpdocs');
const vite = join(frontend, 'node_modules', 'vite', 'bin', 'vite.js');

rmSync(output, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });
const built = spawnSync(process.execPath, [vite, 'build', '--outDir', publicDir, '--emptyOutDir'], { cwd: frontend, stdio: 'inherit' });
if (built.status !== 0) process.exit(built.status || 1);

cpSync(join(root, 'backend', 'wwwroot', 'images'), join(publicDir, 'images'), { recursive: true });
copyFileSync(join(root, 'backend', 'wwwroot', 'og.png'), join(publicDir, 'og.png'));
cpSync(join(hostal, 'httpdocs'), publicDir, { recursive: true });
cpSync(join(hostal, 'private'), join(output, 'private'), {
  recursive: true,
  filter: path => !path.endsWith('config.php'),
});
copyFileSync(join(hostal, 'schema.sql'), join(output, 'schema.sql'));
copyFileSync(join(hostal, 'README.md'), join(output, 'README.md'));
console.log(`Host.al package ready: ${output}`);
