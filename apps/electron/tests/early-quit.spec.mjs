import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { observeElectronProcess, processGroupAlive } from './electron-lifecycle.mjs';

const require = createRequire(import.meta.url);
const target = fileURLToPath(new URL('..', import.meta.url));

test('a quit request before ready exits normally within 15 seconds', async ({}, info) => {
  test.setTimeout(25000);
  const userData = info.outputPath('user-data');
  await fs.mkdir(userData, { recursive: true });
  const entry = info.outputPath('early-quit.cjs');
  await fs.writeFile(entry, `
const { app } = require('electron');
process.on('uncaughtException', error => console.error(error.stack));
app.on('before-quit', () => console.log('early-quit-ready:' + app.isReady()));
require(process.env.PF_EARLY_QUIT_MAIN);
try { app.quit(); } catch (error) { console.error(error.stack); }
`);
  const startedAt = performance.now(), deadline = startedAt + 15000;
  const child = spawn(require('electron'), [entry], {
    detached: true,
    env: { ...process.env, PF_ACCEPTANCE_USER_DATA: userData, PF_EARLY_QUIT_MAIN: path.join(target, 'electron/main.cjs') },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const observation = observeElectronProcess({ process: () => child });
  let stdout = '', stderr = '', forcedTermination = false, timer;
  child.stdout.on('data', bytes => { stdout += bytes; });
  child.stderr.on('data', bytes => { stderr += bytes; });
  try {
    const outcome = await Promise.race([
      observation.exited,
      new Promise(resolve => { timer = setTimeout(() => resolve(null), Math.max(0, deadline - performance.now())); })
    ]);
    while (processGroupAlive(observation.pid) && performance.now() < deadline) await delay(20);
    expect(stdout).toContain('early-quit-ready:false');
    expect(stderr).not.toMatch(/TypeError|uncaught|Could not finish session cleanup/i);
    expect(outcome, 'the early normal quit must exit without cleanup termination').not.toBeNull();
    expect(outcome).toMatchObject({ code: 0, signal: null });
    expect(processGroupAlive(observation.pid)).toBe(false);
    expect(performance.now() - startedAt).toBeLessThanOrEqual(15000);
  } finally {
    clearTimeout(timer);
    if (processGroupAlive(observation.pid)) {
      forcedTermination = true;
      try { process.kill(-observation.pgid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
      const cleanupDeadline = performance.now() + 3000;
      while (processGroupAlive(observation.pid) && performance.now() < cleanupDeadline) await delay(20);
    }
    await info.attach('early-quit', { body: JSON.stringify({ stdout, stderr, exit: observation.exit, elapsedMs: performance.now() - startedAt, forcedTermination, processGroupActive: processGroupAlive(observation.pid) }, null, 2), contentType: 'application/json' });
    expect(processGroupAlive(observation.pid), 'owned group must be gone after cleanup').toBe(false);
    expect(forcedTermination, 'forced cleanup cannot count as a successful normal quit').toBe(false);
  }
});
