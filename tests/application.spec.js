import {test, expect} from '@playwright/test';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Regression contract: frozen git-85223b16aa0a1a9ad959350176a542c8a10ea84b.
const applicationUrl = pathToFileURL(path.resolve('.protoflow/site/index.html')).href;
const demoEmail = 'demo@protoflow.test';
const demoPassword = 'FlowDemo!42';
const signIn = page => page.getByRole('button', {name: 'Sign in', exact: true});
const success = page => page.getByRole('heading', {name: "You're signed in", exact: true});

async function fillCredentials(page, email = demoEmail, password = demoPassword) {
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', {exact: true}).fill(password);
}

test.beforeEach(async ({page}) => {
  await page.goto(applicationUrl);
});

test('initial screen labels the local demo and exposes accessible form fields', async ({page}) => {
  await expect(page).toHaveTitle('ProtoFlow — Demo sign in');
  await expect(page.getByRole('heading', {name: 'Sign in to ProtoFlow', exact: true})).toBeVisible();
  await expect(page.getByText('LOCAL DEMO · NO ACCOUNT SERVICE', {exact: true})).toBeVisible();
  await expect(page.getByText('Fictional credentials. Nothing is saved or sent.', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Email address')).toHaveAttribute('type', 'email');
  await expect(page.getByLabel('Password', {exact: true})).toHaveAttribute('type', 'password');
  await expect(signIn(page)).toBeVisible();
  await expect(page.getByRole('button', {name: 'Log out', exact: true})).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Ready');
});

test('login screen exposes the frozen semantic screen anchor', async ({page}) => {
  await expect(page.getByTestId('login')).toHaveCount(1);
  await expect(page.locator('body')).toHaveAttribute('data-testid', 'login');
});

test('empty submission reports both required fields and focuses email', async ({page}) => {
  await signIn(page).click();
  const email = page.getByLabel('Email address');
  const password = page.getByLabel('Password', {exact: true});
  await expect(email).toHaveAccessibleDescription('Enter your email address.');
  await expect(password).toHaveAccessibleDescription('Enter your password.');
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Check the highlighted fields.');
});

for (const scenario of [
  {name: 'missing email', email: '', password: demoPassword, field: 'Email address', error: 'Enter your email address.'},
  {name: 'malformed email', email: 'not-an-email', password: demoPassword, field: 'Email address', error: 'Enter a valid email address.'},
  {name: 'missing password', email: demoEmail, password: '', field: 'Password', error: 'Enter your password.'},
  {name: 'seven-character password', email: demoEmail, password: '1234567', field: 'Password', error: 'Use at least 8 characters.'},
]) {
  test(scenario.name + ' is rejected independently', async ({page}) => {
    await fillCredentials(page, scenario.email, scenario.password);
    await signIn(page).click();
    const field = page.getByLabel(scenario.field, {exact: true});
    const otherField = page.getByLabel(scenario.field === 'Password' ? 'Email address' : 'Password', {exact: true});
    await expect(page.getByText(scenario.error, {exact: true})).toBeVisible();
    await expect(field).toHaveAccessibleDescription(scenario.error);
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toBeFocused();
    await expect(otherField).toHaveAttribute('aria-invalid', 'false');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(success(page)).toBeHidden();
  });
}

for (const scenario of [
  {name: 'wrong email', email: 'other@protoflow.test', password: demoPassword},
  {name: 'wrong password at the eight-character boundary', email: demoEmail, password: '12345678'},
]) {
  test(scenario.name + ' fails demo authentication and can be corrected', async ({page}) => {
    await fillCredentials(page, scenario.email, scenario.password);
    await signIn(page).click();
    await expect(page.getByRole('alert')).toHaveText('Use the demo email and password shown below.');
    await expect(page.getByRole('status')).toHaveText('Demo sign in was not completed.');
    await expect(success(page)).toBeHidden();
    await fillCredentials(page);
    await signIn(page).click();
    await expect(success(page)).toBeVisible();
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(page.getByLabel('Password', {exact: true})).toHaveValue('');
  });
}

test('keyboard submission clears validation errors and normalizes the email', async ({page}) => {
  await page.getByLabel('Password', {exact: true}).press('Enter');
  await expect(page.getByText('Enter your email address.', {exact: true})).toBeVisible();
  await fillCredentials(page, '  DEMO@PROTOFLOW.TEST  ');
  await page.getByLabel('Password', {exact: true}).press('Enter');
  await expect(success(page)).toBeVisible();
  await expect(page.getByText(demoEmail, {exact: true})).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Signed in');
  await expect(page.getByRole('button', {name: 'Log out', exact: true})).toBeFocused();
  await expect(page.getByLabel('Email address')).toHaveValue('');
  await expect(page.getByLabel('Password', {exact: true})).toHaveValue('');
  await expect(page.getByText('Enter your email address.', {exact: true})).toBeHidden();
  await expect(page.getByText('Enter your password.', {exact: true})).toBeHidden();
});

test('repeated submissions, logout, second sign-in and reload keep session state consistent', async ({page}) => {
  await fillCredentials(page);
  // Submit twice in the same event turn to exercise rapid repeated submissions.
  await signIn(page).evaluate(button => {
    button.form.requestSubmit();
    button.form.requestSubmit();
  });
  await expect(success(page)).toHaveCount(1);
  await expect(success(page)).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Signed in');
  await expect(page.getByLabel('Password', {exact: true})).toHaveValue('');
  await page.getByRole('button', {name: 'Log out', exact: true}).click();
  await expect(success(page)).toBeHidden();
  await expect(page.getByRole('heading', {name: 'Sign in to ProtoFlow', exact: true})).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeFocused();
  await expect(page.getByLabel('Email address')).toHaveValue('');
  await expect(page.getByLabel('Password', {exact: true})).toHaveValue('');
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Signed out. You can sign in again.');
  await fillCredentials(page);
  await signIn(page).click();
  await expect(success(page)).toBeVisible();
  await page.reload();
  await expect(success(page)).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.getByLabel('Email address')).toHaveValue('');
  await expect(page.getByLabel('Password', {exact: true})).toHaveValue('');
});

test('the complete demo flow makes no HTTP requests or cookie/storage writes', async ({page, context}) => {
  const network = [];
  const pageErrors = [];
  const writes = [];
  context.on('request', request => {
    if (/^https?:/.test(request.url())) network.push(request.url());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.exposeFunction('recordDemoWrite', kind => writes.push(kind));
  await page.addInitScript(() => {
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        window.recordDemoWrite('storage.' + method);
        return original.apply(this, args);
      };
    }
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(Document.prototype, 'cookie', {
      ...cookie,
      set(value) {
        window.recordDemoWrite('cookie');
        return cookie.set.call(this, value);
      },
    });
  });
  await page.reload();
  await signIn(page).click();
  await fillCredentials(page, 'not-an-email', 'short');
  await signIn(page).click();
  await fillCredentials(page, demoEmail, 'WrongDemo!42');
  await signIn(page).click();
  await fillCredentials(page);
  await page.getByLabel('Password', {exact: true}).press('Enter');
  await expect(page.getByRole('status')).toHaveText('Signed in');
  await page.getByRole('button', {name: 'Log out', exact: true}).click();
  await fillCredentials(page);
  await signIn(page).click();
  await expect(page.getByRole('status')).toHaveText('Signed in');
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('Ready');
  expect(await page.evaluate(() => ({local: localStorage.length, session: sessionStorage.length}))).toEqual({local: 0, session: 0});
  expect(await context.cookies()).toEqual([]);
  expect(writes).toEqual([]);
  expect(network).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('mobile layout keeps sign-in and logout usable without horizontal scrolling', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await expect(page.getByRole('heading', {name: 'Sign in to ProtoFlow', exact: true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await fillCredentials(page);
  await signIn(page).click();
  await expect(success(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', {name: 'Log out', exact: true}).click();
  await expect(page.getByLabel('Email address')).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Signed out. You can sign in again.');
});
