const { contextBridge, ipcRenderer } = require('electron');

// contextIsolation is on, so the renderer (your pixel UI) only ever sees
// exactly these two functions — no Node, no fs, no raw IPC access.
contextBridge.exposeInMainWorld('library', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  scanLibrary: () => ipcRenderer.invoke('scan-library'),
});
