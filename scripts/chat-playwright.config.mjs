import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'..',testMatch:['**/tests/*.spec.js','**/scripts/login-verification.spec.js','**/scripts/chat-verification.spec.js'],workers:1,retries:0,reporter:'list',use:{headless:true,viewport:{width:1000,height:760},trace:'retain-on-failure',screenshot:'only-on-failure'}});
