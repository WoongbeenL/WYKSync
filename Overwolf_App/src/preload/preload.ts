const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wyksync', {
  onStatusUpdate: (callback: (status: string) => void) => {
    ipcRenderer.on('status-update', (e, status) => callback(status));
  },

  onLogMessage: (callback: (...args: any[]) => void) => {
    ipcRenderer.on('log-message', (e, ...args) => callback(...args));
  },

  getInfo: () => ipcRenderer.invoke('get-info'),

  setFeatures: () => ipcRenderer.invoke('set-features'),

  // Send team logo/name config to overlay via WebSocket broadcast
  sendTeamConfig: (config: { teamA?: { name?: string; logo?: string }; teamB?: { name?: string; logo?: string } }) =>
    ipcRenderer.invoke('send-team-config', config),
});

console.log('[Preload] WYKSync bridge ready');