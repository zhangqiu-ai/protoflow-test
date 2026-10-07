import { cp, mkdir, mkdtemp, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadModuleConfig, projectRoot } from './module-config.mjs';

try {
  const { config, sdk, engineEntry } = await loadModuleConfig();
  if (typeof sdk.createContext !== 'function' || typeof sdk.loadVersion !== 'function' || typeof sdk.verify !== 'function') throw new Error('The shared SDK must provide context, frozen version and verification APIs');
  process.env.PROTOFLOW_ENGINE_ENTRY = engineEntry;
  const manifestId = `git-${config.source.startSha}`;
  const inputRoot = path.join(projectRoot, 'app/clean-electron/verification-input', manifestId);
  const manifest = JSON.parse(await readFile(path.join(inputRoot, 'manifest.json'), 'utf8'));
  if (manifest.id !== manifestId || ['repository', 'branch', 'path'].some(key => manifest.source?.[key] !== config.source[key]) || manifest.source?.sha !== config.source.startSha) throw new Error('Committed verification inputs do not match the configured Git source');

  // A fresh project carries only this version's original input, without any existing queue or verification state.
  const isolatedRoot = path.join(await mkdtemp(path.join(tmpdir(), 'pf-verify-')), 'project');
  const excluded = new Set(['.git', '.protoflow', 'node_modules', 'test-results', 'playwright-report']);
  await cp(projectRoot, isolatedRoot, { recursive: true, filter: source => !excluded.has(path.basename(source)) });
  const faultMarkers = [];
  // Fault injection is operational input, not disposable Runner state. Preserve both build markers.
  for (const relative of ['.protoflow/fail-build', 'app/clean-electron/.protoflow/fail-build']) {
    try {
      await readFile(path.join(projectRoot, relative));
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    await mkdir(path.dirname(path.join(isolatedRoot, relative)), { recursive: true });
    await cp(path.join(projectRoot, relative), path.join(isolatedRoot, relative));
    faultMarkers.push(relative);
  }
  for (const relative of ['node_modules', 'app/clean-electron/node_modules']) {
    await symlink(path.join(projectRoot, relative), path.join(isolatedRoot, relative), 'dir');
  }
  await mkdir(path.join(isolatedRoot, '.protoflow/manifests'), { recursive: true });
  await cp(path.join(inputRoot, 'manifest.json'), path.join(isolatedRoot, '.protoflow/manifests', `${manifestId}.json`));
  await mkdir(path.join(isolatedRoot, '.protoflow/versions', manifestId), { recursive: true });
  for (const name of ['index.json', 'files']) await cp(path.join(inputRoot, name), path.join(isolatedRoot, '.protoflow/versions', manifestId, name), { recursive: true });
  console.log(`Isolated verification project: ${isolatedRoot}`);
  if (faultMarkers.length) {
    // Run the real blocked build, then stop before launching an application without build output.
    const command = config.verification.build;
    const build = spawnSync(command.argv[0], command.argv.slice(1), { cwd: isolatedRoot, stdio: 'inherit', shell: false, timeout: command.timeoutMs });
    if (build.error) throw build.error;
    throw new Error(`Operator failure injection preserved (${faultMarkers.join(', ')}); build exit ${build.status ?? 'unknown'}; functional and visual NOT_RUN`);
  }
  await sdk.loadVersion(isolatedRoot, config, manifest);
  await sdk.createContext(isolatedRoot, config, manifestId, { spec: config.runner.spec, adr: config.runner.adr });
  const result = await sdk.verify(isolatedRoot, config, manifestId);
  console.log(JSON.stringify({ status: result.status, manifestId, sourceSha: manifest.source.sha,
    configuration: 'app/clean-electron/protoflow.config.json',
    verification: path.join(isolatedRoot, '.protoflow/verifications', `${result.id}.json`)
  }, null, 2));
  if (result.status !== 'PASS') process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
