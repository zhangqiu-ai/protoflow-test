import { test, expect, _electron } from '@playwright/test';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeElectronNormally, observeElectronProcess, processGroupAlive } from './electron-lifecycle.mjs';

const require = createRequire(import.meta.url);
const target = fileURLToPath(new URL('..', import.meta.url));

for (let round = 1; round <= 3; round++) {
  test(`real Electron application closes normally within 15 seconds (${round}/3)`, async ({}, info) => {
    test.setTimeout(50000);
    const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'pf-owned-electron-close-'));
    let app, observation;
    try {
      app = await _electron.launch({
        executablePath: require('electron'),
        args: ['--force-device-scale-factor=1', ...(round === 1 ? ['--disable-features=Translate'] : []), path.join(target, 'electron/main.cjs'), ...(process.platform === 'darwin' ? ['-ApplePersistenceIgnoreState', 'YES', '-NSQuitAlwaysKeepsWindows', 'NO', '-NSDisablePersistentUI', 'YES'] : [])],
        env: { ...process.env, PF_ACCEPTANCE_USER_DATA: userData }, timeout: 15000
      });
      observation = observeElectronProcess(app);
      const disabledFeatures = await app.evaluate(({ app }) => app.commandLine.getSwitchValue('disable-features').split(',').filter(Boolean));
      await info.attach('disabled-features', { body: JSON.stringify(disabledFeatures, null, 2), contentType: 'application/json' });
      expect(disabledFeatures).toContain('DeclarativePerformanceObserver');
      if (round === 1) expect(disabledFeatures).toContain('Translate');
      const sessionFacts = await app.evaluate(({ BrowserWindow }) => {
        const active = BrowserWindow.getAllWindows()[0].webContents.session;
        return { persistent: active.isPersistent(), storagePath: active.storagePath };
      });
      expect(sessionFacts).toEqual({ persistent: false, storagePath: null });
      const page = await app.firstWindow({ timeout: 5000 });
      await expect(page.getByRole('heading', { name: 'Sign in to ProtoFlow', exact: true })).toBeVisible({ timeout: 5000 });
    } finally {
      try {
        if (app && observation) {
          const result = await closeElectronNormally(app, observation, value => info.attach('shutdown', { body: JSON.stringify(value, null, 2), contentType: 'application/json' }));
          expect(result).toMatchObject({ status: 'PASS', timeoutMs: 15000, exit: { code: 0, signal: null }, timedOut: false, forcedTermination: false, processGroupActive: false });
          expect(result.elapsedMs).toBeLessThanOrEqual(15000);
        }
      } finally {
        // Preserve the profile if an owned process remains active; never touch another application's userData.
        if (!observation || !processGroupAlive(observation.pid)) await fs.rm(userData, { recursive: true, force: true });
      }
    }
  });
}
