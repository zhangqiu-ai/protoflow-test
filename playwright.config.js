import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',workers:1,retries:0,reporter:'list',use:{headless:true,trace:'retain-on-failure',screenshot:'only-on-failure'}});
