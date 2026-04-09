/* 
 *  FILE          : renderer.ts
 *  PROJECT       : SENG3221 - WYKSync
 *  PROGRAMMER    : Ygnacio Maza, Krystin Theoret, Will Lee
 *  DATE          : 2026-08-04
 *  DESCRIPTION   :
 *    Renderer process script for the Electron control window. Manages
 *    UI event handlers for team config, tournament API fetching, map
 *    pool selection, and sends configuration to the overlay via IPC.
 */

declare const wyksync: {
  onStatusUpdate: (callback: (status: string) => void) => void;
  onLogMessage: (callback: (...args: any[]) => void) => void;
  getInfo: () => Promise<any>;
  setFeatures: () => Promise<boolean>;
  sendTeamConfig: (config: {
    teamA?: { name?: string; logo?: string };
    teamB?: { name?: string; logo?: string };
    startingSide?: string;
  }) => Promise<boolean>;
  fetchMatchConfig: (apiUrl: string) => Promise<{
    success: boolean;
    match?: any;
    error?: string;
  }>;
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

// Fetch elements
const apiUrlInput = document.getElementById('api-url') as HTMLInputElement;
const btnFetch = document.getElementById('btn-fetch') as HTMLButtonElement;
const fetchStatus = document.getElementById('fetch-status') as HTMLDivElement;
const fetchDetailArea = document.getElementById('fetch-detail-area') as HTMLDivElement;
const fetchDetailList = document.getElementById('fetch-detail-list') as HTMLDivElement;

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

// ── Match Code Fetch ─────────────────────────────────────────
function setFetchStatus(msg: string, type: 'success' | 'error' | 'loading'): void {
  fetchStatus.textContent = msg;
  fetchStatus.className = 'fetch-status ' + type;
}

btnFetch.addEventListener('click', async () => {
  const apiUrl = apiUrlInput.value.trim();

  if (!apiUrl) {
    setFetchStatus('Enter an API URL', 'error');
    return;
  }

  btnFetch.disabled = true;
  setFetchStatus('Fetching...', 'loading');
  fetchDetailArea.style.display = 'none';

  try {
    const result = await wyksync.fetchMatchConfig(apiUrl);

    if (!result.success) {
      setFetchStatus('✕ ' + (result.error || 'Fetch failed'), 'error');
      addLog('Match fetch failed:', result.error);
      btnFetch.disabled = false;
      return;
    }

    const match = result.match;
    setFetchStatus('✓ Data loaded — review fields below, then click Apply', 'success');
    addLog('Overlay data fetched:', match);

    // Auto-fill team name fields
    if (match.teamA) {
      (document.getElementById('name-a') as HTMLInputElement).value = match.teamA.name || '';
      (document.getElementById('logo-a') as HTMLInputElement).value = match.teamA.logo || '';
    }
    if (match.teamB) {
      (document.getElementById('name-b') as HTMLInputElement).value = match.teamB.name || '';
      (document.getElementById('logo-b') as HTMLInputElement).value = match.teamB.logo || '';
    }

    // Auto-fill map pool selects from picks (ignoring bans)
    if (match.mapPool && Array.isArray(match.mapPool) && match.mapPool.length > 0) {
      const count = match.mapPool.length;

      // Set best-of format based on number of picked maps
      const validFormats = [1, 3, 5];
      const bestOf = validFormats.includes(count) ? count : (count <= 1 ? 1 : count <= 3 ? 3 : 5);
      boFormatEl.value = String(bestOf);
      updateMapVisibility();

      // Fill each map select with the picked map
      for (let i = 0; i < count && i < 5; i++) {
        const mapName = match.mapPool[i];
        const sel = document.getElementById(`map-${i + 1}`) as HTMLSelectElement;
        if (sel) {
          // Find matching option (case-insensitive)
          const opts = Array.from(sel.options);
          const matchOpt = opts.find(o => o.value.toLowerCase() === mapName.toLowerCase());
          if (matchOpt) {
            sel.value = matchOpt.value;
          } else {
            sel.value = mapName; // try direct set
          }
        }
        // Reset scores for picked maps
        (document.getElementById(`map-${i + 1}-score-a`) as HTMLInputElement).value = '0';
        (document.getElementById(`map-${i + 1}-score-b`) as HTMLInputElement).value = '0';
      }

      // Mark first map as current by default
      const firstRadio = document.getElementById('map-1-current') as HTMLInputElement;
      if (firstRadio) firstRadio.checked = true;
    }

    // Build detail display: show picks and bans
    fetchDetailArea.style.display = 'block';
    let detailHtml = '';

    // Show picks
    if (match.mapPool && match.mapPool.length > 0) {
      detailHtml += '<div class="fetch-section-label">PICKS (Map Pool)</div><div class="fetch-tags">';
      detailHtml += match.mapPool.map((m: string) => `<span class="map-tag pick">${m}</span>`).join('');
      if (match.bestOf) {
        detailHtml += `<span class="best-of-tag">Bo${match.bestOf}</span>`;
      }
      detailHtml += '</div>';
    }

    // Show bans
    if (match.bans && match.bans.length > 0) {
      detailHtml += '<div class="fetch-section-label">BANS</div><div class="fetch-tags">';
      detailHtml += match.bans.map((b: any) => `<span class="map-tag ban">${b.map} <small>(${b.banned_by})</small></span>`).join('');
      detailHtml += '</div>';
    }

    fetchDetailList.innerHTML = detailHtml;
  } catch (e: any) {
    setFetchStatus('✕ ' + (e.message || 'Unknown error'), 'error');
    addLog('Match fetch error:', e);
  }

  btnFetch.disabled = false;
});

// Allow Enter key to trigger fetch
apiUrlInput.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter') btnFetch.click();
});

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
btnApply.addEventListener('click', async () => {
  const nameA = (document.getElementById('name-a') as HTMLInputElement).value.trim();
  const logoA = (document.getElementById('logo-a') as HTMLInputElement).value.trim();
  const nameB = (document.getElementById('name-b') as HTMLInputElement).value.trim();
  const logoB = (document.getElementById('logo-b') as HTMLInputElement).value.trim();
  const startingSide = (document.getElementById('starting-side') as HTMLSelectElement).value;

  const teamConfig = {
    teamA: { name: nameA || undefined, logo: logoA || undefined },
    teamB: { name: nameB || undefined, logo: logoB || undefined },
    startingSide,
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
  // Reset starting side
  (document.getElementById('starting-side') as HTMLSelectElement).value = 'a';
  await wyksync.sendTeamConfig({ teamA: { name: '', logo: '' }, teamB: { name: '', logo: '' }, startingSide: 'a' });
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