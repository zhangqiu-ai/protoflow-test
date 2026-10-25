import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const frozenPrototypeDir = path.resolve('.protoflow/versions/git-dc6857d74ded5506aa064f13e7b5dce2816e6551/files/prototype');

test('configured build packages both frozen AI briefing assets', async () => {
  // Check packaging before browser launch so an environment failure cannot hide it.
  const assets = ['ai.html', 'ai.css'];
  const builtFiles = await fs.readdir(path.resolve('.protoflow/site'));
  expect(assets.filter(name => !builtFiles.includes(name)), 'AI assets missing from configured build output').toEqual([]);

  for (const name of assets) {
    expect(await fs.readFile(path.resolve('.protoflow/site', name), 'utf8')).toBe(
      await fs.readFile(path.join(frozenPrototypeDir, name), 'utf8'),
    );
  }
});
