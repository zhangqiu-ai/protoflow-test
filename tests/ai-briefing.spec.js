import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const briefingUrl = pathToFileURL(path.resolve('app/ai.html')).href;
const signInUrl = pathToFileURL(path.resolve('app/index.html')).href;
const builtBriefingPath = path.resolve('.protoflow/site/ai.html');
const builtBriefingUrl = pathToFileURL(builtBriefingPath).href;
const builtSignInUrl = pathToFileURL(path.resolve('.protoflow/site/index.html')).href;
const frozenPrototypeDir = path.resolve('.protoflow/versions/git-dc6857d74ded5506aa064f13e7b5dce2816e6551/files/prototype');
const status = page => page.getByRole('status');
const briefings = page => page.locator('.briefing');

test.beforeEach(async ({page}) => {
  await page.goto(briefingUrl);
});

test('AI briefing starts with four fictional local briefings and accessible topic filters', async ({page}) => {
  await expect(page).toHaveTitle('ProtoFlow — AI briefing');
  await expect(page.getByRole('heading', {name: "What's new in AI", exact: true})).toBeVisible();
  await expect(page.getByText('Fictional digest', {exact: true})).toBeVisible();
  await expect(page.getByRole('group', {name: 'Filter topics'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'All', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(briefings(page)).toHaveCount(4);
  await expect(briefings(page).filter({visible: true})).toHaveCount(4);
  await expect(status(page)).toHaveText('Showing 4 briefings');
});

test('topic filters show the matching briefing count and restore all items', async ({page}) => {
  const all = page.getByRole('button', {name: 'All', exact: true});
  const models = page.getByRole('button', {name: 'Models', exact: true});
  const research = page.getByRole('button', {name: 'Research', exact: true});
  const tools = page.getByRole('button', {name: 'Tools', exact: true});

  await models.click();
  await expect(models).toHaveAttribute('aria-pressed', 'true');
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  await expect(briefings(page).filter({visible: true})).toHaveCount(1);
  await expect(status(page)).toHaveText('Showing 1 briefing');

  await tools.click();
  await expect(tools).toHaveAttribute('aria-pressed', 'true');
  await expect(models).toHaveAttribute('aria-pressed', 'false');
  await expect(briefings(page).filter({visible: true})).toHaveCount(2);
  await expect(status(page)).toHaveText('Showing 2 briefings');

  await research.click();
  await expect(briefings(page).filter({visible: true})).toHaveCount(1);
  await expect(status(page)).toHaveText('Showing 1 briefing');

  await all.click();
  await expect(briefings(page).filter({visible: true})).toHaveCount(4);
  await expect(status(page)).toHaveText('Showing 4 briefings');
});

test('briefing keeps the frozen two-column visual contract and responsive filter treatment', async ({page}) => {
  await expect(fs.readFile(path.resolve('app/ai.html'), 'utf8')).resolves.toBe(
    await fs.readFile(path.join(frozenPrototypeDir, 'ai.html'), 'utf8'),
  );
  await expect(fs.readFile(path.resolve('app/ai.css'), 'utf8')).resolves.toBe(
    await fs.readFile(path.join(frozenPrototypeDir, 'ai.css'), 'utf8'),
  );

  const desktop = await page.locator('#panel').evaluate(panel => {
    const filters = document.querySelector('.filters');
    const cards = document.querySelector('#briefings');
    const active = document.querySelector('.filter[aria-pressed="true"]');
    return {
      panelWidth: Math.round(panel.getBoundingClientRect().width),
      panelRadius: getComputedStyle(panel).borderRadius,
      cardColumnCount: getComputedStyle(cards).gridTemplateColumns.split(' ').length,
      filtersGap: getComputedStyle(filters).gap,
      activeBackground: getComputedStyle(active).backgroundColor,
    };
  });
  expect(desktop).toEqual({
    panelWidth: 880,
    panelRadius: '20px',
    cardColumnCount: 2,
    filtersGap: '8px',
    activeBackground: 'rgb(13, 118, 110)',
  });

  await page.setViewportSize({width: 390, height: 844});
  await expect(page.locator('.demo-badge')).toBeHidden();
  const mobileColumnCount = await page.locator('#briefings').evaluate(cards =>
    getComputedStyle(cards).gridTemplateColumns.split(' ').length,
  );
  expect(mobileColumnCount).toBe(1);
});

test('briefing navigation works in both directions and preserves the local-only boundary', async ({page, context}) => {
  const network = [];
  const writes = [];
  context.on('request', request => {
    if (/^https?:/.test(request.url())) network.push(request.url());
  });
  await page.exposeFunction('recordBriefingWrite', kind => writes.push(kind));
  await page.addInitScript(() => {
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        window.recordBriefingWrite('storage.' + method);
        return original.apply(this, args);
      };
    }
  });
  await page.reload();
  await page.getByRole('link', {name: '← Back to sign in', exact: true}).click();
  await expect(page).toHaveURL(signInUrl);
  await expect(page.getByRole('link', {name: 'AI briefing →', exact: true})).toBeVisible();
  await page.getByRole('link', {name: 'AI briefing →', exact: true}).click();
  await expect(page).toHaveURL(briefingUrl);
  await expect(status(page)).toHaveText('Showing 4 briefings');
  expect(await page.evaluate(() => ({local: localStorage.length, session: sessionStorage.length}))).toEqual({local: 0, session: 0});
  expect(writes).toEqual([]);
  expect(network).toEqual([]);
});

test('built site includes the AI briefing and its navigation works in both directions', async ({page}) => {
  await expect(fs.readFile(builtBriefingPath, 'utf8')).resolves.toContain('What\'s new in AI');
  await expect(fs.readFile(path.resolve('.protoflow/site/ai.css'), 'utf8')).resolves.toContain('#briefings');

  await page.goto(builtSignInUrl);
  await page.getByRole('link', {name: 'AI briefing →', exact: true}).click();
  await expect(page).toHaveURL(builtBriefingUrl);
  await expect(page.getByRole('heading', {name: "What's new in AI", exact: true})).toBeVisible();

  await page.getByRole('button', {name: 'Tools', exact: true}).click();
  await expect(status(page)).toHaveText('Showing 2 briefings');

  await page.getByRole('link', {name: '← Back to sign in', exact: true}).click();
  await expect(page).toHaveURL(builtSignInUrl);
});

test('mobile briefing keeps the filtering interface usable without horizontal scrolling', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await expect(page.getByRole('button', {name: 'Tools', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Tools', exact: true}).click();
  await expect(status(page)).toHaveText('Showing 2 briefings');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
