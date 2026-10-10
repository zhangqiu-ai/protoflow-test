import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

const CLOSE_TIMEOUT_MS = 15000;
const CLEANUP_TIMEOUT_MS = 3000;

export function processGroupAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Unknown owned Electron process identity');
  if (process.platform === 'win32') throw new Error('Electron lifecycle tests require POSIX process groups');
  for (const identity of [pid, -pid]) {
    try { process.kill(identity, 0); return true; }
    catch (error) { if (error.code !== 'ESRCH') return true; }
  }
  return false;
}

/** Arm immediately after launch, before test actions can cause the application to exit. */
export function observeElectronProcess(app) {
  const child = app.process();
  const pid = child.pid;
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Electron did not expose its process identity');
  let exit = null;
  const exited = new Promise(resolve => {
    const observed = (code, signal) => { exit = { code, signal, observedAt: performance.now() }; resolve(exit); };
    if (child.exitCode !== null || child.signalCode !== null) observed(child.exitCode, child.signalCode);
    else child.once('exit', observed);
  });
  // Playwright launches the POSIX Electron child detached: its PID is the owned process-group ID.
  return { pid, pgid: pid, exited, get exit() { return exit; } };
}

async function waitForGroupExit(pid, deadline) {
  while (processGroupAlive(pid)) {
    if (performance.now() >= deadline) return false;
    await delay(20);
  }
  return true;
}

/** The original 15-second budget covers app.close(), actual exit and disappearance of the complete owned group. */
export async function closeElectronNormally(app, observation, onResult) {
  const startedAt = performance.now();
  const deadline = startedAt + CLOSE_TIMEOUT_MS;
  let timer, failure = null, timedOut = false, forcedTermination = false, terminationError = null;
  const timeoutError = () => new Error('Native Electron close exceeded 15 seconds');
  const normalClose = async () => {
    if (observation.exit) throw new Error('Electron exited before the normal close request');
    await app.close();
    const exit = await observation.exited;
    if (exit.code !== 0 || exit.signal !== null) throw new Error(`Electron exited abnormally: code ${exit.code}, signal ${exit.signal}`);
    if (!(await waitForGroupExit(observation.pid, deadline)) || performance.now() > deadline) { timedOut = true; throw timeoutError(); }
  };
  try {
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => { timedOut = true; reject(timeoutError()); }, Math.max(0, deadline - performance.now())); });
    await Promise.race([normalClose(), timeout]);
  } catch (error) {
    failure = error;
    clearTimeout(timer);
    if (processGroupAlive(observation.pid)) {
      forcedTermination = true;
      try { process.kill(-observation.pgid, 'SIGKILL'); }
      catch (killError) { if (killError.code !== 'ESRCH') terminationError = killError.message; }
      await waitForGroupExit(observation.pid, performance.now() + CLEANUP_TIMEOUT_MS);
    }
  } finally { clearTimeout(timer); }
  const exit = observation.exit;
  const processGroupActive = processGroupAlive(observation.pid);
  const result = {
    status: failure || processGroupActive ? 'FAIL' : 'PASS', pid: observation.pid, pgid: observation.pgid,
    timeoutMs: CLOSE_TIMEOUT_MS, elapsedMs: performance.now() - startedAt,
    exit: exit ? { code: exit.code, signal: exit.signal } : null,
    exitElapsedMs: exit ? exit.observedAt - startedAt : null,
    timedOut, forcedTermination, processGroupActive, terminationError, error: failure?.message ?? null
  };
  await onResult?.(result);
  if (processGroupActive) throw Object.assign(new Error('Owned Electron process group remains active after cleanup'), { shutdown: result });
  if (failure) throw Object.assign(failure, { shutdown: result });
  return result;
}
