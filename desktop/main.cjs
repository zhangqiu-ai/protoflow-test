// Electron main process: one window that shows the desktop renderer's screens (one HTML page per screen).
// Screens are local files only: no network, accounts or persistent session.
const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');

// Regression tests run with a private profile; ProtoFlow capture sets its own profile before this file loads.
if (process.env.DESKTOP_USER_DATA) {
  app.setPath('userData', process.env.DESKTOP_USER_DATA);
  app.setPath('sessionData', process.env.DESKTOP_USER_DATA);
}

let quitting = false;
app.whenReady().then(() => {
  if (quitting) return;
  // enableLargerThanScreen: macOS otherwise clamps the window (and the viewport ProtoFlow measures) to the screen.
  const window = new BrowserWindow({
    width: 1000, height: 760, useContentSize: true, enableLargerThanScreen: true, title: 'ProtoFlow',
    webPreferences: { contextIsolation: true, sandbox: true }
  });
  window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
});
app.on('window-all-closed', () => app.quit());

// Finish asynchronous session cleanup while the main loop is still running, then use Electron's normal quit path.
let quitReady = false;
let closingConnections = false;
app.on('before-quit', event => {
  quitting = true;
  if (quitReady || !app.isReady()) return;
  event.preventDefault();
  if (closingConnections) return;
  closingConnections = true;
  session.defaultSession.closeAllConnections().then(() => {
    quitReady = true;
    app.quit();
  }).catch(error => {
    // Keep the application open if cleanup fails, so a failed shutdown cannot masquerade as a clean exit.
    closingConnections = false;
    console.error('Could not finish session cleanup:', error);
  });
});
