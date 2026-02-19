declare const wyksync: {
  onStatusUpdate: (callback: (status: string) => void) => void;
  onLogMessage: (callback: (...args: any[]) => void) => void;
  getInfo: () => Promise<any>;
  setFeatures: () => Promise<boolean>;
};

const statusEl = document.getElementById('status') as HTMLDivElement;
const logEl = document.getElementById('log') as HTMLDivElement;
const btnInfo = document.getElementById('btn-info') as HTMLButtonElement;
const btnFeatures = document.getElementById('btn-features') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

function updateStatus(status: string): void {
  statusEl.textContent = status;

  statusEl.classList.remove('connected', 'waiting', 'error');

  if (status.toLowerCase().includes('connected') ||
      status.toLowerCase().includes('started')) {
    statusEl.classList.add('connected');
  } else if (status.toLowerCase().includes('error') ||
             status.toLowerCase().includes('failed')) {
    statusEl.classList.add('error');
  } else {
    statusEl.classList.add('waiting');
  }
}

function addLog(message: string, ...args: any[]): void {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';

  let text = message;
  if (args.length > 0) {
    text += ' ' + args.map(a => {
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    }).join(' ');
  }

  entry.innerHTML = `<span class="time">${time}</span>${text}`;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

function clearLog(): void {
  logEl.innerHTML = '';
}

wyksync.onStatusUpdate(updateStatus);
wyksync.onLogMessage(addLog);

btnInfo.addEventListener('click', async () => {
  try {
    const info = await wyksync.getInfo();
    addLog('Game Info:', info);
  } catch (e) {
    addLog('Error getting info:', e);
  }
});

btnFeatures.addEventListener('click', async () => {
  try {
    const result = await wyksync.setFeatures();
    addLog('Set features result:', result);
  } catch (e) {
    addLog('Error setting features:', e);
  }
});

btnClear.addEventListener('click', clearLog);

addLog('WYKSync ready');