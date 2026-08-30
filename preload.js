const { contextBridge, ipcRenderer } = require('electron');

// contextIsolation is on, so the renderer (your pixel UI) only ever sees
// exactly these two functions — no Node, no fs, no raw IPC access.
contextBridge.exposeInMainWorld('library', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  scanLibrary: () => ipcRenderer.invoke('scan-library'),
});
contextBridge.exposeInMainWorld('jamendo', {
  init: () => ipcRenderer.invoke('init-jamendo'),
  search: (query) => ipcRenderer.invoke('jamendo-search', query),
  trending: () => ipcRenderer.invoke('jamendo-trending'),
});