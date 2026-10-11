import {defineConfig} from '@playwright/test';
// The Electron target's own regression suite (desktop/tests) drives the real desktop application.
export default defineConfig({testDir:'../desktop/tests',testMatch:['*.spec.js'],workers:1,retries:0,timeout:60000,reporter:'list',use:{trace:'retain-on-failure',screenshot:'only-on-failure'}});
