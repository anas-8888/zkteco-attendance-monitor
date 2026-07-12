const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('nexaDesktop', {
    platform: process.platform,
});

