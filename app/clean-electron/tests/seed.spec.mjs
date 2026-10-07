import { test, expect } from '../scripts/electron-fixture.mjs';

test('login validates empty fields and accepts the fictional demonstration account', async ({ page }) => {
  await expect(page.getByRole('heading', { name: "Let's get started" })).toBeVisible();
  await page.locator('#submit').click();
  await expect(page.locator('#email-error')).toHaveText('Email is required.');
  await expect(page.locator('#password-error')).toHaveText('Password is required.');
  await page.locator('#email').fill('demo@fresh.protoflow.test');
  await page.locator('#password').fill('FreshDemo42!');
  await page.locator('#submit').click();
  await expect(page.getByRole('heading', { name: 'Demo workspace' })).toBeVisible();
  await page.locator('#logout').click();
  await expect(page.getByRole('heading', { name: "Let's get started" })).toBeVisible();
});

test('wrong demonstration details keep the workspace closed', async ({ page }) => {
  await page.locator('#email').fill('demo@fresh.protoflow.test');
  await page.locator('#password').fill('WrongDemo42!');
  await page.locator('#submit').click();
  await expect(page.locator('#login-error')).toHaveText("Those demo details don't match.");
  await expect(page.getByRole('heading', { name: 'Demo workspace' })).toHaveCount(0);
});
