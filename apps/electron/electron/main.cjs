const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');

// Avoid shutdown waits on the unused performance-observer database in this offline demo.
const disabledFeatures = new Set(app.commandLine.getSwitchValue('disable-features').split(',').filter(Boolean));
disabledFeatures.add('DeclarativePerformanceObserver');
app.commandLine.appendSwitch('disable-features', [...disabledFeatures].join(','));

if (process.env.PF_ACCEPTANCE_USER_DATA) {
  app.setPath('userData', process.env.PF_ACCEPTANCE_USER_DATA);
}

let applicationSession;
app.whenReady().then(() => {
  // This offline demo keeps renderer data and caches in memory.
  applicationSession = session.fromPartition('protoflow-demo');
  const window = new BrowserWindow({
    width: 1440,
    height: 1000,
    useContentSize: true,
    // macOS otherwise clamps the window to the screen work area, shrinking the required 1440×1000 viewport.
    enableLargerThanScreen: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, session: applicationSession },
  });
  window.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/login' });
});

app.on('window-all-closed', () => app.quit());

// Finish asynchronous session cleanup while the main loop is still running, then use Electron's normal quit path.
let quitReady = false;
let closingConnections = false;
app.on('before-quit', event => {
  if (quitReady) return;
  event.preventDefault();
  if (closingConnections) return;
  closingConnections = true;
  applicationSession.closeAllConnections().then(() => {
    quitReady = true;
    app.quit();
  }).catch(error => {
    // Keep the application open if cleanup fails, so a failed shutdown cannot masquerade as a clean exit.
    closingConnections = false;
    console.error('Could not finish session cleanup:', error);
  });
});
