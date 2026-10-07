const {app,BrowserWindow}=require('electron');
const path=require('node:path');
if(process.env.PROTOFLOW_ELECTRON_USER_DATA){
 require('node:fs').mkdirSync(process.env.PROTOFLOW_ELECTRON_USER_DATA,{recursive:true});
 app.setPath('userData',process.env.PROTOFLOW_ELECTRON_USER_DATA);
 app.setPath('sessionData',process.env.PROTOFLOW_ELECTRON_USER_DATA);
}
app.commandLine.appendSwitch('force-device-scale-factor','1');
app.whenReady().then(()=>{
 const window=new BrowserWindow({width:1000,height:760,useContentSize:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
 window.webContents.setZoomFactor(1);
 window.loadFile(path.join(__dirname,'../.protoflow/renderer/index.html'));
});
app.on('window-all-closed',()=>app.quit());
