import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '.', testMatch: 'adapter-smoke.spec.mjs', workers: 1, fullyParallel: false, timeout: 30000, reporter: 'list' });
