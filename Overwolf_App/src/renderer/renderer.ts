declare const wyksync: {
  onStatusUpdate: (callback: (status: string) => void) => void;
  onLogMessage: (callback: (...args: any[]) => void) => void;
  getInfo: () => Promise<any>;
  setFeatures: () => Promise<boolean>;
  sendTeamConfig: (config: {
    teamA?: { name?: string; logo?: string };
    teamB?: { name?: string; logo?: string };
  }) => Promise<boolean>;
  sendMapPoolConfig: (config: {
    format: number;
    maps: Array<{ name: string; scoreA: number; scoreB: number; isCurrent: boolean }>;
  }) => Promise<boolean>;
};

const statusEl = document.getElementById('status') as HTMLDivElement;
const logEl = document.getElementById('log') as HTMLDivElement;
const btnInfo = document.getElementById('btn-info') as HTMLButtonElement;
const btnFeatures = document.getElementById('btn-features') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
const btnApply = document.getElementById('btn-apply') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const confirmMsg = document.getElementById('confirm-msg') as HTMLDivElement;

function updateStatus(status: string): void {
  statusEl.textContent = status;
  statusEl.classList.remove('connected', 'waiting', 'error');
  if (status.toLowerCase().includes('connected') || status.toLowerCase().includes('started')) {
    statusEl.classList.add('connected');
  } else if (status.toLowerCase().includes('error') || status.toLowerCase().includes('failed')) {
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
        try { return JSON.stringify(a); } catch { return String(a); }
      }
      return String(a);
    }).join(' ');
  }
  entry.innerHTML = `<span class="time">${time}</span>${text}`;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

function clearLog(): void { logEl.innerHTML = ''; }

function showConfirm(msg: string): void {
  confirmMsg.textContent = msg;
  setTimeout(() => { confirmMsg.textContent = ''; }, 3000);
}

wyksync.onStatusUpdate(updateStatus);
wyksync.onLogMessage(addLog);

// --- Best-of format handling ---
const boFormatEl = document.getElementById('bo-format') as HTMLSelectElement;

function getBoCount(): number {
  return parseInt(boFormatEl.value, 10) || 3;
}

function updateMapVisibility(): void {
  const count = getBoCount();
  for (let i = 1; i <= 5; i++) {
    const col = document.getElementById(`map-col-${i}`);
    if (!col) continue;
    if (i <= count) {
      col.classList.remove('map-col-hidden');
    } else {
      col.classList.add('map-col-hidden');
    }
  }
}

boFormatEl.addEventListener('change', updateMapVisibility);
updateMapVisibility(); // init on load

// Collect map pool data from the UI
function collectMapPool(): { format: number; maps: Array<{ name: string; scoreA: number; scoreB: number; isCurrent: boolean }> } {
  const count = getBoCount();
  const maps: Array<{ name: string; scoreA: number; scoreB: number; isCurrent: boolean }> = [];
  for (let i = 1; i <= count; i++) {
    const name = (document.getElementById(`map-${i}`) as HTMLSelectElement).value;
    const scoreA = parseInt((document.getElementById(`map-${i}-score-a`) as HTMLInputElement).value, 10) || 0;
    const scoreB = parseInt((document.getElementById(`map-${i}-score-b`) as HTMLInputElement).value, 10) || 0;
    const isCurrent = (document.getElementById(`map-${i}-current`) as HTMLInputElement).checked;
    maps.push({ name, scoreA, scoreB, isCurrent });
  }
  return { format: count, maps };
}

// Apply button — push team config + map pool to overlay via WS
btnApply.addEventListener('click', async () => {
  const nameA = (document.getElementById('name-a') as HTMLInputElement).value.trim();
  const logoA = (document.getElementById('logo-a') as HTMLInputElement).value.trim();
  const nameB = (document.getElementById('name-b') as HTMLInputElement).value.trim();
  const logoB = (document.getElementById('logo-b') as HTMLInputElement).value.trim();

  const teamConfig = {
    teamA: { name: nameA || undefined, logo: logoA || undefined },
    teamB: { name: nameB || undefined, logo: logoB || undefined },
  };

  const mapPoolConfig = collectMapPool();

  try {
    await wyksync.sendTeamConfig(teamConfig);
    await wyksync.sendMapPoolConfig(mapPoolConfig);
    showConfirm('✓ Applied to overlay');
    addLog('Team config sent', teamConfig);
    addLog('Map pool sent', mapPoolConfig);
  } catch (e) {
    showConfirm('✕ Failed — is the app running?');
    addLog('Error sending config:', e);
  }
});

// Reset button — clear form and reset overlay to defaults
btnReset.addEventListener('click', async () => {
  ['name-a', 'logo-a', 'name-b', 'logo-b'].forEach(id => {
    (document.getElementById(id) as HTMLInputElement).value = '';
  });
  // Clear all 5 map pool inputs
  for (let i = 1; i <= 5; i++) {
    (document.getElementById(`map-${i}`) as HTMLSelectElement).value = '';
    (document.getElementById(`map-${i}-score-a`) as HTMLInputElement).value = '0';
    (document.getElementById(`map-${i}-score-b`) as HTMLInputElement).value = '0';
    (document.getElementById(`map-${i}-current`) as HTMLInputElement).checked = false;
  }
  // Reset BO format to BO3
  boFormatEl.value = '3';
  updateMapVisibility();
  await wyksync.sendTeamConfig({ teamA: { name: '', logo: '' }, teamB: { name: '', logo: '' } });
  await wyksync.sendMapPoolConfig({ format: 3, maps: [] });
  showConfirm('✓ Reset to defaults');
});

btnInfo.addEventListener('click', async () => {
  try { const info = await wyksync.getInfo(); addLog('Game Info:', info); }
  catch (e) { addLog('Error getting info:', e); }
});

btnFeatures.addEventListener('click', async () => {
  try { const result = await wyksync.setFeatures(); addLog('Set features result:', result); }
  catch (e) { addLog('Error setting features:', e); }
});

btnClear.addEventListener('click', clearLog);
addLog('WYKSync ready');