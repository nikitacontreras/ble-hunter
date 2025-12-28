const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let bluetoothDeviceCallback = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#0f172a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Remove menu bar for production look (disables easy access to DevTools via menu)
    mainWindow.setMenuBarVisibility(false);
    // mainWindow.webContents.openDevTools(); // Disabled for production

    // Bluetooth Handler
    mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
        event.preventDefault(); // Prevent default behavior

        // Check if we effectively found devices
        // console.log('Devices found:', deviceList);

        bluetoothDeviceCallback = callback;

        // Send list to renderer to show in UI
        mainWindow.webContents.send('bt-device-list', deviceList);
    });
}

// IPC Handling for device selection
ipcMain.on('bt-device-selected', (event, deviceId) => {
    if (bluetoothDeviceCallback) {
        bluetoothDeviceCallback(deviceId);
        bluetoothDeviceCallback = null;
    }
});

ipcMain.on('bt-cancel-selection', (event) => {
    if (bluetoothDeviceCallback) {
        bluetoothDeviceCallback(''); // Empty string cancels
        bluetoothDeviceCallback = null;
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
