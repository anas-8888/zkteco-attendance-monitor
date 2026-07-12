import electron from 'electron';

const { contextBridge } = electron;

contextBridge.exposeInMainWorld('nexaDesktop', {
    platform: process.platform,
});
