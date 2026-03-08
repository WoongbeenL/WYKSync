// ========================================
// CONFIG
// ========================================
const CONFIG = { wsUrl: 'ws://localhost:8765', showDebug: true };

// ========================================
// AGENT IMAGE MAP
// ========================================
const AGENT_IMAGES = {
  jett: 'assets/agents/jett.png',
  phoenix: 'assets/agents/phoenix.png',
  sage: 'assets/agents/sage.png',
  sova: 'assets/agents/sova.png',
  brimstone: 'assets/agents/brimstone.png',
  viper: 'assets/agents/viper.png',
  omen: 'assets/agents/omen.png',
  killjoy: 'assets/agents/killjoy.png',
  cypher: 'assets/agents/cypher.png',
  reyna: 'assets/agents/reyna.png',
  raze: 'assets/agents/raze.png',
  breach: 'assets/agents/breach.png',
  skye: 'assets/agents/skye.png',
  yoru: 'assets/agents/yoru.png',
  astra: 'assets/agents/astra.png',
  kayo: 'assets/agents/kayo.png',
  chamber: 'assets/agents/chamber.png',
  neon: 'assets/agents/neon.png',
  fade: 'assets/agents/fade.png',
  harbor: 'assets/agents/harbor.png',
  gekko: 'assets/agents/gekko.png',
  deadlock: 'assets/agents/deadlock.png',
  iso: 'assets/agents/iso.png',
  clove: 'assets/agents/clove.png',
  vyse: 'assets/agents/vyse.png',
  tejo: 'assets/agents/tejo.png',
  waylay: 'assets/agents/waylay.png',
};

const AGENT_FALLBACK_SVG = `<svg class="agent-fallback" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="14" stroke="#C9A84C" stroke-width="1.5" stroke-opacity="0.5"/><text x="18" y="22" text-anchor="middle" fill="#C9A84C" font-size="11" font-weight="bold" opacity="0.6">?</text></svg>`;

function agentHTML(name) {
  if (!name) return AGENT_FALLBACK_SVG;
  const key = name.toLowerCase().replace(/[^a-z]/g, '').replace('kayo', 'kayo');
  const base = 'assets/agents/' + key;
  return `<img src="${base}.png" alt="${name}"
        onerror="this.onerror=function(){this.onerror=function(){this.outerHTML='${AGENT_FALLBACK_SVG.replace(/'/g, "\\'").replace(/"/g, "'")}'};this.src='${base}.webp'};this.src='${base}.jpg'">`;
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
  let tier;
  if (shieldType === 'regen') {
    tier = 'regen';
  } else if (shield >= 50) {
    tier = 'full';
  } else if (shield >= 25) {
    tier = 'light';
  } else {
    tier = 'none';
  }
  const imgPath = 'assets/shields/' + (tier === 'none' ? 'no-shield' : tier) + '.png';
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
  map: document.getElementById('t-map'),
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
  // Debug
  debug: document.getElementById('debug'),
  dStatus: document.getElementById('d-status'),
  dState: document.getElementById('d-state'),
  dMap: document.getElementById('d-map'),
  dRound: document.getElementById('d-round'),
  dPlayers: document.getElementById('d-players'),
};

if (!CONFIG.showDebug) el.debug.style.display = 'none';

// ========================================
// WEBSOCKET
// ========================================
let ws = null, gameData = null;
let buyPhaseActive = false;
let buyFadeTimeout = null;

function connect() {
  el.dStatus.textContent = 'Connecting...';
  ws = new WebSocket(CONFIG.wsUrl);
  ws.onopen = () => { el.dStatus.textContent = 'Connected'; };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'game-data') { gameData = msg.data; render(); }
      else if (msg.type === 'team-config') { applyTeamConfig(msg.config); }
    } catch (err) { console.error(err); }
  };
  ws.onclose = () => { el.dStatus.textContent = 'Disconnected'; setTimeout(connect, 3000); };
  ws.onerror = () => { el.dStatus.textContent = 'Error'; };
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


// ========================================
// RENDER
// ========================================
function render() {
  if (!gameData) return;
  const state = gameData.gameState || 'unknown';

  // Debug
  el.dState.textContent = state;
  el.dMap.textContent = gameData.map || '—';
  el.dRound.textContent = gameData.roundNumber || 0;
  el.dPlayers.textContent = gameData.players?.length || 0;

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
    el.map.textContent = fmtMap(gameData.map);

    // Attack / Defense side labels
    const atkTeam = gameData.attackingTeam;
    if (atkTeam === 0) {
      el.sideA.textContent = 'ATK';
      el.sideB.textContent = 'DEF';
    } else if (atkTeam === 1) {
      el.sideA.textContent = 'DEF';
      el.sideB.textContent = 'ATK';
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

  document.querySelectorAll('.p-card').forEach((c, i) => setTimeout(() => c.classList.add('show'), i * 40));
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
// DEBUG TEST HELPERS 
// ========================================
const MOCK_PLAYERS = [
  // Team 0
  { name: 'Faker#NA1', team: 0, agent: 'jett', isAlive: true, health: 150, kills: 12, deaths: 3, assists: 5, money: 4700, weapon: 'vandal', shield: 50, ultPoints: 7, ultMax: 7, hasSpike: false },
  { name: 'Shroud#NA1', team: 0, agent: 'sage', isAlive: true, health: 100, kills: 8, deaths: 5, assists: 9, money: 3200, weapon: 'phantom', shield: 25, ultPoints: 5, ultMax: 8, hasSpike: false },
  { name: 'TenZ#RIOT', team: 0, agent: 'reyna', isAlive: true, health: 80, kills: 15, deaths: 7, assists: 2, money: 800, weapon: 'sheriff', shield: 0, ultPoints: 4, ultMax: 6, hasSpike: true },
  { name: 'Hiko#NA1', team: 0, agent: 'sova', isAlive: false, health: 0, kills: 5, deaths: 8, assists: 7, money: 2100, weapon: 'spectre', shield: 25, ultPoints: 3, ultMax: 7, hasSpike: false },
  { name: 'Subroza#NA1', team: 0, agent: 'omen', isAlive: true, health: 45, kills: 6, deaths: 6, assists: 4, money: 5000, weapon: 'vandal', shield: 50, ultPoints: 6, ultMax: 7, hasSpike: false },
  // Team 1
  { name: 'Aspas#BR1', team: 1, agent: 'raze', isAlive: true, health: 130, kills: 18, deaths: 4, assists: 3, money: 3900, weapon: 'vandal', shield: 50, ultPoints: 7, ultMax: 7, hasSpike: false },
  { name: 'Chronicle#EU', team: 1, agent: 'killjoy', isAlive: true, health: 100, kills: 7, deaths: 6, assists: 8, money: 2800, weapon: 'phantom', shield: 25, ultPoints: 5, ultMax: 8, hasSpike: false },
  { name: 'Derke#RIOT', team: 1, agent: 'chamber', isAlive: true, health: 100, kills: 11, deaths: 5, assists: 4, money: 4200, weapon: 'operator', shield: 50, ultPoints: 6, ultMax: 7, hasSpike: false },
  { name: 'Less#BR1', team: 1, agent: 'viper', isAlive: false, health: 0, kills: 4, deaths: 9, assists: 6, money: 1500, weapon: 'spectre', shield: 0, ultPoints: 2, ultMax: 7, hasSpike: false },
  { name: 'Sacy#BR1', team: 1, agent: 'breach', isAlive: true, health: 60, kills: 9, deaths: 7, assists: 10, money: 3600, weapon: 'vandal', shield: 25, ultPoints: 4, ultMax: 7, hasSpike: false },
];

let mockRound = 8;

function debugSetState(state, phase) {
  gameData = {
    gameState: state,
    map: 'ascent',
    roundNumber: mockRound,
    roundPhase: phase || '',
    score: { team0: 5, team1: 3 },
    players: state === 'in_game' ? JSON.parse(JSON.stringify(MOCK_PLAYERS)) : [],
    observing: 'TenZ',
  };
  render();
}

function debugNextRound() {
  mockRound++;
  if (gameData) {
    gameData.roundNumber = mockRound;
    render();
  }
}

// ========================================
// BOOT
// ========================================
connect();
