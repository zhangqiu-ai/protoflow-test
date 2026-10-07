import {test, expect} from '@playwright/test';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Regression contract: frozen git-6f5cb386f8070ea309dbeaafccde1aaa07b5cd0f.
const applicationUrl = pathToFileURL(path.resolve('.protoflow/site/chat.html')).href;
const welcome = 'Hi! Write a message to try this local conversation.';
const reply = 'Thanks for your message. This is a fixed local demo reply.';
const input = page => page.getByLabel('Your message', {exact: true});
const sendButton = page => page.getByRole('button', {name: 'Send →', exact: true});
const restart = page => page.getByRole('button', {name: '＋ Start new', exact: true});
const messages = page => page.getByRole('log', {name: 'Conversation'}).getByRole('paragraph');

async function send(page, text) {
  await input(page).fill(text);
  await sendButton(page).click();
}

test.beforeEach(async ({page}) => {
  await page.goto(applicationUrl);
});

test('initial conversation exposes its welcome, local demo description and composer', async ({page}) => {
  await expect(page).toHaveTitle('ProtoFlow — Demo conversation');
  await expect(page.getByRole('heading', {name: 'Local demo conversation', exact: true})).toBeVisible();
  await expect(page.getByRole('log', {name: 'Conversation'})).toBeVisible();
  await expect(messages(page)).toHaveText([welcome]);
  await expect(page.getByText('Fictional demo messages only', {exact: true})).toBeVisible();
  await expect(input(page)).toBeVisible();
  await expect(input(page)).toHaveValue('');
  await expect(sendButton(page)).toBeVisible();
  await expect(restart(page)).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.getByRole('alert')).toBeHidden();
});

test('canned replies badge uses amber colors and retains its responsive visibility', async ({page}) => {
  // Badge palette from frozen git-9884a5b6ba6605d4fec9a2a5152e060a622eaa3d.
  const badge = page.getByText('Canned replies', {exact: true});
  await page.setViewportSize({width: 1000, height: 760});
  await expect(badge).toBeVisible();
  await expect(badge).toHaveCSS('color', 'rgb(154, 106, 28)');
  await expect(badge).toHaveCSS('background-color', 'rgb(253, 243, 225)');
  await page.setViewportSize({width: 920, height: 760});
  await expect(badge).toBeHidden();
  await page.setViewportSize({width: 921, height: 760});
  await expect(badge).toBeVisible();
});

test('blank messages are rejected and a valid message clears the error', async ({page}) => {
  for (const text of ['', ' \n\t ']) {
    await send(page, text);
    await expect(messages(page)).toHaveText([welcome]);
    await expect(page.getByRole('alert')).toHaveText('Type a message first.');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Type a message first.');
    await expect(input(page)).toBeFocused();
  }
  await send(page, '  Hello, ProtoFlow!  ');
  await expect(messages(page)).toHaveText([welcome, 'Hello, ProtoFlow!', reply]);
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Reply added.');
  await expect(input(page)).toHaveValue('');
  await expect(input(page)).toBeFocused();
});

for (const viewport of [{width: 1000, height: 760}, {width: 390, height: 844}]) {
  test(`user bubbles are teal and assistant messages stay unfilled at ${viewport.width}px`, async ({page}) => {
    await page.setViewportSize(viewport);
    await send(page, 'Hello, ProtoFlow!');
    const conversation = page.getByRole('log', {name: 'Conversation'});
    const userMessage = conversation.getByText('Hello, ProtoFlow!', {exact: true});
    await expect(userMessage).toBeVisible();
    await expect(userMessage).toHaveCSS('background-color', 'rgb(230, 242, 238)');
    await expect(conversation.getByText(welcome, {exact: true})).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(conversation.getByText(reply, {exact: true})).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  });
}

test('keyboard composition preserves line breaks and submits from the send button', async ({page}) => {
  await input(page).fill('First line');
  await input(page).press('End');
  await input(page).press('Enter');
  await input(page).pressSequentially('Second line');
  await expect(input(page)).toHaveValue('First line\nSecond line');
  await expect(messages(page)).toHaveText([welcome]);
  await input(page).press('Tab');
  await expect(sendButton(page)).toBeFocused();
  await sendButton(page).press('Enter');
  expect(await messages(page).allTextContents()).toEqual([welcome, 'First line\nSecond line', reply]);
  await expect(input(page)).toBeFocused();
  await expect(input(page)).toHaveValue('');
});

test('message markup stays literal and cannot insert active content', async ({page}) => {
  const text = '<img src=x onerror="window.demoInjected=true"><script>window.demoInjected=true</script>';
  await send(page, text);
  await expect(messages(page)).toHaveText([welcome, text, reply]);
  await expect(page.getByRole('log', {name: 'Conversation'}).locator('img, script')).toHaveCount(0);
  expect(await page.evaluate(() => window.demoInjected)).toBeUndefined();
});

test('typing enforces the 280 character limit and accepts the boundary message', async ({page}) => {
  await input(page).focus();
  await page.keyboard.insertText('x'.repeat(281));
  await expect(input(page)).toHaveValue('x'.repeat(280));
  await sendButton(page).click();
  await expect(messages(page)).toHaveText([welcome, 'x'.repeat(280), reply]);
});

test('rapid repeated submissions preserve one pair per nonempty message in order', async ({page}) => {
  await input(page).fill('First');
  await sendButton(page).evaluate(button => {
    button.form.requestSubmit();
    button.form.requestSubmit();
  });
  await expect(messages(page)).toHaveText([welcome, 'First', reply]);
  await expect(page.getByRole('alert')).toBeVisible();
  await send(page, 'Second');
  await expect(messages(page)).toHaveText([welcome, 'First', reply, 'Second', reply]);
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(input(page)).toHaveValue('');
});

test('restart clears messages, draft and validation, and reload resets the next conversation', async ({page}) => {
  await send(page, 'Before restart');
  await sendButton(page).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await input(page).fill('Discarded draft');
  await restart(page).click();
  await expect(messages(page)).toHaveText([welcome]);
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Conversation cleared.');
  await expect(input(page)).toHaveValue('');
  await expect(input(page)).toBeFocused();
  await send(page, 'After restart');
  await expect(messages(page)).toHaveText([welcome, 'After restart', reply]);
  await input(page).fill('Unsaved draft');
  await page.reload();
  await expect(messages(page)).toHaveText([welcome]);
  await expect(input(page)).toHaveValue('');
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Ready');
});

test('both navigation directions work and sign-in remains usable', async ({page}) => {
  await send(page, 'Temporary conversation');
  await page.getByRole('link', {name: '← Back to sign in', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Sign in to ProtoFlow', exact: true})).toBeVisible();
  await page.getByLabel('Email address').fill('demo@protoflow.test');
  await page.getByLabel('Password', {exact: true}).fill('FlowDemo!42');
  await page.getByRole('button', {name: 'Sign in', exact: true}).click();
  await expect(page.getByRole('heading', {name: "You're signed in", exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Log out', exact: true}).click();
  await page.getByRole('link', {name: 'Open the demo conversation →', exact: true}).click();
  await expect(page).toHaveURL(applicationUrl);
  await expect(messages(page)).toHaveText([welcome]);
  await expect(input(page)).toHaveValue('');
  await expect(page.getByRole('status')).toHaveText('Ready');
});

test('conversation lifecycle makes no HTTP requests, cookie writes or storage writes', async ({page, context}) => {
  const network = [];
  const pageErrors = [];
  const writes = [];
  context.on('request', request => {
    if (/^https?:/.test(request.url())) network.push(request.url());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.exposeFunction('recordConversationWrite', kind => writes.push(kind));
  await page.addInitScript(() => {
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        window.recordConversationWrite('storage.' + method);
        return original.apply(this, args);
      };
    }
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(Document.prototype, 'cookie', {
      ...cookie,
      set(value) {
        window.recordConversationWrite('cookie');
        return cookie.set.call(this, value);
      },
    });
  });
  await page.reload();
  await send(page, '   ');
  await send(page, 'Local only');
  await send(page, '<img src="https://example.invalid/demo" onerror="window.demoInjected=true">');
  await restart(page).click();
  await send(page, 'Another conversation');
  await page.reload();
  await expect(messages(page)).toHaveText([welcome]);
  expect(await page.evaluate(() => ({local: localStorage.length, session: sessionStorage.length}))).toEqual({local: 0, session: 0});
  expect(await context.cookies()).toEqual([]);
  expect(writes).toEqual([]);
  expect(network).toEqual([]);
  expect(pageErrors).toEqual([]);
});
