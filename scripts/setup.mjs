import fs from 'node:fs/promises';
const modules='/Users/feature/code/protoflow/node_modules';
await fs.symlink(modules,'node_modules','dir').catch(error=>{if(error.code!=='EEXIST')throw error;});
if(process.env.PROTOFLOW_ACCEPTANCE_FAIL_BUILD==='1'){await fs.mkdir('.protoflow',{recursive:true});await fs.writeFile('.protoflow/fail-build','Operator injected build failure for FIFO acceptance\n');}
console.log('Local acceptance uses existing shared Playwright dependency installation');
