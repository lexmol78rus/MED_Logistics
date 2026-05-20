import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const build = new Date().toISOString();

let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', {
    cwd: join(root, '..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  // not a git checkout or git unavailable
}

const meta = { build, commit };

mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'version.json'), `${JSON.stringify(meta, null, 2)}\n`);

const envLines = [
  `VITE_APP_BUILD=${build}`,
  `VITE_APP_BUILD_COMMIT=${commit}`,
  '',
];
writeFileSync(join(root, '.env.build'), envLines.join('\n'));

console.log(`[build-meta] build=${build} commit=${commit}`);
