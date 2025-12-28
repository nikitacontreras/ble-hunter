const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onDeviceList: (callback) => ipcRenderer.on('bt-device-list', callback),
    selectDevice: (deviceId) => ipcRenderer.send('bt-device-selected', deviceId),
    cancelSelection: () => ipcRenderer.send('bt-cancel-selection')
});
