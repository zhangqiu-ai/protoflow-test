import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadModuleConfig, projectRoot } from './module-config.mjs';

try {
  const { config, sdk, runAcceptanceAdapter, engineEntry } = await loadModuleConfig();
  if (typeof sdk.loadVersion !== 'function') throw new Error('The shared SDK must validate frozen version inputs');
  process.env.PROTOFLOW_ENGINE_ENTRY = engineEntry;
  const manifestId = `git-${config.source.startSha}`;
  const input = path.join(projectRoot, 'app/clean-electron/verification-input', manifestId);
  const manifest = JSON.parse(await readFile(path.join(input, 'manifest.json'), 'utf8'));
  if (manifest.id !== manifestId || manifest.source?.sha !== config.source.startSha || ['repository', 'branch', 'path'].some(key => manifest.source?.[key] !== config.source[key])) throw new Error('Committed test inputs do not match the configured source');
  // Public tests carry their own immutable inputs; existing Runner state is never required or overwritten.
  const isolatedRoot = path.join(await mkdtemp(path.join(tmpdir(), 'pf-functional-')), 'project');
  const excluded = new Set(['.git', '.protoflow', 'node_modules', 'test-results', 'playwright-report']);
  await cp(projectRoot, isolatedRoot, { recursive: true, filter: source => !excluded.has(path.basename(source)) });
  for (const relative of ['.protoflow/fail-build', 'app/clean-electron/.protoflow/fail-build']) {
    try { await readFile(path.join(projectRoot, relative)); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    await mkdir(path.dirname(path.join(isolatedRoot, relative)), { recursive: true });
    await cp(path.join(projectRoot, relative), path.join(isolatedRoot, relative));
  }
  for (const relative of ['node_modules', 'app/clean-electron/node_modules']) await symlink(path.join(projectRoot, relative), path.join(isolatedRoot, relative), 'dir');
  await mkdir(path.join(isolatedRoot, '.protoflow/versions', manifestId), { recursive: true });
  for (const name of ['index.json', 'files']) await cp(path.join(input, name), path.join(isolatedRoot, '.protoflow/versions', manifestId, name), { recursive: true });
  await sdk.loadVersion(isolatedRoot, config, manifest);
  console.log(`Isolated functional project: ${isolatedRoot}`);
  const command = config.verification.build;
  const build = spawnSync(command.argv[0], command.argv.slice(1), {
    cwd: isolatedRoot, stdio: 'inherit', shell: false, timeout: command.timeoutMs
  });
  if (build.error) throw build.error;
  if (build.status !== 0) throw new Error(`Integrated build failed (exit ${build.status ?? 'unknown'})`);
  const result = await runAcceptanceAdapter(isolatedRoot, config, 'functional', {
    manifestId, source: manifest.source, scenes: config.visual.scenes
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  console.log(`Electron functional acceptance: ${result.status}`);
  if (result.status !== 'PASS') throw new Error(result.reason ?? result.error ?? 'Supervised acceptance did not pass');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
