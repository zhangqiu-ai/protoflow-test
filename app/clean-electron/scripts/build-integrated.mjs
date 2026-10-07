import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const applicationRoot = fileURLToPath(new URL('..', import.meta.url));
const projectRoot = path.resolve(applicationRoot, '../..');
for (const [cwd, script] of [[projectRoot, 'scripts/build-chat.mjs'], [applicationRoot, 'scripts/build.mjs']]) {
  const result = spawnSync(process.execPath, [script], { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
