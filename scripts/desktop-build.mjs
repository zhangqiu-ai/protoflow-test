import fs from 'node:fs/promises';
import path from 'node:path';
// Checks the Electron target (desktop/) before its functional suite runs: the main entry exists, every renderer
// page's inline scripts parse, and every local stylesheet, script and link the pages reference is present.
// The operator failure injection is shared with the web build.
const root = 'desktop';
await fs.access(path.join(root, 'main.cjs'));
const renderer = path.join(root, 'renderer');
let pages = 0;
for (const entry of await fs.readdir(renderer, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  const file = path.join(entry.parentPath, entry.name);
  const html = await fs.readFile(file, 'utf8');
  for (const [, handler] of html.matchAll(/onclick="([^"]+)"/g)) new Function(handler);
  for (const [, script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new Function(script);
  for (const [, reference] of html.matchAll(/(?:href|src)="([^"#:?]+)(?:[?#][^"]*)?"/g)) {
    await fs.access(path.join(path.dirname(file), reference)).catch(() => { throw new Error(`${file} references missing ${reference}`); });
  }
  pages++;
}
if (!pages) throw new Error('Desktop renderer has no pages');
try { await fs.access('.protoflow/fail-build'); throw new Error('Intentional operator failure injection; runner must block later versions'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
console.log(`Checked ${pages} desktop renderer page(s)`);
