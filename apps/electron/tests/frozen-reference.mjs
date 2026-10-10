import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url));
export const frozenPrototype = path.join(fixtures, 'prototype');

export async function verifyFrozenReference() {
  const binding = JSON.parse(await fs.readFile(path.join(fixtures, 'binding.json'), 'utf8'));
  if (binding.repository !== 'zhangqiu-ai/protoflow-test' || !/^[0-9a-f]{40}$/.test(binding.sourceSha)) throw new Error('Invalid frozen prototype provenance');
  const actual = (await fs.readdir(frozenPrototype)).sort();
  if (JSON.stringify(actual) !== JSON.stringify(Object.keys(binding.files).sort())) throw new Error('Frozen prototype file set changed');
  for (const [name, expected] of Object.entries(binding.files)) {
    const bytes = await fs.readFile(path.join(frozenPrototype, name));
    if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error(`Frozen prototype changed: ${name}`);
  }
  return binding;
}
