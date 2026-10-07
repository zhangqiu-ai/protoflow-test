import { test, expect } from './electron-fixture.mjs';

const address = 'demo@fresh.protoflow.test';
const secret = 'FreshDemo42!';
const submit = page => page.getByRole('button', { name: 'Enter workspace →', exact: true });
async function fillDetails(page, email = address, password = secret) {
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
}
async function enter(page) {
  await fillDetails(page);
  await submit(page).click();
  await expect(page.getByRole('heading', { name: 'Demo workspace', exact: true })).toBeVisible();
}

test('initial login displays the fictional fixture and empty fields', async ({ page }) => {
  await expect(page.getByRole('heading', { name: "Let's get started", exact: true })).toBeVisible();
  await expect(page.getByText('Fictional test details', { exact: true })).toBeVisible();
  await expect(page.getByText(address, { exact: true })).toBeVisible();
  await expect(page.getByText(secret, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Email address', { exact: true })).toBeEmpty();
  await expect(page.getByLabel('Password', { exact: true })).toBeEmpty();
  await expect(page.getByRole('status')).toHaveText('Ready for a fresh start');
});

test('empty submit reports both requirements and focuses email', async ({ page }) => {
  await submit(page).click();
  await expect(page.getByText('Email is required.', { exact: true })).toBeVisible();
  await expect(page.getByText('Password is required.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Email address', { exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Check the highlighted fields');
});

test('invalid fields recover independently and focus the remaining error', async ({ page }) => {
  await fillDetails(page, 'bad', '123');
  await submit(page).click();
  await expect(page.getByText('Use a valid email address.', { exact: true })).toBeVisible();
  await expect(page.getByText('Use 8 or more characters.', { exact: true })).toBeVisible();
  await page.getByLabel('Email address', { exact: true }).fill(address);
  await submit(page).click();
  await expect(page.getByText('Use a valid email address.', { exact: true })).toBeHidden();
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
  await page.getByLabel('Password', { exact: true }).fill(secret);
  await submit(page).click();
  await expect(page.getByRole('status')).toHaveText('Workspace opened');
});

test('wrong details cannot enter and a later validation clears the mismatch alert', async ({ page }) => {
  await fillDetails(page, address, 'WrongDemo42!');
  await submit(page).click();
  await expect(page.getByRole('alert')).toHaveText("Those demo details don't match.");
  await expect(page.getByRole('status')).toHaveText('Try the fictional test details');
  await expect(page.getByRole('button', { name: 'Leave workspace', exact: true })).toBeHidden();
  await page.getByLabel('Email address', { exact: true }).fill('');
  await submit(page).click();
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByText('Email is required.', { exact: true })).toBeVisible();
});

test('normalized address accepts keyboard submit and clears the hidden password', async ({ page }) => {
  await fillDetails(page, '  DEMO@FRESH.PROTOFLOW.TEST  ');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Demo workspace', exact: true })).toBeVisible();
  await expect(page.getByText(address, { exact: true }).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText('Workspace opened');
  await expect(page.locator('#password')).toBeEmpty();
});

test('only the exact fictional password is accepted', async ({ page }) => {
  for (const password of ['freshdemo42!', ' FreshDemo42! ']) {
    await fillDetails(page, address, password);
    await submit(page).click();
    await expect(page.getByRole('alert')).toBeVisible();
  }
});

test('logout clears credentials and errors and allows another login', async ({ page }) => {
  await submit(page).click();
  await enter(page);
  await page.getByRole('button', { name: 'Leave workspace', exact: true }).click();
  await expect(page.getByLabel('Email address', { exact: true })).toBeEmpty();
  await expect(page.getByLabel('Password', { exact: true })).toBeEmpty();
  await expect(page.getByLabel('Email address', { exact: true })).toBeFocused();
  await expect(page.getByText('Email is required.', { exact: true })).toBeHidden();
  await expect(page.getByText('Password is required.', { exact: true })).toBeHidden();
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('You can start again');
  await enter(page);
});

test('reload discards the session without network requests or browser storage', async ({ page }) => {
  const requests = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  const storage = () => page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  const before = await storage();
  await enter(page);
  expect(await storage()).toEqual(before);
  expect(requests).toEqual([]);
  await page.reload();
  await expect(page.getByRole('heading', { name: "Let's get started", exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Ready for a fresh start');
  await expect(page.getByLabel('Email address', { exact: true })).toBeEmpty();
  await expect(page.getByLabel('Password', { exact: true })).toBeEmpty();
});
