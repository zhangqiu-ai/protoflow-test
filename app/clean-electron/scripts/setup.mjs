import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const installed=spawnSync('npm',['ci','--no-audit','--no-fund'],{stdio:'inherit'});
if(installed.status!==0)process.exit(installed.status||1);
const require=createRequire(import.meta.url);const executable=require('electron');
fs.accessSync(executable);console.log('Electron binary prepared before acceptance test timeouts');
