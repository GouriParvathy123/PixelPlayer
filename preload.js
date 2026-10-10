const { contextBridge, ipcRenderer } = require('electron');

// contextIsolation is on, so the renderer (your pixel UI) only ever sees
// exactly these two functions — no Node, no fs, no raw IPC access.
contextBridge.exposeInMainWorld('library', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  scanLibrary: () => ipcRenderer.invoke('scan-library'),
  artworkColor: (imageUrl) => ipcRenderer.invoke('artwork-dominant-color', imageUrl),
});
contextBridge.exposeInMainWorld('jamendo', {
  init: () => ipcRenderer.invoke('init-jamendo'),
  search: (query) => ipcRenderer.invoke('jamendo-search', query),
  trending: () => ipcRenderer.invoke('jamendo-trending'),
});
contextBridge.exposeInMainWorld('spotify', {
  isConfigured: () => ipcRenderer.invoke('spotify-configured'),
  connect: () => ipcRenderer.invoke('spotify-connect'),
  cancelConnect: () => ipcRenderer.invoke('spotify-cancel-connect'),
  profile: () => ipcRenderer.invoke('spotify-profile'),
  accessToken: () => ipcRenderer.invoke('spotify-access-token'),
  likedTracks: () => ipcRenderer.invoke('spotify-liked-tracks'),
  playlists: () => ipcRenderer.invoke('spotify-playlists'),
  playlistTracks: (playlistId) => ipcRenderer.invoke('spotify-playlist-tracks', playlistId),
  search: (query, offset = 0) => ipcRenderer.invoke('spotify-search', query, offset),
  transferPlayback: (deviceId) => ipcRenderer.invoke('spotify-transfer-playback', deviceId),
  availableDevices: () => ipcRenderer.invoke('spotify-available-devices'),
  openTrack: (trackUri) => ipcRenderer.invoke('spotify-open-track', trackUri),
  playbackState: () => ipcRenderer.invoke('spotify-playback-state'),
  pausePlayback: (deviceId) => ipcRenderer.invoke('spotify-pause-playback', deviceId),
  seekPlayback: (positionMs, deviceId) => ipcRenderer.invoke('spotify-seek-playback', { positionMs, deviceId }),
  skipPlayback: (direction, deviceId) => ipcRenderer.invoke('spotify-skip-playback', { direction, deviceId }),
  setPlaybackVolume: (volume, deviceId) => ipcRenderer.invoke('spotify-set-playback-volume', { volume, deviceId }),
  startPlayback: (uri, deviceId) => ipcRenderer.invoke('spotify-start-playback', { uri, deviceId }),
  disconnect: () => ipcRenderer.invoke('spotify-disconnect'),
});
