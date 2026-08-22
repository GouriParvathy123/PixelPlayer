const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { parseFile } = require('music-metadata');

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac']);

// The only folder the app is allowed to read from during a session.
// Set once, after the user explicitly picks a folder — never wider than that.
let allowedRoot = null;

function isPathInsideAllowedRoot(candidatePath) {
  if (!allowedRoot) return false;
  const resolved = path.resolve(candidatePath);
  const rootResolved = path.resolve(allowedRoot);
  return resolved === rootResolved || resolved.startsWith(rootResolved + path.sep);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 640,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      // Security baseline: renderer never gets raw Node/filesystem access.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname,'index.html'));
  // win.webContents.openDevTools(); // uncomment while developing
}

app.whenReady().then(() => {
  // Custom protocol: renderer requests audio as pixel-player://<absolute-path>
  // Main process checks the path is inside the user-approved folder before serving it.
  // This avoids handing the renderer a generic file:// scheme with full disk access.
  protocol.handle('pixel-player', (request) => {
    const requestedPath = decodeURIComponent(request.url.replace('pixel-player://', ''));

    if (!isPathInsideAllowedRoot(requestedPath)) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch('file://' + requestedPath);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC: folder selection ---
ipcMain.handle('choose-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  allowedRoot = result.filePaths[0];
  return allowedRoot;
});

// --- IPC: scan the chosen folder for audio files + read metadata ---
ipcMain.handle('scan-library', async () => {
  if (!allowedRoot) return [];

  const entries = fs.readdirSync(allowedRoot, { withFileTypes: true });
  const songs = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!AUDIO_EXTENSIONS.has(ext)) continue;

    const fullPath = path.join(allowedRoot, entry.name);

    let title = entry.name;
    let artist = 'Unknown Artist';
    let duration = 0;
    let picture = null;

    try {
      const meta = await parseFile(fullPath, { duration: true });
      title = meta.common.title || title;
      artist = meta.common.artist || artist;
      duration = meta.format.duration || 0;
      if (meta.common.picture && meta.common.picture.length > 0) {
        const pic = meta.common.picture[0];
        picture = `data:${pic.format};base64,${pic.data.toString('base64')}`;
      }
    } catch (err) {
      // Corrupt/unsupported tag data — skip metadata, still list the file.
      console.warn('Could not read metadata for', fullPath, err.message);
    }

    songs.push({
      title,
      artist,
      duration,
      picture,
      // Renderer never sees the raw filesystem path — only this safe protocol URL.
      src: `pixel-player://${encodeURIComponent(fullPath)}`,
    });
  }

  return songs;
});
