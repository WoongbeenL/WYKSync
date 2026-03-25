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

<<<<<<< HEAD
  // Fetch match config from website API using a match code
  fetchMatchConfig: (matchCode: string, apiUrl: string) =>
    ipcRenderer.invoke('fetch-match-config', matchCode, apiUrl),
=======
  // Send map pool / series config to overlay via WebSocket broadcast
  sendMapPoolConfig: (config: { format: number; maps: Array<{ name: string; scoreA: number; scoreB: number; isCurrent: boolean }> }) =>
    ipcRenderer.invoke('send-map-pool-config', config),
>>>>>>> 28eeceefd66ffa61e20b67d5c4c02a49a71ef862
});

console.log('[Preload] WYKSync bridge ready');