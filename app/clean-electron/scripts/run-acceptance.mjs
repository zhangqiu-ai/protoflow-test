import { spawnSync } from 'node:child_process';
import { loadModuleConfig, projectRoot } from './module-config.mjs';

try {
  const { config, runAcceptanceAdapter, engineEntry } = await loadModuleConfig();
  process.env.PROTOFLOW_ENGINE_ENTRY = engineEntry;
  const command = config.verification.build;
  const build = spawnSync(command.argv[0], command.argv.slice(1), {
    cwd: projectRoot, stdio: 'inherit', shell: false, timeout: command.timeoutMs
  });
  if (build.error) throw build.error;
  if (build.status !== 0) throw new Error(`Integrated build failed (exit ${build.status ?? 'unknown'})`);
  const result = await runAcceptanceAdapter(projectRoot, config, 'functional', {
    source: { sha: config.source.startSha }, scenes: config.visual.scenes
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  console.log(`Electron functional acceptance: ${result.status}`);
  if (result.status !== 'PASS') throw new Error(result.reason ?? result.error ?? 'Supervised acceptance did not pass');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
