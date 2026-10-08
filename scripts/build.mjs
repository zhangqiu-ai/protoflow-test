import fs from 'node:fs/promises';
import path from 'node:path';
// Publishes every application file to .protoflow/site, so a new screen needs no build or config change.
// Inline handlers and scripts must parse; the operator failure injection is kept for FIFO acceptance.
const out = '.protoflow/site';
await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });
let pages = 0;
for (const entry of await fs.readdir('app', { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const source = path.join(entry.parentPath, entry.name);
  const target = path.join(out, path.relative('app', source));
  if (source.endsWith('.html')) {
    const html = await fs.readFile(source, 'utf8');
    for (const [, handler] of html.matchAll(/onclick="([^"]+)"/g)) new Function(handler);
    for (const [, script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new Function(script);
    pages++;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}
try { await fs.access('.protoflow/fail-build'); throw new Error('Intentional operator failure injection; runner must block later versions'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
console.log(`Built ${pages} application page(s) to ${out}`);
