import { test, expect } from './electron-fixture.mjs';

const welcome = 'Welcome! What would you like to explore?';
const reply = 'A fresh idea! This is the fixed demonstration reply.';
const message = page => page.getByRole('textbox', { name: 'Your message', exact: true });
const log = page => page.getByRole('log', { name: 'Conversation', exact: true });
const send = page => page.getByRole('button', { name: 'Send →', exact: true });

test.beforeEach(async ({ page }) => {
  await page.getByRole('link', { name: 'Open a fresh conversation →', exact: true }).click();
  await expect(page).toHaveURL(/#conversation$/);
  await expect(page.getByRole('heading', { name: 'A fresh conversation', exact: true })).toBeVisible();
});

test('hash links open the conversation and return to workspace entry', async ({ page }) => {
  await expect(log(page).getByRole('article')).toHaveCount(1);
  await expect(log(page).getByText(welcome, { exact: true })).toBeVisible();
  await expect(message(page)).toBeEmpty();
  await expect(page.getByRole('status')).toHaveText('Waiting for your first idea');
  await expect(page).toHaveTitle('Fresh ProtoFlow — Conversation');
  await page.getByRole('link', { name: '← Workspace entry', exact: true }).click();
  await expect(page).toHaveURL(/#login$/);
  await expect(page.getByRole('heading', { name: "Let's get started", exact: true })).toBeVisible();
  await expect(page).toHaveTitle('Fresh ProtoFlow — Workspace access');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'A fresh conversation', exact: true })).toBeVisible();
  await expect(log(page).getByRole('article')).toHaveCount(1);
});

test('empty and whitespace submissions retain the welcome and focus the input', async ({ page }) => {
  for (const value of ['', '  \n  ']) {
    await message(page).fill(value);
    await send(page).click();
    await expect(page.getByRole('alert')).toHaveText('Write a message to continue.');
    await expect(page.getByRole('status')).toHaveText('Write a message to continue.');
    await expect(log(page).getByRole('article')).toHaveCount(1);
    await expect(message(page)).toBeFocused();
  }
});

test('a valid message recovers from validation, trims text and adds one fixed reply', async ({ page }) => {
  await send(page).click();
  await message(page).fill('  A clean idea  ');
  await send(page).click();
  await expect(log(page).getByRole('article')).toHaveCount(3);
  expect(await log(page).getByText('A clean idea', { exact: true }).textContent()).toBe('A clean idea');
  await expect(log(page).getByText(reply, { exact: true })).toHaveCount(1);
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Your idea has a reply');
  await expect(message(page)).toBeEmpty();
  await expect(message(page)).toBeFocused();
});

test('consecutive synchronous submits cannot reuse a cleared draft', async ({ page }) => {
  await message(page).fill('One idea');
  await send(page).evaluate(button => {
    button.form.requestSubmit();
    button.form.requestSubmit();
  });
  await expect(log(page).getByRole('article')).toHaveCount(3);
  await expect(log(page).getByText('One idea', { exact: true })).toHaveCount(1);
  await expect(log(page).getByText(reply, { exact: true })).toHaveCount(1);
  await expect(message(page)).toBeEmpty();
});

test('markup is displayed literally without creating elements or executing handlers', async ({ page }) => {
  const value = '<img src=x onerror="window.compromised=true">';
  await message(page).fill(value);
  await send(page).click();
  await expect(log(page).getByText(value, { exact: true })).toBeVisible();
  await expect(log(page).getByRole('img')).toHaveCount(0);
  expect(await page.evaluate(() => window.compromised)).toBeUndefined();
});

test('the composer limits typing to 280 characters', async ({ page }) => {
  const value = 'x'.repeat(280);
  await message(page).fill(value);
  await message(page).press('End');
  await message(page).press('y');
  await expect(message(page)).toHaveValue(value);
  await send(page).click();
  await expect(log(page).getByText(value, { exact: true })).toBeVisible();
});

test('keyboard entry preserves a multiline draft and sends through the button', async ({ page }) => {
  await message(page).fill('First line');
  await message(page).press('End');
  await message(page).press('Enter');
  await message(page).pressSequentially('Second line');
  await expect(log(page).getByRole('article')).toHaveCount(1);
  await message(page).press('Tab');
  await expect(send(page)).toBeFocused();
  await send(page).press('Enter');
  expect(await log(page).getByText('First line Second line', { exact: true }).textContent()).toBe('First line\nSecond line');
  await expect(log(page).getByText(reply, { exact: true })).toHaveCount(1);
});

test('fresh conversation clears history, unsent draft and validation state', async ({ page }) => {
  await message(page).fill('Discard me');
  await send(page).click();
  await send(page).click();
  await message(page).fill('Unsent idea');
  await page.getByRole('button', { name: '＋ Fresh conversation', exact: true }).click();
  await expect(log(page).getByRole('article')).toHaveCount(1);
  await expect(log(page).getByText(welcome, { exact: true })).toBeVisible();
  await expect(message(page)).toBeEmpty();
  await expect(message(page)).toBeFocused();
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('A fresh conversation is ready');
});

test('reload discards conversation state without external requests or storage', async ({ page }) => {
  const requests = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  const storage = () => page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  const before = await storage();
  await message(page).fill('Local only');
  await send(page).click();
  await expect(log(page).getByRole('article')).toHaveCount(3);
  await message(page).fill('Unsent draft');
  expect(await storage()).toEqual(before);
  await page.reload();
  await expect(page).toHaveURL(/#conversation$/);
  await expect(log(page).getByRole('article')).toHaveCount(1);
  await expect(message(page)).toBeEmpty();
  await expect(page.getByRole('status')).toHaveText('Waiting for your first idea');
  expect(await storage()).toEqual(before);
  expect(requests).toEqual([]);
});

test('new messages remain visible when the conversation scrolls', async ({ page }) => {
  for (let index = 0; index < 8; index++) {
    await message(page).fill(`Idea ${index}: ${'A long idea. '.repeat(15)}`);
    await send(page).click();
  }
  await expect(log(page).getByRole('article')).toHaveCount(17);
  await expect(log(page).getByText(reply, { exact: true }).last()).toBeInViewport();
  const position = await log(page).evaluate(element => ({ top: element.scrollTop, height: element.scrollHeight, visible: element.clientHeight }));
  expect(position.height).toBeGreaterThan(position.visible);
  expect(position.height - position.visible - position.top).toBeLessThanOrEqual(1);
});
