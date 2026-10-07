import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import './build.mjs';
const files=['chat.html','chat.css'];
for(const name of ['chat.html']){
 const html=await fs.readFile('app/'+name,'utf8');
 assert.ok(html.includes('id="action"')&&html.includes('id="status"'),'Mapped action and status required: '+name);
 for(const [,handler] of html.matchAll(/onclick="([^"]+)"/g))new Function(handler);
 for(const [,script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new Function(script);
}
await fs.mkdir('.protoflow/site',{recursive:true});
for(const name of files)await fs.copyFile('app/'+name,'.protoflow/site/'+name);
console.log('Added static conversation HTML/CSS to .protoflow/site after the unchanged login build');
