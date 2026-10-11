import {test, expect, _electron as electron} from '@playwright/test';
import {mkdtemp, rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Regression suite for the Electron target: launches the real desktop application (desktop/main.cjs) with a private
// profile and drives its screens. Frozen baseline: git-76b9a0af9924b7c9f471bda56486030cfa146fe1.
const executablePath = createRequire(import.meta.url)('electron');
const main = path.resolve('desktop/main.cjs');
const screen = name => pathToFileURL(path.resolve(`desktop/renderer/${name}.html`)).href;
const welcome = 'Hi! Write a message to try this local conversation.';
const reply = 'Thanks for your message. This is a fixed local demo reply.';

let app, window, profile, pageErrors, network;

test.beforeEach(async () => {
  pageErrors = []; network = [];
  profile = await mkdtemp(path.join(tmpdir(), 'protoflow-desktop-test-'));
  const env = {...process.env, DESKTOP_USER_DATA: profile};
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({executablePath, args: [main], env});
  window = await app.firstWindow();
  window.on('pageerror', error => pageErrors.push(error.message));
  window.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  await window.waitForLoadState('load');
});

test.afterEach(async () => {
  await app?.close();
  await rm(profile, {recursive: true, force: true});
  expect(pageErrors).toEqual([]);
  expect(network).toEqual([]);
});

const open = async name => { await window.goto(screen(name)); await window.waitForLoadState('load'); };
const signIn = async (email, password) => {
  await window.getByLabel('Email address').fill(email);
  await window.getByLabel('Password').fill(password);
  await window.getByRole('button', {name: /Sign in/}).click();
};
const send = async text => { await window.getByLabel('Your message').fill(text); await window.getByTestId('chat.send').click(); };

test('the desktop window opens on the sign-in screen at the prototype viewport', async () => {
  await expect(window.getByTestId('login')).toBeVisible();
  await expect(window).toHaveTitle('ProtoFlow — Demo sign in');
  await expect(window.getByRole('heading', {name: 'Sign in to ProtoFlow', exact: true})).toBeVisible();
  await expect(window.locator('#status')).toHaveText('Ready');
  expect(await window.evaluate(() => ({width: innerWidth, height: innerHeight}))).toEqual({width: 1000, height: 760});
});

test('sign-in validates fields, rejects other credentials, signs in and out', async () => {
  await window.getByRole('button', {name: /Sign in/}).click();
  await expect(window.locator('#email-error')).toHaveText('Enter your email address.');
  await expect(window.locator('#password-error')).toHaveText('Enter your password.');
  await signIn('not-an-email', 'short');
  await expect(window.locator('#email-error')).toHaveText('Enter a valid email address.');
  await expect(window.locator('#password-error')).toHaveText('Use at least 8 characters.');
  await signIn('other@protoflow.test', 'FlowDemo!42');
  await expect(window.locator('#form-message')).toHaveText('Use the demo email and password shown below.');
  await signIn('demo@protoflow.test', 'FlowDemo!42');
  await expect(window.getByRole('heading', {name: "You're signed in", exact: true})).toBeVisible();
  await expect(window.locator('#status')).toHaveText('Signed in');
  await expect(window.getByLabel('Password')).toHaveValue('');
  await window.getByRole('button', {name: 'Log out'}).click();
  await expect(window.getByRole('heading', {name: 'Sign in to ProtoFlow', exact: true})).toBeVisible();
  await expect(window.locator('#status')).toHaveText('Signed out. You can sign in again.');
  expect(await window.evaluate(() => ({cookies: document.cookie, local: localStorage.length, session: sessionStorage.length}))).toEqual({cookies: '', local: 0, session: 0});
});

test('the conversation rejects empty messages, replies and restarts', async () => {
  await open('chat');
  await expect(window.getByTestId('chat')).toBeVisible();
  await expect(window.locator('#messages article')).toHaveCount(1);
  await expect(window.locator('#messages article p')).toHaveText(welcome);
  await window.getByTestId('chat.send').click();
  await expect(window.getByTestId('chat.error')).toHaveText('Type a message first.');
  await send('  Hello, ProtoFlow!  ');
  await expect(window.getByTestId('chat.error')).toBeHidden();
  await expect(window.locator('[data-speaker=user] p')).toHaveText('Hello, ProtoFlow!');
  await expect(window.locator('[data-speaker=assistant] p').last()).toHaveText(reply);
  await expect(window.getByTestId('chat.status')).toHaveText('Reply added.');
  await window.getByTestId('chat.restart').click();
  await expect(window.locator('#messages article')).toHaveCount(1);
  await expect(window.getByTestId('chat.status')).toHaveText('Conversation cleared.');
});

test('the help screen lists the tips in prototype order', async () => {
  await open('help');
  await expect(window.getByTestId('help.title')).toHaveText('How ProtoFlow ships each version');
  await expect(window.getByTestId('help.tip')).toHaveCount(3);
  await expect(window.getByTestId('help.tip').locator('strong')).toHaveText(['Prototype first', 'One version at a time', 'Checked by anchors']);
  await expect(window.getByTestId('help.footer')).toHaveText('Prototype-driven development');
  await expect(window.getByTestId('help.tip').first()).toHaveCSS('background-color', 'rgb(238, 247, 244)');
  await expect(window.getByTestId('help.tip').first()).toHaveCSS('border-left-color', 'rgb(13, 118, 110)');
  await expect(window.getByTestId('help.tip').first().locator('strong')).toHaveCSS('color', 'rgb(11, 97, 93)');
});

test('links connect sign-in, conversation and help inside the desktop window', async () => {
  await window.getByRole('link', {name: /Open the demo conversation/}).click();
  await expect(window.getByTestId('chat')).toBeVisible();
  await open('help');
  await window.getByTestId('help.back').click();
  await expect(window.getByTestId('chat')).toBeVisible();
  await window.getByTestId('chat.back').click();
  await expect(window.getByTestId('login')).toBeVisible();
});
