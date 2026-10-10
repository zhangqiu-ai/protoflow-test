import { test, expect, _electron } from '@playwright/test';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { closeElectronNormally, observeElectronProcess } from './electron-lifecycle.mjs';
import { frozenPrototype as frozen, verifyFrozenReference } from './frozen-reference.mjs';

const require = createRequire(import.meta.url);
const target = fileURLToPath(new URL('..', import.meta.url));
const scenarios = [
  ['login', 'initial'], ['chat', 'initial'], ['chat', 'empty-error'],
  ['chat', 'reply'], ['chat', 'restart'], ['help', 'initial'],
];

async function applyState(page, state) {
  if (state === 'empty-error') await page.getByRole('button', { name: 'Send →', exact: true }).click();
  if (state === 'reply' || state === 'restart') {
    await page.getByLabel('Your message').fill('Hello, ProtoFlow!');
    await page.getByRole('button', { name: 'Send →', exact: true }).click();
    if (state === 'restart') await page.getByRole('button', { name: '＋ Start new', exact: true }).click();
  }
}

async function facts(page, attribute) {
  return page.locator(`[${attribute}]`).evaluateAll((elements, attr) => elements.map(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      id: element.getAttribute(attr), tag: element.tagName,
      box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      visible: Boolean(rect.width && rect.height),
      tokens: Object.fromEntries(['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'borderRadius'].map(key => [key, style[key]])),
    };
  }), attribute);
}

test('six frozen B states retain anchors, geometry, tokens and pixels in native Electron', async ({}, info) => {
  const reference = await verifyFrozenReference();
  expect(reference.sourceSha).toBe('76b9a0af9924b7c9f471bda56486030cfa146fe1');
  const userData = info.outputPath('user-data');
  await fs.mkdir(userData, { recursive: true });
  const app = await _electron.launch({
    executablePath: require('electron'),
    args: ['--force-device-scale-factor=1', path.join(target, 'electron/main.cjs'), '-ApplePersistenceIgnoreState', 'YES', '-NSQuitAlwaysKeepsWindows', 'NO', '-NSDisablePersistentUI', 'YES'],
    env: { ...process.env, PF_ACCEPTANCE_USER_DATA: userData },
  });
  const observation = observeElectronProcess(app);
  try {
    const page = await app.firstWindow();
    const runtime = await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      const preferences = window.webContents.getLastWebPreferences();
      window.setContentSize(1440, 1000);
      return { versions: process.versions, pid: process.pid, contentSize: window.getContentSize(), contextIsolation: preferences.contextIsolation, nodeIntegration: preferences.nodeIntegration };
    });
    await info.attach('runtime', { body: JSON.stringify(runtime, null, 2), contentType: 'application/json' });
    expect(runtime.contextIsolation).toBe(true);
    expect(runtime.nodeIntegration).toBe(false);
    expect(runtime.contentSize).toEqual([1440, 1000]);
    const viewport = () => page.evaluate(() => ({ width: innerWidth, height: innerHeight, scale: devicePixelRatio }));
    await expect.poll(viewport).toEqual({ width: 1440, height: 1000, scale: 1 });
    await info.attach('viewport', { body: JSON.stringify(await viewport(), null, 2), contentType: 'application/json' });
    for (const [screen, state] of scenarios) {
      const scene = `${screen}.${state}`;
      await page.goto(pathToFileURL(path.join(frozen, screen === 'login' ? 'index.html' : `${screen}.html`)).href);
      await applyState(page, state);
      const prototypeFacts = await facts(page, 'data-pf');
      const prototype = await page.screenshot({ path: info.outputPath(`${scene}.prototype.png`) });
      await page.goto(`${pathToFileURL(path.join(target, 'dist/index.html')).href}#/${screen}`);
      await page.getByTestId(screen).waitFor();
      await applyState(page, state);
      const applicationFacts = await facts(page, 'data-testid');
      const application = await page.screenshot({ path: info.outputPath(`${scene}.application.png`) });
      await info.attach(`${scene}.facts`, { body: JSON.stringify({ prototypeFacts, applicationFacts }, null, 2), contentType: 'application/json' });
      expect.soft(applicationFacts, scene).toEqual(prototypeFacts);
      if (screen === 'chat') expect.soft(applicationFacts[0].box, scene).toEqual({ x: 0, y: 38, width: 1440, height: 654 });
      const before = PNG.sync.read(prototype);
      const after = PNG.sync.read(application);
      expect({ width: before.width, height: before.height }, `${scene} prototype PNG`).toEqual({ width: 1440, height: 1000 });
      expect({ width: after.width, height: after.height }, `${scene} application PNG`).toEqual({ width: 1440, height: 1000 });
      const diff = new PNG({ width: before.width, height: before.height });
      const changed = pixelmatch(before.data, after.data, diff.data, before.width, before.height, { threshold: 0.1 });
      await fs.writeFile(info.outputPath(`${scene}.diff.png`), PNG.sync.write(diff));
      const ratio = changed / (before.width * before.height);
      console.log(`${scene}: pixel difference ${ratio}`);
      expect.soft(ratio, scene).toBeLessThanOrEqual(0.001);
    }
  } finally {
    await closeElectronNormally(app, observation, result => info.attach('shutdown', { body: JSON.stringify(result, null, 2), contentType: 'application/json' }));
  }
});
