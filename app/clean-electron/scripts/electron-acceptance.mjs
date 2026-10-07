import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { access, mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { _electron } from '@playwright/test';

// Project-owned adapter. ProtoFlow core has no Electron or React assumptions.
const engineArgument = process.argv.indexOf('--engine');
const sdkPath = engineArgument === -1 ? process.env.PROTOFLOW_ENGINE_ENTRY : process.argv[engineArgument + 1];
if (typeof sdkPath !== 'string' || !path.isAbsolute(sdkPath)) throw new Error('Set PROTOFLOW_ENGINE_ENTRY or pass --engine with the absolute shared SDK entry path');
const { acceptanceClient, runAcceptanceCommand } = await import(pathToFileURL(sdkPath).href);
const client = await acceptanceClient();
const request = client.request;
const projectRoot = await realpath(request.projectRoot);
const relativeApplicationRoot = request.options.applicationRoot ?? '.';
if (typeof relativeApplicationRoot !== 'string' || path.isAbsolute(relativeApplicationRoot) || relativeApplicationRoot.split(/[\\/]/).includes('..')) throw new Error('applicationRoot must stay inside the project');
const applicationRoot = await realpath(path.resolve(projectRoot, relativeApplicationRoot));
if (path.relative(projectRoot, applicationRoot).split(path.sep).includes('..')) throw new Error('applicationRoot escaped the project');
const shutdownTimeoutMs = request.options.shutdownTimeoutMs ?? 15000;
if (!Number.isInteger(shutdownTimeoutMs) || shutdownTimeoutMs < 1000 || shutdownTimeoutMs > 30000) throw new Error('Project shutdownTimeoutMs must be 1000..30000');
const require = createRequire(import.meta.url);
const binary = require('electron');
let application, nativeProcess, pid, surface, failure, functional, capture, regions, sceneHash, stateReady = false;
const alive = processId => {
  for (const target of [processId, -processId]) {
    try { process.kill(target, 0); return true; } catch (error) { if (error.code !== 'ESRCH') return true; }
  }
  return false;
};
async function groupSnapshot(processId) {
  try {
    const { stdout } = await promisify(execFile)('ps', ['-axo', 'pid=,ppid=,pgid=,state=,comm='], { maxBuffer: 4 * 1024 * 1024 });
    return stdout.split('\n').filter(line => Number(line.trim().split(/\s+/)[2]) === processId).map(line => line.trim());
  } catch (error) { return [error.message]; }
}
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}
async function ready(page, timeoutMs) {
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}' });
  await page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.images].every(image => image.complete), undefined, { timeout: timeoutMs });
  await page.evaluate(async timeout => {
    if ([...document.images].some(image => image.currentSrc && image.naturalWidth === 0)) throw new Error('Application image failed');
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Application visual readiness timed out')), timeout);
      requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(); }));
    });
  }, timeoutMs);
}
try {
  await access(binary); // Setup downloads dependencies before any supervised launch intent.
  if (!['functional', 'visual'].includes(request.phase)) throw new Error('Unsupported project acceptance phase');
  const scene = request.scene;
  const environment = request.requestedCapture?.environment ?? { deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', colorScheme: 'light', reducedMotion: 'reduce' };
  if (environment.deviceScaleFactor !== 1 || !['light', 'dark'].includes(environment.colorScheme)) throw new Error('This project adapter supports DPR=1 and explicit light/dark colour scheme only');
  const port = await freePort();
  const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => key !== 'ELECTRON_RUN_AS_NODE' && typeof value === 'string'));
  // Keep Chromium's Unix socket/profile paths short as well as fresh.
  cleanEnv.PROTOFLOW_ELECTRON_USER_DATA = await mkdtemp(path.join(tmpdir(), 'pf-native-'));
  await client.starting('application');
  application = await _electron.launch({
    executablePath: binary,
    args: [`--remote-debugging-address=127.0.0.1`, `--remote-debugging-port=${port}`, '--force-device-scale-factor=1', path.join(applicationRoot, 'electron/main.cjs'), ...(process.platform === 'darwin' ? ['-ApplePersistenceIgnoreState', 'YES', '-NSQuitAlwaysKeepsWindows', 'NO', '-NSDisablePersistentUI', 'YES'] : [])],
    cwd: applicationRoot, env: cleanEnv, timeout: 45000,
    locale: environment.locale, timezoneId: environment.timezoneId, colorScheme: environment.colorScheme, reducedMotion: environment.reducedMotion
  });
  // Cache the actual ChildProcess before Playwright disposes its application
  // dispatcher on close. Lifecycle proof must remain available after close.
  nativeProcess = application.process();
  pid = nativeProcess.pid;
  await client.started('application', pid);
  const runtime = await application.evaluate(({ app, session }) => ({ pid: process.pid, electron: process.versions.electron, chromium: process.versions.chrome, name: app.getName(), appPath: app.getAppPath(), userData: app.getPath('userData'), sessionData: app.getPath('sessionData'), storagePath: session.defaultSession.getStoragePath() }));
  if (runtime.pid !== pid || !runtime.electron) throw new Error('Actual Electron main process identity is required');
  if(runtime.userData!==cleanEnv.PROTOFLOW_ELECTRON_USER_DATA||runtime.sessionData!==runtime.userData||runtime.storagePath!==runtime.userData)throw new Error('Electron session/profile must use this fresh test-instance directory');
  // AppKit's PersistentUI can outlive app.quit while obtaining its encryption key on macOS.
  // Argument-domain preferences affect only this fresh test instance; never write user defaults.
  if (process.platform === 'darwin') {
    runtime.testStatePersistence = await application.evaluate(({ systemPreferences }) => ({
      ignoreState: systemPreferences.getUserDefault('ApplePersistenceIgnoreState', 'boolean'),
      keepWindows: systemPreferences.getUserDefault('NSQuitAlwaysKeepsWindows', 'boolean'),
      disabled: systemPreferences.getUserDefault('NSDisablePersistentUI', 'boolean')
    }));
    if (!runtime.testStatePersistence.ignoreState || runtime.testStatePersistence.keepWindows || !runtime.testStatePersistence.disabled) throw new Error('Fresh macOS test instance must disable persistent window state');
  }
  surface = { kind: 'electron', processId: pid, runtime };
  const page = await application.firstWindow();
  await page.emulateMedia({ colorScheme: environment.colorScheme, reducedMotion: environment.reducedMotion });
  const viewport = scene?.viewport ?? request.options.viewport ?? { width: 1000, height: 760 };
  await application.evaluate(({ BrowserWindow }, size) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.setContentSize(size.width, size.height); window.webContents.setZoomFactor(1);
  }, viewport);
  const marker = randomUUID();
  await page.context().addInitScript(value => { window.__PROTOFLOW_ELECTRON_SURFACE__ = value; }, marker);
  if (scene?.fixture?.cookies?.length) await page.context().addCookies(scene.fixture.cookies);
  await page.context().addInitScript(fixture => {
    window.__PROTOFLOW_FIXTURE__ = fixture;
    for (const [key, value] of Object.entries(fixture.localStorage ?? {})) localStorage.setItem(key, String(value));
  }, scene?.fixture ?? {});
  const url = request.phase === 'visual' ? new URL(request.applicationUrl, pathToFileURL(`${request.projectRoot}${path.sep}`)).href : pathToFileURL(path.join(request.projectRoot, request.options.functionalUrl ?? '.protoflow/renderer/index.html')).href;
  if (url.startsWith(pathToFileURL(path.join(request.projectRoot, 'prototype')).href) || url.includes('/.protoflow/versions/')) throw new Error('Application must load its own built React renderer');
  await page.goto(url, { waitUntil: 'networkidle' });
  const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scale: devicePixelRatio, agent: navigator.userAgent, locale: navigator.language, timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone, colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'no-preference' }));
  if (dimensions.width !== viewport.width || dimensions.height !== viewport.height || dimensions.scale !== 1 || !dimensions.agent.includes('Electron/')) throw new Error('Actual Electron viewport/scale mismatch');
  for (const key of ['locale', 'timezoneId', 'colorScheme', 'reducedMotion']) if (dimensions[key] !== environment[key]) throw new Error(`Actual Electron environment mismatch: ${key}`);
  surface.environment = dimensions;
  if (request.phase === 'functional') {
    const command = request.options.functional;
    if (!Array.isArray(command?.argv)) throw new Error('Configure project functional argv');
    functional = await runAcceptanceCommand(client, 'functional-tests', command, { env: {
      ...cleanEnv, PROTOFLOW_ELECTRON_CDP: `http://127.0.0.1:${port}`,
      PROTOFLOW_ELECTRON_SURFACE: marker, PROTOFLOW_APPLICATION_URL: url,
      PROTOFLOW_MANIFEST_ID: request.manifestId ?? '', PROTOFLOW_SOURCE_SHA: request.source?.sha ?? ''
    } });
    if (functional.status !== 'PASS') throw new Error(functional.error ?? `Electron functional tests failed (exit ${functional.exitCode}): ${functional.stdout.slice(-1000)}`);
  } else {
    page.setDefaultTimeout(scene.timeoutMs ?? 10000);
    for (const step of scene.steps ?? []) {
      if (!step.application) throw new Error('Application interaction selector is required');
      if (step.action === 'click') await page.locator(step.application).click();
      else if (step.action === 'fill') await page.locator(step.application).fill(String(step.value ?? ''));
      else throw new Error('Unsupported project interaction');
    }
    await ready(page, scene.timeoutMs ?? 10000);
    const masks = [];
    for (const selector of request.requestedCapture.masks) {
      const locator = page.locator(selector);
      if (!await locator.count()) throw new Error(`Application mask not found: ${selector}`);
      masks.push(locator);
    }
    const selected = scene.mappings ?? request.mappings.map(mapping => mapping.id);
    regions = [];
    for (const id of selected) {
      const mapping = request.mappings.find(item => item.id === id);
      const locator = page.locator(mapping.application);
      if (await locator.count() !== 1) throw new Error(`Application mapping is not unique: ${id}`);
      regions.push({ id, box: await locator.boundingBox() });
    }
    await page.screenshot({ path: request.capturePath, animations: 'disabled', scale: 'css', mask: masks });
    capture = { path: request.capturePath, parameters: request.requestedCapture };
    sceneHash = request.sceneHash; stateReady = true;
  }
} catch (error) { failure = error; }
finally {
  if (application && pid) {
    // This is a fresh supervised test instance. Its whole owned group is
    // explicitly terminated after evidence; inspector RPC is not proof of exit.
    const startedAt = Date.now();
    let waitingForDebugger = false; const diagnostics=[];
    nativeProcess.stderr.on('data', chunk => {
      if (String(chunk).includes('Waiting for the debugger to disconnect')) waitingForDebugger = true;
      for(const line of String(chunk).split('\n'))if(/ERROR|FATAL/.test(line)&&diagnostics.length<20)diagnostics.push(line);
    });
    const stages = { connections: 'STARTING', close: 'NOT_RUN', mainExit: null, mainClose: null };
    nativeProcess.once('exit',(code,signal)=>{stages.mainExit={code,signal};});
    nativeProcess.once('close',(code,signal)=>{stages.mainClose={code,signal};});
    const graceful = (async () => {
      await application.evaluate(({ session }) => session.defaultSession.closeAllConnections());
      stages.connections='PASS';stages.close='STARTING';
      await application.close();
      stages.close='PASS';
    })();
    graceful.catch(error => { stages.error=error.message; });
    const exitDeadline = startedAt + shutdownTimeoutMs;
    while (alive(pid) && Date.now() < exitDeadline) await delay(10);
    if(surface)surface.shutdown = { method: 'close session connections then ElectronApplication.close', timeoutMs: shutdownTimeoutMs, elapsedMs: Date.now() - startedAt, waitingForDebugger, remaining: await groupSnapshot(pid), diagnostics, stages };
    if (alive(pid)) {
      failure ??= new Error('Electron exit timeout left a surviving process group');
      try { process.kill(-pid, 'SIGKILL'); } catch { /* supervisor independently checks group */ }
      const deadline = Date.now() + 2000;
      while (alive(pid) && Date.now() < deadline) await delay(10);
    }
    if (!alive(pid)) {
      if(nativeProcess.exitCode!==0||nativeProcess.signalCode!==null)failure??=new Error(`Electron main exited abnormally (code ${nativeProcess.exitCode}, signal ${nativeProcess.signalCode})`);
      await client.finished('application', failure ? 'FAIL' : 'PASS');
    }
    else throw new Error('Electron process group remains active');
    application.close().catch(() => {});
  }
}
await client.result({ schemaVersion: 1, requestId: request.requestId, phase: request.phase,
  status: failure ? 'FAIL' : 'PASS', reason: failure?.message, applicationSurface: surface,
  ...(request.phase === 'functional' ? { functional } : { sceneId: request.scene?.id, sceneHash, stateReady, capture, regions })
});
client.close();
process.exit(0); // Result and all process completions were acknowledged first.
