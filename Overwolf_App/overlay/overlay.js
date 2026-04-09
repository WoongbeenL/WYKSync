/* 
 *  FILE          : overlay.js
 *  PROJECT       : SENG3221 - WYKSync
 *  PROGRAMMER    : Ygnacio Maza, Krystin Theoret, Will Lee
 *  DATE          : 2026-08-04
 *  DESCRIPTION   :
 *    Client-side logic for the broadcast overlay. Handles WebSocket
 *    connection, game data rendering, player card generation, buy
 *    phase display, series tracker updates, and agent/weapon/shield
 *    asset lookups.
 */

// ========================================
// CONFIG
// ========================================
const CONFIG = { wsUrl: 'ws://localhost:8765' };

// ========================================
// AGENT IMAGE MAP
// ========================================
const AGENT_IMAGES = {
  jett: 'assets/agents/Jett.png',
  phoenix: 'assets/agents/Phoenix.png',
  sage: 'assets/agents/Sage.png',
  sova: 'assets/agents/Sova.png',
  brimstone: 'assets/agents/Brimstone.png',
  viper: 'assets/agents/Viper.png',
  omen: 'assets/agents/Omen.png',
  killjoy: 'assets/agents/Killjoy.png',
  cypher: 'assets/agents/Cypher.png',
  reyna: 'assets/agents/Reyna.png',
  raze: 'assets/agents/Raze.png',
  breach: 'assets/agents/Breach.png',
  skye: 'assets/agents/Skye.png',
  yoru: 'assets/agents/Yoru.png',
  astra: 'assets/agents/Astra.png',
  kayo: 'assets/agents/KAYO.png',
  chamber: 'assets/agents/Chamber.png',
  neon: 'assets/agents/Neon.png',
  fade: 'assets/agents/Fade.png',
  harbor: 'assets/agents/Harbor.png',
  gekko: 'assets/agents/Gekko.png',
  deadlock: 'assets/agents/Deadlock.png',
  iso: 'assets/agents/Iso.png',
  clove: 'assets/agents/Clove.png',
  vyse: 'assets/agents/Vyse.png',
  tejo: 'assets/agents/Tejo.png',
  waylay: 'assets/agents/Waylay.png',
};

const AGENT_FALLBACK_SVG = `<svg class="agent-fallback" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="14" stroke="#C9A84C" stroke-width="1.5" stroke-opacity="0.5"/><text x="18" y="22" text-anchor="middle" fill="#C9A84C" font-size="11" font-weight="bold" opacity="0.6">?</text></svg>`;

function agentHTML(name) {
  if (!name) return AGENT_FALLBACK_SVG;
  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  const entry = AGENT_IMAGES[key];
  if (entry) {
    return `<img src="${entry}" alt="${name}" 
          onerror="this.outerHTML='${AGENT_FALLBACK_SVG.replace(/'/g, "\\'").replace(/"/g, "'")}'">`;
  }
  return AGENT_FALLBACK_SVG;
}

// ========================================
// WEAPON IMAGE MAP
// ========================================
const WEAPON_IMAGES = {
  // Sidearms
  classic: 'assets/weapons/Classic.png',
  shorty: 'assets/weapons/Shorty.png',
  frenzy: 'assets/weapons/Frenzy.png',
  ghost: 'assets/weapons/Ghost.png',
  sheriff: 'assets/weapons/Sheriff.png',
  // SMGs
  stinger: 'assets/weapons/Stinger.png',
  spectre: 'assets/weapons/Spectre.png',
  // Shotguns
  bucky: 'assets/weapons/Bucky.png',
  judge: 'assets/weapons/Judge.png',
  // Rifles
  bulldog: 'assets/weapons/Bulldog.png',
  guardian: 'assets/weapons/Guardian.png',
  phantom: 'assets/weapons/Phantom.png',
  vandal: 'assets/weapons/Vandal.png',
  outlaw: 'assets/weapons/Outlaw.png',
  // Snipers
  marshal: 'assets/weapons/Marshal.png',
  operator: 'assets/weapons/Operator.png',
  // LMGs
  ares: 'assets/weapons/Ares.png',
  odin: 'assets/weapons/Odin.png',
  // Melee
  knife: 'assets/weapons/Melee.png',
  melee: 'assets/weapons/Melee.png',
};

// Look up weapon image
function weaponHTML(name) {
  if (!name || name === '-') return `<span class="wep-fallback">—</span>`;
  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  const entry = WEAPON_IMAGES[key];
  if (entry) {
    const base = entry.replace(/\.[^.]+$/, '');
    return `<img src="${base}.png" alt="${name}"
          onerror="this.onerror=function(){this.onerror=function(){this.style.display='none';this.nextSibling&&(this.nextSibling.style.display='')};this.src='${base}.webp'};this.src='${base}.jpg'"><span class="wep-fallback" style="display:none">${name}</span>`;
  }
  return `<span class="wep-fallback">${name}</span>`;
}

// Strip Riot ID tag 
function cleanName(raw) {
  if (!raw) return 'Unknown';
  return raw.split('#')[0];
}

// ========================================
// SHIELD ICONS
// ========================================
const SHIELD_FALLBACKS = {
  none: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3L4 7v5c0 5.25 3.4 10.15 8 11.25C16.6 22.15 20 17.25 20 12V7l-8-4z" stroke="#555" stroke-width="1.5" fill="none" opacity="0.3"/></svg>`,
  light: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3L4 7v5c0 5.25 3.4 10.15 8 11.25C16.6 22.15 20 17.25 20 12V7l-8-4z" stroke="#60a5fa" stroke-width="1.5" fill="rgba(96,165,250,0.15)"/></svg>`,
  regen: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3L4 7v5c0 5.25 3.4 10.15 8 11.25C16.6 22.15 20 17.25 20 12V7l-8-4z" stroke="#a855f7" stroke-width="1.5" fill="rgba(168,85,247,0.15)"/><path d="M12 8v8M8 12h8" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  full: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3L4 7v5c0 5.25 3.4 10.15 8 11.25C16.6 22.15 20 17.25 20 12V7l-8-4z" stroke="#60a5fa" stroke-width="1.5" fill="rgba(96,165,250,0.3)"/></svg>`,
};

function shieldHTML(shield, shieldType) {
  // API shield codes: 0 = none, 1 = light, 2 = heavy, 4 = regen
  const codeToTier = { 0: 'none', 1: 'light', 2: 'full', 4: 'regen' };
  const tier = codeToTier[shield] || 'none';

  const shieldFileMap = { none: null, light: 'Light_Armor', regen: 'Regen_Shield', full: 'Heavy_Armor' };
  const shieldFile = shieldFileMap[tier];
  if (!shieldFile) return SHIELD_FALLBACKS[tier];
  const imgPath = 'assets/shields/' + shieldFile + '.png';
  const fallback = SHIELD_FALLBACKS[tier];
  return `<img src="${imgPath}" alt="${tier}" onerror="this.outerHTML='${fallback.replace(/'/g, "\\'").replace(/"/g, "'")}'">`;
}

// ========================================
// ULT DISPLAY
// ========================================
const ULT_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.8"/></svg>`;
const ULT_READY_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" stroke="#C9A84C" stroke-width="1.5" fill="#C9A84C"/></svg>`;

function ultDisplayHTML(p) {
  const pts = p.ultPoints ?? 0;
  const max = p.ultMax ?? 0;
  const ready = pts >= max && max > 0;

  if (ready) {
    return `<span class="p-ult-ready">${ULT_READY_SVG} ULT</span>`;
  }

  let pips = '';
  for (let i = 0; i < max; i++) {
    pips += `<span class="p-ult-pip ${i < pts ? 'filled' : ''}"></span>`;
  }
  return `<span class="p-ult-area"><span class="p-ult-icon">${ULT_ICON_SVG}</span><span class="p-ult-pips">${pips}</span></span>`;
}

// ========================================
// DOM
// ========================================
const el = {
  stateBanner: document.getElementById('state-banner'),
  topbar: document.getElementById('topbar'),
  scoreA: document.getElementById('t-score-a'),
  scoreB: document.getElementById('t-score-b'),
  nameA: document.getElementById('t-name-a'),
  nameB: document.getElementById('t-name-b'),
  sideA: document.getElementById('t-side-a'),
  sideB: document.getElementById('t-side-b'),
  round: document.getElementById('t-round'),
  seriesTracker: document.getElementById('series-tracker'),
  phase: document.getElementById('phase-banner'),
  phaseText: document.getElementById('phase-text'),
  topBarLine: document.getElementById('top-bar-line'),
  pLeft: document.getElementById('players-left'),
  pRight: document.getElementById('players-right'),
  // Buy phase overlay
  buyOverlay: document.getElementById('buy-phase-overlay'),
  buyTeamLeft: document.getElementById('buy-team-left'),
  buyTeamRight: document.getElementById('buy-team-right'),
  buyNameA: document.getElementById('buy-name-a'),
  buyNameB: document.getElementById('buy-name-b'),

  buyLogoA: document.getElementById('buy-logo-a'),
  buyLogoB: document.getElementById('buy-logo-b'),
};


// ========================================
// WEBSOCKET
// ========================================
let ws = null, gameData = null;
let buyPhaseActive = false;
let buyFadeTimeout = null;
let needsCardIntro = true; // true when player cards need entrance animation
let mapPoolData = null; // { maps: [{ name, scoreA, scoreB, isCurrent }] }
let startingSide = 'a'; // which team starts on attack: 'a' or 'b'

function connect() {
  ws = new WebSocket(CONFIG.wsUrl);
  ws.onopen = () => { };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'game-data') { gameData = msg.data; render(); }
      else if (msg.type === 'team-config') { applyTeamConfig(msg.config); }
      else if (msg.type === 'map-pool-config') { applyMapPoolConfig(msg.config); }
    } catch (err) { console.error(err); }
  };
  ws.onclose = () => { setTimeout(connect, 3000); };
  ws.onerror = () => { };
}

// Apply team config pushed from the Overwolf app renderer
function applyTeamConfig(cfg) {
  if (!cfg) return;
  if (cfg.teamA) {
    if (cfg.teamA.name !== undefined && cfg.teamA.name !== '') {
      el.nameA.textContent = cfg.teamA.name;
    }
    if (cfg.teamA.logo !== undefined) {
      setLogo('a', cfg.teamA.logo);
    }
  }
  if (cfg.teamB) {
    if (cfg.teamB.name !== undefined && cfg.teamB.name !== '') {
      el.nameB.textContent = cfg.teamB.name;
    }
    if (cfg.teamB.logo !== undefined) {
      setLogo('b', cfg.teamB.logo);
    }
  }
  // Starting side config
  if (cfg.startingSide) {
    startingSide = cfg.startingSide; // 'a' or 'b'
  }
  // Map pool / series info
  if (cfg.mapPool && Array.isArray(cfg.mapPool) && cfg.mapPool.length > 0) {
    const seriesEl = document.getElementById('series-maps');
    if (seriesEl) {
      const bestOfLabel = cfg.bestOf ? `<span class="series-bo">Bo${cfg.bestOf}</span>` : '';
      const mapTags = cfg.mapPool.map(m =>
        `<span class="series-map-tag">${m}</span>`
      ).join('');
      seriesEl.innerHTML = bestOfLabel + mapTags;
      seriesEl.style.display = 'flex';
    }
  }
}

function setLogo(team, url) {
  const img = document.getElementById('logo-img-' + team);
  const ph = document.getElementById('logo-ph-' + team);
  if (url) {
    img.src = url;
    img.style.display = 'block';
    ph.style.display = 'none';
    img.onerror = () => { img.style.display = 'none'; ph.style.display = ''; };
  } else {
    img.style.display = 'none';
    ph.style.display = '';
  }
}

// Apply map pool config pushed from the Overwolf app renderer
function applyMapPoolConfig(cfg) {
  if (!cfg) { mapPoolData = null; return; }
  mapPoolData = cfg;
  // Re-render immediately if we already have game data
  if (gameData) render();
}

// Render the series tracker (1, 3, or 5 slots based on format)
function renderSeriesTracker() {
  if (!mapPoolData || !mapPoolData.maps) return;
  const format = mapPoolData.format || mapPoolData.maps.length || 3;
  const currentGameMap = (gameData?.map || '').toLowerCase();

  for (let i = 0; i < 5; i++) {
    const slot = document.getElementById('series-slot-' + i);
    const nameEl = document.getElementById('series-name-' + i);
    const scoreEl = document.getElementById('series-score-' + i);
    if (!slot) continue;

    // Show/hide based on format
    if (i < format) {
      slot.style.display = '';
    } else {
      slot.style.display = 'none';
      continue;
    }

    const mapEntry = mapPoolData.maps[i];

    if (!mapEntry || !mapEntry.name) {
      // Empty slot
      slot.className = 'series-map-slot';
      nameEl.textContent = '—';
      scoreEl.style.display = 'none';
      // Remove any LIVE tag
      const existingTag = slot.querySelector('.series-live-tag');
      if (existingTag) existingTag.remove();
      continue;
    }

    nameEl.textContent = mapEntry.name;

    // Only show score if at least one value was entered (non-zero)
    const hasEnteredScore = (mapEntry.scoreA && mapEntry.scoreA > 0) || (mapEntry.scoreB && mapEntry.scoreB > 0);
    if (hasEnteredScore) {
      scoreEl.style.display = '';
      scoreEl.querySelector('.series-score-a').textContent = mapEntry.scoreA ?? 0;
      scoreEl.querySelector('.series-score-b').textContent = mapEntry.scoreB ?? 0;
    } else {
      scoreEl.style.display = 'none';
    }

    // Determine if this is the current map
    const isCurrentByFlag = mapEntry.isCurrent;
    const isCurrentByGame = currentGameMap && mapEntry.name.toLowerCase() === currentGameMap;
    const isCurrent = isCurrentByFlag || isCurrentByGame;

    // Determine if completed (has a decisive score and is not current)
    const hasScore = (mapEntry.scoreA > 0 || mapEntry.scoreB > 0);
    const isCompleted = hasScore && !isCurrent && (mapEntry.scoreA >= 13 || mapEntry.scoreB >= 13);

    slot.className = 'series-map-slot' + (isCurrent ? ' current' : '') + (isCompleted ? ' completed' : '');

    // LIVE tag management
    let liveTag = slot.querySelector('.series-live-tag');
    if (isCurrent) {
      if (!liveTag) {
        liveTag = document.createElement('div');
        liveTag.className = 'series-live-tag';
        liveTag.textContent = 'LIVE';
        slot.appendChild(liveTag);
      }
    } else {
      if (liveTag) liveTag.remove();
    }
  }
}


// ========================================
// RENDER
// ========================================
function render() {
  if (!gameData) return;
  const state = gameData.gameState || 'unknown';



  // State banner
  el.stateBanner.className = 'state-banner visible ' + state;
  el.stateBanner.textContent = fmtState(state);

  if (state === 'in_game') {
    el.topbar.classList.add('visible');
    el.topBarLine.classList.add('visible');

    // Scores
    el.scoreA.textContent = gameData.score?.team0 ?? 0;
    el.scoreB.textContent = gameData.score?.team1 ?? 0;
    el.round.textContent = gameData.roundNumber || 0;

    // Series tracker
    if (mapPoolData && mapPoolData.maps && mapPoolData.maps.length > 0) {
      el.seriesTracker.classList.add('visible');
      renderSeriesTracker();
    } else {
      el.seriesTracker.classList.remove('visible');
    }

    // Attack / Defense side labels
    // startingSide tells us which configured team starts on attack.
    // Game's attackingTeam (0 or 1) tells us the current attacker index.
    // If startingSide is 'a', team A = game team 0 starts ATK.
    // If startingSide is 'b', team B = game team 1 starts ATK (labels flip).
    const atkTeam = gameData.attackingTeam;
    const aIsAtk = startingSide === 'a' ? (atkTeam === 0) : (atkTeam === 1);
    if (atkTeam === 0 || atkTeam === 1) {
      el.sideA.textContent = aIsAtk ? 'ATK' : 'DEF';
      el.sideB.textContent = aIsAtk ? 'DEF' : 'ATK';
    } else {
      el.sideA.textContent = '';
      el.sideB.textContent = '';
    }

    // Phase
    const ph = gameData.roundPhase || '';
    if (ph) { el.phaseText.textContent = fmtPhase(ph); el.phase.classList.add('visible'); }
    else { el.phase.classList.remove('visible'); }

    // Buy Phase Overlay
    const phLower = ph.toLowerCase();
    if (phLower === 'buy' || phLower === 'shopping') {
      showBuyPhase();
    } else if (buyPhaseActive && (phLower === 'combat' || phLower === 'playing')) {
      hideBuyPhase(true); // fade out
    } else if (buyPhaseActive) {
      hideBuyPhase(false); // instant hide
    }

    renderPlayers();
  } else {
    el.topbar.classList.remove('visible');
    el.topBarLine.classList.remove('visible');
    el.phase.classList.remove('visible');
    el.seriesTracker.classList.remove('visible');
    el.pLeft.innerHTML = '';
    el.pRight.innerHTML = '';
    if (buyPhaseActive) hideBuyPhase(false);
  }
}

function fmtState(s) {
  const m = { menu: 'Main Menu', agent_select: 'Agent Select', loading: 'Loading…', in_game: '', closed: 'Game Closed' };
  return m[s] ?? s.replace(/_/g, ' ').toUpperCase();
}
function fmtPhase(p) {
  const m = { buy: 'BUY PHASE', shopping: 'BUY PHASE', combat: 'COMBAT', playing: 'COMBAT', end: 'ROUND END', over: 'ROUND END', freeze: 'FREEZE TIME' };
  return m[p.toLowerCase()] ?? p.toUpperCase();
}

function fmtMap(raw) {
  if (!raw) return '—';
  const names = {
    ascent: 'Ascent', bind: 'Bind', breeze: 'Breeze', fracture: 'Fracture',
    haven: 'Haven', icebox: 'Icebox', lotus: 'Lotus', pearl: 'Pearl',
    split: 'Split', sunset: 'Sunset', abyss: 'Abyss', range: 'Range'
  };
  return names[raw.toLowerCase()] || raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ========================================
// PLAYER CARDS
// ========================================
function renderPlayers() {
  if (!gameData.players) return;
  const t0 = gameData.players.filter(p => p.team === 0);
  const t1 = gameData.players.filter(p => p.team === 1);
  const obs = gameData.observing || '';

  const phase = (gameData.roundPhase || '').toLowerCase();
  const isBuy = phase === 'buy' || phase === 'shopping';
  el.pLeft.innerHTML = t0.map(p => card(p, obs, 'left', isBuy)).join('');
  el.pRight.innerHTML = t1.map(p => card(p, obs, 'right', isBuy)).join('');

  if (needsCardIntro) {
    // Staggered entrance animation (only on first show / after buy phase)
    document.querySelectorAll('.p-card').forEach((c, i) => setTimeout(() => c.classList.add('show'), i * 40));
    needsCardIntro = false;
  } else {
    // Already visible — add .show immediately, no animation flicker
    document.querySelectorAll('.p-card').forEach(c => c.classList.add('show'));
  }
}

function card(p, obs, side, isBuy) {
  const dead = !p.isAlive;
  const hp = dead ? 0 : (p.health ?? 100);
  const pct = Math.min(100, (hp / 150) * 100);
  const hClass = pct >= 67 ? 'high' : pct >= 34 ? 'mid' : 'low';
  const isSpec = p.name && obs && p.name.includes(obs.split('#')[0]);

  const specTag = isSpec ? '<div class="spec-tag">SPECTATING</div>' : '';

  // Shield icon (replaces HP number)
  const shieldIcon = shieldHTML(p.shield || 0, p.shieldType);

  // Bottom-right: money during buy, ult progress during combat
  const bottomRight = isBuy
    ? `<span class="p-money">$${(p.money ?? 0).toLocaleString()}</span>`
    : ultDisplayHTML(p);

  return `<div class="p-card ${dead ? 'dead' : ''} ${isSpec ? 'spec' : ''}">
    ${specTag}
    <div class="p-agent">${agentHTML(p.agent)}</div>
    <div class="p-info">
      <div class="p-row">
        <span class="p-name">${cleanName(p.name)}${p.hasSpike ? '<span class="spike">SPIKE</span>' : ''}</span>
        <span class="p-shield">${shieldIcon}</span>
      </div>
      <div class="p-row" style="justify-content:center;">
        <div class="p-weapon">${weaponHTML(p.weapon)}</div>
      </div>
      <div class="p-row">
        <span class="p-kda"><b>${p.kills ?? 0}</b>/${p.deaths ?? 0}/${p.assists ?? 0}</span>
        ${bottomRight}
      </div>
    </div>
  </div>`;
}

// ========================================
// BUY PHASE OVERLAY
// ========================================
function showBuyPhase() {
  if (buyFadeTimeout) { clearTimeout(buyFadeTimeout); buyFadeTimeout = null; }
  buyPhaseActive = true;
  needsCardIntro = true; // cards will need entrance animation when combat starts
  el.buyOverlay.classList.remove('fade-out');
  el.buyOverlay.classList.add('visible');
  // Hide sideline player cards
  el.pLeft.classList.add('buy-hidden');
  el.pRight.classList.add('buy-hidden');
  renderBuyPhase();
}

function hideBuyPhase(fade) {
  if (buyFadeTimeout) { clearTimeout(buyFadeTimeout); buyFadeTimeout = null; }
  if (fade) {
    el.buyOverlay.classList.add('fade-out');
    buyFadeTimeout = setTimeout(() => {
      el.buyOverlay.classList.remove('visible', 'fade-out');
      buyPhaseActive = false;
      buyFadeTimeout = null;
      // Show sideline player cards again
      el.pLeft.classList.remove('buy-hidden');
      el.pRight.classList.remove('buy-hidden');
    }, 650);
  } else {
    el.buyOverlay.classList.remove('visible', 'fade-out');
    buyPhaseActive = false;
    // Show sideline player cards again
    el.pLeft.classList.remove('buy-hidden');
    el.pRight.classList.remove('buy-hidden');
  }
}

function renderBuyPhase() {
  if (!gameData || !gameData.players) return;

  const t0 = gameData.players.filter(p => p.team === 0);
  const t1 = gameData.players.filter(p => p.team === 1);

  // Update header names
  el.buyNameA.textContent = el.nameA.textContent || 'TEAM A';
  el.buyNameB.textContent = el.nameB.textContent || 'TEAM B';

  // Sync logos from top bar into buy phase panels
  const topLogoA = document.getElementById('logo-img-a');
  const topLogoB = document.getElementById('logo-img-b');
  if (topLogoA && topLogoA.style.display !== 'none' && topLogoA.src) {
    el.buyLogoA.innerHTML = `<img src="${topLogoA.src}" alt="">`;
  } else {
    el.buyLogoA.innerHTML = '';
  }
  if (topLogoB && topLogoB.style.display !== 'none' && topLogoB.src) {
    el.buyLogoB.innerHTML = `<img src="${topLogoB.src}" alt="">`;
  } else {
    el.buyLogoB.innerHTML = '';
  }

  // Team economy totals
  const ecoA = t0.reduce((sum, p) => sum + (p.money ?? 0), 0);
  const ecoB = t1.reduce((sum, p) => sum + (p.money ?? 0), 0);
  const ecoElA = document.getElementById('buy-eco-a');
  const ecoElB = document.getElementById('buy-eco-b');
  if (ecoElA) ecoElA.innerHTML = `<span class="buy-eco-bank">■${ecoA.toLocaleString()}</span>`;
  if (ecoElB) ecoElB.innerHTML = `<span class="buy-eco-bank">■${ecoB.toLocaleString()}</span>`;

  // Render player rows
  el.buyTeamLeft.innerHTML = t0.map(p => buyPlayerRow(p)).join('');
  el.buyTeamRight.innerHTML = t1.map(p => buyPlayerRow(p)).join('');
}

function buyPlayerRow(p) {
  const shieldIcon = shieldHTML(p.shield || 0, p.shieldType);
  const agentName = p.agent ? p.agent.charAt(0).toUpperCase() + p.agent.slice(1).toLowerCase() : '';
  const ultHtml = ultDisplayHTML(p);

  return `<div class="buy-player-row">
        <div class="buy-player-agent">${agentHTML(p.agent)}</div>
        <div class="buy-player-info">
          <span class="buy-player-agent-label">${agentName}</span>
          <span class="buy-player-name">${cleanName(p.name)}${p.hasSpike ? '<span class="spike">SPIKE</span>' : ''}</span>
        </div>
        <span class="buy-player-kda">${p.kills ?? 0}<span class="kda-sep">/</span>${p.deaths ?? 0}<span class="kda-sep">/</span>${p.assists ?? 0}</span>
        <span class="buy-player-ult">${ultHtml}</span>
        <div class="buy-player-weapon">${weaponHTML(p.weapon)}</div>
        <span class="buy-player-shield">${shieldIcon}</span>
        <span class="buy-player-credits">■${(p.money ?? 0).toLocaleString()}</span>
      </div>`;
}



// ========================================
// BOOT
// ========================================
connect();
