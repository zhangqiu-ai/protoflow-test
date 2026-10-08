import {test, expect} from '@playwright/test';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Regression contract: frozen git-76b9a0af9924b7c9f471bda56486030cfa146fe1.
const applicationUrl = pathToFileURL(path.resolve('.protoflow/site/help.html')).href;
const tips = [
  ['Prototype first', 'Each design commit becomes one frozen version.'],
  ['One version at a time', 'The application follows prototype versions in order.'],
  ['Checked by anchors', 'Structure, colours, layout and pixels are compared for every screen.'],
];

test.beforeEach(async ({page}) => {
  await page.goto(applicationUrl);
});

test('help screen renders frozen content in order', async ({page}) => {
  await expect(page).toHaveTitle('ProtoFlow — Help');
  await expect(page.getByRole('heading', {name: 'How this demo works', exact: true})).toBeVisible();
  await expect(page.getByText('GETTING STARTED', {exact: true})).toBeVisible();
  const items = page.getByRole('listitem');
  await expect(items).toHaveCount(tips.length);
  for (const [index, [title, description]] of tips.entries()) {
    const item = items.nth(index);
    await expect(item.getByText(title, {exact: true})).toBeVisible();
    await expect(item.getByText(description, {exact: true})).toBeVisible();
  }
  await expect(page.getByRole('link', {name: '← Back to conversation', exact: true})).toHaveAttribute('href', 'chat.html');
  await expect(page.getByText('Prototype-driven development', {exact: true})).toBeVisible();
});

test('every frozen help anchor maps to an application test id', async ({page}) => {
  for (const anchor of ['help', 'help.header', 'help.back', 'help.panel', 'help.title', 'help.tips', 'help.footer']) {
    await expect(page.getByTestId(anchor)).toHaveCount(1);
  }
  await expect(page.getByTestId('help.tip')).toHaveCount(3);
  await expect(page.locator('body')).toHaveAttribute('data-testid', 'help');
});

test('help screen preserves the frozen visual tokens and returns to conversation', async ({page}) => {
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(242, 245, 247)');
  await expect(page.getByTestId('help.panel')).toHaveCSS('border-radius', '20px');
  await expect(page.getByTestId('help.panel')).toHaveCSS('width', '880px');
  await expect(page.getByTestId('help.tip').first()).toHaveCSS('background-color', 'rgb(247, 250, 250)');
  await expect(page.getByTestId('help.title')).toHaveCSS('font-size', '22px');
  await page.getByRole('link', {name: '← Back to conversation', exact: true}).click();
  await expect(page).toHaveURL(pathToFileURL(path.resolve('.protoflow/site/chat.html')).href);
  await expect(page.getByRole('heading', {name: 'Local demo conversation', exact: true})).toBeVisible();
});
