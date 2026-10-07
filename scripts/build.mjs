import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const html=await fs.readFile('app/index.html','utf8');
assert.ok(html.includes('id="action"') && html.includes('id="status"'), 'Mapped action and status required');
for(const [,handler] of html.matchAll(/onclick="([^"]+)"/g)) new Function(handler);
await fs.access('app/styles.css');
await fs.mkdir('.protoflow/site',{recursive:true});
await fs.copyFile('app/index.html','.protoflow/site/index.html');
await fs.copyFile('app/styles.css','.protoflow/site/styles.css');
try { await fs.access('.protoflow/fail-build'); throw new Error('Intentional operator failure injection; runner must block later versions'); }
catch(error) { if(error.code !== 'ENOENT') throw error; }
console.log('Built static application HTML/CSS to .protoflow/site');
