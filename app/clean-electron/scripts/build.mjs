import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'vite';
const entry=await fs.readFile('app/renderer/index.html','utf8');
assert.match(entry,/<div id="root"><\/div>/);
async function audit(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())await audit(file);else if(/\.[jt]sx?$/.test(file)){const text=await fs.readFile(file,'utf8');assert.ok(!/dangerouslySetInnerHTML|\binnerHTML\b|insertAdjacentHTML|document\.write|<iframe\b|prototype\//i.test(text),'Renderer must use React components: '+file);}}}
await audit('app/renderer/src');
await build({root:path.resolve('app/renderer'),base:'./',build:{outDir:path.resolve('.protoflow/renderer'),emptyOutDir:true}});
try{await fs.access('.protoflow/fail-build');throw new Error('Operator failure injection: block before processing another version');}catch(e){if(e.code!=='ENOENT')throw e;}
