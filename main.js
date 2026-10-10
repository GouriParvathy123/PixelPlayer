const JamendoProvider = require('./js/jamendo-provider');
const { SpotifyProvider } = require('./js/spotify-provider');
require('dotenv').config();

let jamendo = null;
let spotify = null;

const { app, BrowserWindow, ipcMain, dialog, protocol, net, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('node:http');
const { parseFile } = require('music-metadata');

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac']);

// The only folder the app is allowed to read from during a session.
// Set once, after the user explicitly picks a folder — never wider than that.
let allowedRoot = null;
let appStaticServer = null;

const STATIC_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function startLocalAppServer() {
  if (appStaticServer) return Promise.resolve(`http://127.0.0.1:${appStaticServer.address().port}/`);

  appStaticServer = http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end('Method not allowed');
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }

    if (pathname === '/') pathname = '/index.html';
    const relativePath = pathname.replace(/^[/\\]+/, '');
    const requestedPath = path.resolve(__dirname, relativePath);
    const projectRoot = path.resolve(__dirname);
    const insideProject = requestedPath === projectRoot || requestedPath.startsWith(projectRoot + path.sep);
    const hiddenPath = relativePath.split(/[\\/]/).some(part => part.startsWith('.'));
    const extension = path.extname(requestedPath).toLowerCase();
    const privateSourceFile = new Set([
      'main.js',
      'preload.js',
      'js/spotify-provider.js',
      'package.json',
      'package-lock.json',
    ]).has(relativePath.replace(/\\/g, '/'));

    if (!insideProject || hiddenPath || privateSourceFile || !STATIC_MIME_TYPES[extension]) {
      response.writeHead(404).end('Not found');
      return;
    }

    fs.stat(requestedPath, (statError, stats) => {
      if (statError || !stats.isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }

      response.writeHead(200, {
        'Content-Type': STATIC_MIME_TYPES[extension],
        'Content-Length': stats.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      fs.createReadStream(requestedPath).pipe(response);
    });
  });

  return new Promise((resolve, reject) => {
    appStaticServer.once('error', reject);
    appStaticServer.listen(0, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${appStaticServer.address().port}/`);
    });
  });
}

function isPathInsideAllowedRoot(candidatePath) {
  if (!allowedRoot) return false;
  const resolved = path.resolve(candidatePath);
  const rootResolved = path.resolve(allowedRoot);
  return resolved === rootResolved || resolved.startsWith(rootResolved + path.sep);
}

function createWindow(appUrl) {
  const win = new BrowserWindow({
    // The room scene is composed as a wide, desktop-first experience.
    // Starting at 16:9 keeps the sidebar, scene, queue and player from
    // collapsing into one another on first launch.
    width: 1600,
    height: 900,
    minWidth: 1180,
    minHeight: 700,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      // Security baseline: renderer never gets raw Node/filesystem access.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadURL(appUrl);
  // win.webContents.openDevTools(); // uncomment while developing
}

app.whenReady().then(async () => {
  spotify = new SpotifyProvider(
    process.env.SPOTIFY_CLIENT_ID,
    app.getPath('userData')
  );

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

  const appUrl = await startLocalAppServer();
  createWindow(appUrl);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(appUrl);
  });
});

app.on('before-quit', () => {
  appStaticServer?.close();
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

ipcMain.handle('artwork-dominant-color', async (_event, imageUrl) => {
  try {
    const url = new URL(String(imageUrl || ''));
    const artworkHostAllowed = url.hostname === 'i.scdn.co' ||
      url.hostname.endsWith('.scdn.co') ||
      url.hostname.endsWith('.spotifycdn.com') ||
      url.hostname === 'usercontent.jamendo.com';
    if (url.protocol !== 'https:' || !artworkHostAllowed) return null;

    const response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok || !/^image\//i.test(response.headers.get('content-type') || '')) return null;
    const declaredSize = Number(response.headers.get('content-length')) || 0;
    if (declaredSize > 8 * 1024 * 1024) return null;
    if (!response.body) return null;

    const reader = response.body.getReader();
    const chunks = [];
    let totalSize = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > 8 * 1024 * 1024) {
        await reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(value));
    }
    if (!totalSize) return null;

    const image = nativeImage.createFromBuffer(Buffer.concat(chunks, totalSize));
    if (image.isEmpty()) return null;
    // Return only a tiny data URL. The renderer samples it in canvas RGBA,
    // avoiding cross-origin canvas access and platform-specific bitmap order.
    return image.resize({ width: 16, height: 16 }).toDataURL();
  } catch (error) {
    console.warn('Could not read album artwork colors:', error.message);
    return null;
  }
});

// --- IPC: Initialize Jamendo Provider ---
ipcMain.handle('init-jamendo', async () => {
  const clientId = process.env.JAMENDO_CLIENT_ID;
  if (!clientId) {
    console.warn('JAMENDO_CLIENT_ID not set in .env');
    return { success: false, error: 'client_id not configured' };
  }

  jamendo = new JamendoProvider(clientId);
  return { success: true };
});

// --- IPC: Jamendo Search ---
ipcMain.handle('jamendo-search', async (event, query) => {
  if (!jamendo) {
    return { error: 'Jamendo not initialized. Call init first.' };
  }

  try {
    const results = await jamendo.search(query);
    return { results };
  } catch (error) {
    return { error: error.message };
  }
});

// --- IPC: Jamendo Trending ---
ipcMain.handle('jamendo-trending', async () => {
  if (!jamendo) {
    return { error: 'Jamendo not initialized. Call init first.' };
  }

  try {
    const results = await jamendo.trending();
    return { results };
  } catch (error) {
    return { error: error.message };
  }
});

// --- Spotify account playback ---
ipcMain.handle('spotify-configured', () => Boolean(spotify?.isConfigured()));

ipcMain.handle('spotify-connect', async () => {
  if (!spotify) return { success: false, error: 'Spotify is not ready yet.' };
  try {
    return await spotify.connect();
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('spotify-cancel-connect', () => {
  return spotify?.cancelConnect() || { success: true };
});

ipcMain.handle('spotify-profile', async () => {
  if (!spotify?.isConfigured()) return { profile: null };
  try {
    return { profile: await spotify.getProfile() };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('spotify-access-token', async () => {
  if (!spotify?.isConfigured()) throw new Error('Add SPOTIFY_CLIENT_ID to the project .env file first.');
  return spotify.getAccessToken();
});

ipcMain.handle('spotify-liked-tracks', async () => {
  if (!spotify?.isConfigured()) return { error: 'Add SPOTIFY_CLIENT_ID to the project .env file first.' };
  try {
    return { tracks: await spotify.getLikedTracks() };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('spotify-playlists', async () => {
  if (!spotify?.isConfigured()) return { error: 'Add SPOTIFY_CLIENT_ID to the project .env file first.' };
  try {
    return { playlists: await spotify.getPlaylists() };
  } catch (error) {
    return { error: error.message || 'Could not load Spotify playlists.' };
  }
});

ipcMain.handle('spotify-playlist-tracks', async (_event, playlistId) => {
  if (!spotify?.isConfigured()) return { error: 'Add SPOTIFY_CLIENT_ID to the project .env file first.' };
  try {
    return { tracks: await spotify.getPlaylistTracks(String(playlistId || '')) };
  } catch (error) {
    return { error: error.message || 'Could not load this Spotify playlist.' };
  }
});

ipcMain.handle('spotify-search', async (_event, query, offset) => {
  if (!spotify?.isConfigured()) return { error: 'Add SPOTIFY_CLIENT_ID to the project .env file first.' };
  try {
    return await spotify.searchTracks(String(query || '').trim(), Number(offset) || 0);
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('spotify-transfer-playback', async (_event, deviceId) => {
  if (!spotify) throw new Error('Spotify is not ready yet.');
  return spotify.transferPlayback(String(deviceId || ''));
});

ipcMain.handle('spotify-available-devices', async () => {
  if (!spotify) throw new Error('Spotify is not ready yet.');
  return spotify.getAvailableDevices();
});

ipcMain.handle('spotify-open-track', async (_event, trackUri) => {
  const uri = String(trackUri || '');
  const match = /^spotify:track:([A-Za-z0-9]+)$/.exec(uri);
  if (!match) throw new Error('This Spotify track link is invalid.');
  const webUrl = `https://open.spotify.com/track/${match[1]}`;
  try {
    await shell.openExternal(uri);
  } catch {
    await shell.openExternal(webUrl);
  }
  return { success: true };
});

ipcMain.handle('spotify-playback-state', async () => {
  if (!spotify) throw new Error('Spotify is not ready yet.');
  return spotify.getPlaybackState();
});

ipcMain.handle('spotify-pause-playback', async (_event, deviceId) => {
  if (!spotify) throw new Error('Spotify is not ready yet.');
  return spotify.pausePlayback(String(deviceId || ''));
});

ipcMain.handle('spotify-seek-playback', async (_event, { positionMs, deviceId } = {}) => {
  if (!spotify) throw new Error('Spotify is not ready yet.');
  return spotify.seekPlayback(Number(positionMs) || 0, String(deviceId || ''));
});

ipcMain.handle('spotify-skip-playback', async (_event, { direction, deviceId } = {}) => {
  if (!spotify) throw new Error('Spotify is not ready yet.');
  return spotify.skipPlayback(String(direction || 'next'), String(deviceId || ''));
});

ipcMain.handle('spotify-set-playback-volume', async (_event, { volume, deviceId } = {}) => {
  if (!spotify) throw new Error('Spotify is not ready yet.');
  return spotify.setPlaybackVolume(Number(volume) || 0, String(deviceId || ''));
});

ipcMain.handle('spotify-start-playback', async (_event, { uri, deviceId } = {}) => {
  if (!spotify) throw new Error('Spotify is not ready yet.');
  return spotify.startPlayback(String(uri || ''), String(deviceId || ''));
});

ipcMain.handle('spotify-disconnect', async () => {
  if (!spotify) return { success: true };
  return spotify.disconnect();
});
