import {test, expect} from '@playwright/test';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Regression contract: frozen git-5220d95113dfc4f065052d10b2310a7c39dfb5e1.
const applicationUrl = pathToFileURL(path.resolve('.protoflow/site/faq.html')).href;
const question = 'Who approves a version before it ships?';
const answer = 'An independent reviewer checks every version on each platform before it is merged.';

test.beforeEach(async ({page}) => {
  await page.goto(applicationUrl);
});

test('FAQ screen renders the frozen content in order', async ({page}) => {
  await expect(page).toHaveTitle('ProtoFlow — Questions');
  await expect(page.getByText('QUESTIONS', {exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Common questions', exact: true})).toBeVisible();
  await expect(page.getByText('Short answers about how prototype versions reach both apps.', {exact: true})).toBeVisible();
  await expect(page.getByText(question, {exact: true})).toBeVisible();
  await expect(page.getByText(answer, {exact: true})).toBeHidden();
  await expect(page.getByRole('link', {name: '← Back to help', exact: true})).toHaveAttribute('href', 'help.html');
  await expect(page.getByText('Prototype-driven development', {exact: true})).toBeVisible();
});

test('every frozen FAQ anchor maps to one application test id', async ({page}) => {
  for (const anchor of ['faq', 'faq.header', 'faq.back', 'faq.panel', 'faq.title', 'faq.lead', 'faq.item', 'faq.toggle', 'faq.answer', 'faq.footer']) {
    await expect(page.getByTestId(anchor)).toHaveCount(1);
  }
  await expect(page.locator('body')).toHaveAttribute('data-testid', 'faq');
});

test('FAQ answer expands from its frozen sidecar state', async ({page}) => {
  const item = page.getByTestId('faq.item');
  await expect(item).not.toHaveAttribute('open', '');
  await page.getByTestId('faq.toggle').click();
  await expect(item).toHaveAttribute('open', '');
  await expect(page.getByTestId('faq.answer')).toBeVisible();
});

test('FAQ screen preserves frozen visual tokens and returns to help', async ({page}) => {
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(242, 245, 247)');
  await expect(page.getByTestId('faq.panel')).toHaveCSS('border-radius', '20px');
  await expect(page.getByTestId('faq.panel')).toHaveCSS('width', '880px');
  await expect(page.getByTestId('faq.item')).toHaveCSS('background-color', 'rgb(242, 244, 253)');
  await expect(page.getByTestId('faq.item')).toHaveCSS('border-top-color', 'rgb(214, 220, 245)');
  await expect(page.getByTestId('faq.toggle')).toHaveCSS('color', 'rgb(44, 63, 168)');
  await expect(page.getByTestId('faq.title')).toHaveCSS('font-size', '22px');
  await page.getByRole('link', {name: '← Back to help', exact: true}).click();
  await expect(page).toHaveURL(pathToFileURL(path.resolve('.protoflow/site/help.html')).href);
  await expect(page.getByRole('heading', {name: 'Three rules for every version', exact: true})).toBeVisible();
});
