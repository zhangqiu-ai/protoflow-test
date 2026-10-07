import { test as base, expect, chromium } from '@playwright/test';

// Connect to the supervised Electron renderer. This fixture never launches a browser/app.
export const test = base.extend({
  page: async ({}, use) => {
    if (!process.env.PROTOFLOW_ELECTRON_CDP || !process.env.PROTOFLOW_ELECTRON_SURFACE) throw new Error('Run through the project Electron acceptance adapter');
    const connection = await chromium.connectOverCDP(process.env.PROTOFLOW_ELECTRON_CDP);
    try {
      const pages = connection.contexts().flatMap(context => context.pages());
      const owned = [];
      for (const page of pages) if (await page.evaluate(() => window.__PROTOFLOW_ELECTRON_SURFACE__) === process.env.PROTOFLOW_ELECTRON_SURFACE) owned.push(page);
      if (owned.length !== 1) throw new Error('Expected the one supervised Electron application window');
      const page = owned[0];
      expect(await page.evaluate(() => navigator.userAgent)).toContain('Electron/');
      await page.goto(process.env.PROTOFLOW_APPLICATION_URL, { waitUntil: 'networkidle' });
      await use(page);
    } finally { await connection.close(); }
  }
});
export { expect };
