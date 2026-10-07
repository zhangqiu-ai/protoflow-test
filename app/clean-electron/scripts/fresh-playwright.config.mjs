import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'fresh-acceptance.spec.mjs',workers:1,fullyParallel:false,retries:0,timeout:30000,reporter:'list',outputDir:'test-results/fresh-acceptance'});
