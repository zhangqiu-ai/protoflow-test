import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const applicationRoot = fileURLToPath(new URL('..', import.meta.url));
const projectRoot = path.resolve(applicationRoot, '../..');
const legacyCli = path.join(projectRoot, 'node_modules/@playwright/test/cli.js');
const electronCli = path.join(applicationRoot, 'node_modules/@playwright/test/cli.js');
for (const [cli, args] of [
  [legacyCli, ['test']],
  [electronCli, ['test', '--config', 'app/clean-electron/scripts/playwright.config.mjs']],
  [electronCli, ['test', '--config', 'app/clean-electron/scripts/adapter-playwright.config.mjs']],
  [electronCli, ['test', '--config', 'app/clean-electron/scripts/fresh-playwright.config.mjs']]
]) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: projectRoot, env: process.env, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
