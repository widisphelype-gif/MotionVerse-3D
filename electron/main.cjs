const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function isCameraPermission(permission, details = {}) {
  if (permission === 'camera' || permission === 'media' || permission === 'videoCapture') return true;
  return Array.isArray(details.mediaTypes) && details.mediaTypes.includes('video');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 760,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#080d18',
    title: 'MotionVerse — Body Outline',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  // Permite solicitações de webcam feitas pelo Chromium dentro do Electron.
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, _origin, details) => {
    return isCameraPermission(permission, details);
  });

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    callback(isCameraPermission(permission, details));
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
