import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const target = fileURLToPath(new URL('../', import.meta.url));
const frozen = path.join(target, 'tests/fixtures/prototype');
const route = screen => `${pathToFileURL(path.join(target, 'dist/index.html'))}#/${screen}`;

test.beforeAll(async () => {
  const binding = JSON.parse(await fs.readFile(path.join(target, 'tests/fixtures/prototype.binding.json'), 'utf8'));
  expect(binding.schemaVersion).toBe(1);
  expect(binding.source).toEqual({
    repository: 'https://github.com/zhangqiu-ai/protoflow-test.git',
    branch: 'protoflow-anchors-20261008',
    commit: '76b9a0af9924b7c9f471bda56486030cfa146fe1',
    path: 'prototype'
  });
  expect(binding.prototypeHash).toBe('da4d748d4f77cd3e93f28aceb4dedf0132095e747f6db048708ba80fffd50e7b');
  const files = ['chat.css', 'chat.html', 'chat.pf.json', 'help.css', 'help.html', 'index.html', 'styles.css'];
  expect(Object.keys(binding.files).sort()).toEqual(files);
  expect((await fs.readdir(frozen)).sort()).toEqual(files);
  const hashes = [];
  for (const file of files) {
    const bytes = await fs.readFile(path.join(frozen, file));
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    expect({ sha256, bytes: bytes.length }, file).toEqual(binding.files[file]);
    hashes.push([`prototype/${file}`, sha256]);
  }
  expect(createHash('sha256').update(JSON.stringify(hashes)).digest('hex')).toBe(binding.prototypeHash);
});

async function signIn(page) {
  await page.getByLabel('Email address', { exact: true }).fill('demo@protoflow.test');
  await page.getByLabel('Password', { exact: true }).fill('FlowDemo!42');
  await page.getByLabel('Password', { exact: true }).press('Enter');
}

// These are application-owned tests; acceptance/ remains independently maintained.
test('login validation, hidden password clearing, repeat login and navigation', async ({ page, context }) => {
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(route('login'));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Enter your email address.', { exact: true })).toBeVisible();
  await expect(page.getByText('Enter your password.', { exact: true })).toBeVisible();
  await page.getByLabel('Email address', { exact: true }).fill('invalid');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  await expect(page.getByText('Use at least 8 characters.', { exact: true })).toBeVisible();
  await signIn(page);
  await expect(page.getByRole('heading', { name: "You're signed in" })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByLabel('Email address', { exact: true })).toBeFocused();
  await signIn(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in to ProtoFlow' })).toBeVisible();
  await page.getByRole('link', { name: 'Open the demo conversation →' }).click();
  await expect(page.getByTestId('chat')).toBeVisible();
  await page.getByTestId('chat.back').click();
  await expect(page.getByTestId('login')).toBeVisible();
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});

test('chat validation, plain text, duplicate submit, scrolling and reset', async ({ page }) => {
  await page.goto(route('chat'));
  const input = page.getByRole('textbox', { name: 'Your message' });
  const send = page.getByRole('button', { name: 'Send →' });
  const log = page.getByRole('log', { name: 'Conversation' });
  await input.fill('   ');
  await send.click();
  await expect(page.getByRole('alert')).toHaveText('Type a message first.');
  const text = '<img src=x onerror="window.injected=true">';
  await input.fill(`  ${text}  `);
  await page.getByTestId('chat.form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  await expect(log.locator('article')).toHaveCount(3);
  await expect(log.getByText(text, { exact: true })).toBeVisible();
  await expect(log.locator('img')).toHaveCount(0);
  await expect(input).toHaveValue('');
  for (let i = 0; i < 15; i++) { await input.fill(`Message ${i}`); await send.click(); }
  await expect(log.locator('article')).toHaveCount(33);
  await expect(log.locator('article').last()).toContainText('Thanks for your message. This is a fixed local demo reply.');
  expect(await log.evaluate(el => el.scrollTop > 0 && el.scrollHeight > el.clientHeight)).toBe(true);
  await expect(send).toBeInViewport();
  await page.getByRole('button', { name: '＋ Start new' }).click();
  await expect(log.locator('article')).toHaveCount(1);
  await expect(page.getByTestId('chat.status')).toHaveText('Conversation cleared.');
  await expect(page.getByRole('alert')).toBeHidden();
  await input.fill('New conversation'); await send.click(); await page.reload();
  await expect(log.locator('article')).toHaveCount(1);
  await expect(page.getByTestId('chat.status')).toHaveText('Ready');
});

test('help content, reload and return to conversation', async ({ page }) => {
  await page.goto(route('help'));
  await expect(page).toHaveTitle('ProtoFlow — Help');
  await expect(page.getByRole('heading', { name: 'How this demo works' })).toBeVisible();
  const tips = page.getByRole('list').getByRole('listitem');
  await expect(tips).toHaveText([
    'Prototype firstEach design commit becomes one frozen version.',
    'One version at a timeThe application follows prototype versions in order.',
    'Checked by anchorsStructure, colours, layout and pixels are compared for every screen.'
  ]);
  await expect(page.getByTestId('help.footer')).toHaveText('Prototype-driven development');
  await page.reload();
  await expect(page.getByTestId('help')).toBeVisible();
  await page.getByRole('link', { name: '← Back to conversation' }).click();
  await expect(page.getByTestId('chat')).toBeVisible();
  await expect(page.getByTestId('help')).toHaveCount(0);
});

for (const screen of ['login', 'chat', 'help']) {
  test(`${screen} preserves every frozen anchor and the frozen root geometry`, async ({ page }) => {
    const file = path.join(frozen, screen === 'login' ? 'index.html' : `${screen}.html`);
    const source = await fs.readFile(file, 'utf8');
    // The reference is the frozen prototype's own root anchor, rendered at the same 1440×1000 viewport.
    expect(page.viewportSize()).toEqual({ width: 1440, height: 1000 });
    await page.goto(pathToFileURL(file).href);
    const expected = await page.locator(`[data-pf="${screen}"]`).boundingBox();
    await page.goto(route(screen));
    const counts = new Map();
    for (const [, anchor] of source.matchAll(/data-pf="([^"]+)"/g)) counts.set(anchor, (counts.get(anchor) || 0) + 1);
    for (const [anchor, count] of counts) await expect(page.getByTestId(anchor)).toHaveCount(count);
    expect(await page.getByTestId(screen).boundingBox()).toEqual(expected);
    if (screen !== 'help') await expect(page.getByTestId('help')).toHaveCount(0);
  });
}
