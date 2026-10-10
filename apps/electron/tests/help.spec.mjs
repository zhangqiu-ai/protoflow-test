import { test, expect, _electron } from '@playwright/test';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { closeElectronNormally, observeElectronProcess } from './electron-lifecycle.mjs';

const require = createRequire(import.meta.url);
const target = fileURLToPath(new URL('..', import.meta.url));

test('Help keeps ordered content through reload, return to chat and history navigation', async ({}, info) => {
  const userData = info.outputPath('user-data');
  await fs.mkdir(userData, { recursive: true });
  const app = await _electron.launch({
    executablePath: require('electron'),
    args: ['--force-device-scale-factor=1', path.join(target, 'electron/main.cjs'), ...(process.platform === 'darwin' ? ['-ApplePersistenceIgnoreState', 'YES', '-NSQuitAlwaysKeepsWindows', 'NO', '-NSDisablePersistentUI', 'YES'] : [])],
    env: { ...process.env, PF_ACCEPTANCE_USER_DATA: userData }, timeout: 15000,
  });
  const observation = observeElectronProcess(app);
  try {
    const page = await app.firstWindow();
    const errors = [], network = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
    await page.goto(`${pathToFileURL(path.join(target, 'dist/index.html')).href}#/help`);
    const checkHelp = async () => {
      await expect(page).toHaveTitle('ProtoFlow — Help');
      await expect(page.getByRole('heading', { name: 'How this demo works', exact: true })).toBeVisible();
      await expect(page.getByTestId('help.tip')).toHaveText([
        'Prototype firstEach design commit becomes one frozen version.',
        'One version at a timeThe application follows prototype versions in order.',
        'Checked by anchorsStructure, colours, layout and pixels are compared for every screen.',
      ]);
      await expect(page.getByTestId('help.footer')).toHaveText('Prototype-driven development');
      await expect(page.getByRole('link', { name: '← Back to conversation', exact: true })).toHaveAttribute('href', '#/chat');
    };
    await checkHelp();
    await page.reload();
    await checkHelp();
    await page.getByRole('link', { name: '← Back to conversation', exact: true }).click();
    await expect(page.getByTestId('chat')).toBeVisible();
    await page.getByLabel('Your message').fill('Back from Help');
    await page.getByRole('button', { name: 'Send →', exact: true }).click();
    await expect(page.getByRole('log')).toContainText('Thanks for your message. This is a fixed local demo reply.');
    await page.goBack();
    await checkHelp();
    await page.goForward();
    await expect(page.getByTestId('chat')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Ready');
    await page.getByRole('link', { name: '← Back to sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in to ProtoFlow', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    expect(network).toEqual([]);
    expect(await app.context().cookies()).toEqual([]);
    expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  } finally {
    await closeElectronNormally(app, observation, result => info.attach('shutdown', { body: JSON.stringify(result, null, 2), contentType: 'application/json' }));
  }
});
