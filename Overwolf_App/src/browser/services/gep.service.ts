import { app as electronApp } from 'electron';
import { overwolf } from '@overwolf/ow-electron';
import EventEmitter from 'events';

const app = electronApp as overwolf.OverwolfApp;

const REQUIRED_FEATURES = [
  'gep_internal',
  'me',
  'game_info',
  'match_info',
  'kill',
  'death'
];

const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 2000;
const POLL_INTERVAL_MS = 1000;

export type GameState = 'closed' | 'menu' | 'agent_select' | 'loading' | 'in_game' | 'unknown';

export interface ValorantGameData {
  connected: boolean;
  gameState: GameState;
  map: string;
  gameMode: string;
  isRanked: boolean;
  isCustom: boolean;
  roundNumber: number;
  roundPhase: string;
  score: {
    team0: number;
    team1: number;
  };
  spike: {
    planted: boolean;
    carrier: string;
  };
  players: ValorantPlayer[];
  killFeed: KillEvent[];
  observing: string;
  localPlayer: {
    name: string;
    id: string;
    team: string;
  };
}

export interface ValorantPlayer {
  name: string;
  playerId: string;
  agent: string;
  team: number;
  isAlive: boolean;
  health: number;
  shield: number;
  weapon: string;
  kills: number;
  deaths: number;
  assists: number;
  money: number;
  ultPoints: number;
  ultMax: number;
  hasSpike: boolean;
  isLocal: boolean;
}

export interface KillEvent {
  timestamp: number;
  attacker: string;
  victim: string;
  weapon: string;
  headshot: boolean;
}

export class GepService extends EventEmitter {
  private gepApi: overwolf.packages.OverwolfGameEventPackage | null = null;
  private registeredGameIds: number[] = [];
  private activeGameId: number = 0;
  private gameData: ValorantGameData;
  private featuresSet: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastRawData: any = null;

  constructor() {
    super();
    this.gameData = this.createEmptyGameData();
    this.registerPackageManager();
  }

  public registerGames(gameIds: number[]): void {
    this.registeredGameIds = gameIds;
    this.log('Registered for game IDs: ' + gameIds.join(', '));
  }

  public async setRequiredFeatures(): Promise<boolean> {
    if (!this.gepApi) {
      this.log('GEP API not ready');
      return false;
    }

    if (this.activeGameId === 0) {
      this.log('No active game, cannot set features');
      return false;
    }

    let tries = 0;
    while (tries < MAX_RETRIES) {
      tries++;
      try {
        this.log(`Setting features... attempt ${tries}/${MAX_RETRIES}`);

        await this.gepApi.setRequiredFeatures(
          this.activeGameId,
          REQUIRED_FEATURES
        );

        this.log('Features set request sent');

        this.featuresSet = true;
        this.gameData.connected = true;
        this.log('Features set successfully!');
        this.emit('status', 'Connected');

        // Start polling
        this.startPolling();
        return true;
      } catch (e: any) {
        this.log(`Attempt ${tries} error: ${e?.message || e}`);
      }

      await this.delay(RETRY_DELAY_MS);
    }

    this.log('Failed after max retries');
    this.emit('status', 'Failed to connect - click Set Features to retry');
    return false;
  }

  public async getInfo(): Promise<any> {
    if (!this.gepApi || this.activeGameId === 0) {
      return { error: 'No active game' };
    }
    try {
      const info = await this.gepApi.getInfo(this.activeGameId);
      this.lastRawData = info;
      return info;
    } catch (e: any) {
      return { error: e?.message || 'Unknown error' };
    }
  }

  public getLastRawData(): any {
    return this.lastRawData;
  }

  public getGameData(): ValorantGameData {
    return this.gameData;
  }

  private startPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.log('Starting data polling...');

    // Poll immediately
    this.pollGameInfo();

    // Then poll every second
    this.pollInterval = setInterval(() => {
      this.pollGameInfo();
    }, POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async pollGameInfo(): Promise<void> {
    if (!this.gepApi || this.activeGameId === 0) return;

    try {
      const info = await this.gepApi.getInfo(this.activeGameId);
      if (info && !info.error) {
        this.lastRawData = info;
        this.parseFullGameInfo(info);
        this.emit('game-data', this.gameData);
      }
    } catch (e: any) {
      // Silently ignore poll errors
    }
  }

  private parseFullGameInfo(info: any): void {
    const oldState = this.gameData.gameState;

    // Parse me
    if (info.me) {
      this.gameData.localPlayer = {
        name: info.me.player_name || '',
        id: info.me.player_id || '',
        team: ''
      };
    }

    // Parse game_info for state detection
    if (info.game_info) {
      const scene = info.game_info.scene || '';
      const state = info.game_info.state || '';

      this.gameData.gameState = this.detectGameState(scene, state);

      // Map name (only if it's actually a map)
      if (this.isMapName(scene)) {
        this.gameData.map = scene;
      }
    }

    // Parse match_info
    if (info.match_info) {
      this.parseMatchInfo(info.match_info);
    }

    // Log state changes
    if (oldState !== this.gameData.gameState) {
      this.log(`State changed: ${oldState} -> ${this.gameData.gameState}`);
      this.emit('status', this.getStatusText());
    }
  }

  private detectGameState(scene: string, state: string): GameState {
    const sceneLower = scene.toLowerCase();
    const stateLower = state.toLowerCase();

    // Check for specific scenes
    if (sceneLower.includes('menu') || sceneLower === 'home' || sceneLower === 'lobby') {
      return 'menu';
    }

    if (sceneLower.includes('characterselect') || sceneLower.includes('agentselect') ||
      sceneLower.includes('pregame') || stateLower.includes('character')) {
      return 'agent_select';
    }

    if (stateLower === 'loading' || sceneLower.includes('loading')) {
      return 'loading';
    }

    // If scene is a map name and state is in progress
    if (this.isMapName(scene)) {
      if (stateLower === 'inprogress' || stateLower === 'in_progress' || stateLower === 'active') {
        return 'in_game';
      }
      // Might be in agent select on a map
      return 'agent_select';
    }

    if (stateLower === 'inprogress' || stateLower === 'in_progress') {
      return 'in_game';
    }

    return 'unknown';
  }

  private isMapName(scene: string): boolean {
    const maps = [
      'ascent', 'bind', 'breeze', 'fracture', 'haven', 'icebox',
      'lotus', 'pearl', 'split', 'sunset', 'abyss', 'range'
    ];
    return maps.includes(scene.toLowerCase());
  }

  private getStatusText(): string {
    switch (this.gameData.gameState) {
      case 'menu': return 'In Menu';
      case 'agent_select': return 'Agent Select';
      case 'loading': return 'Loading...';
      case 'in_game': return `In Game - ${this.gameData.map}`;
      case 'closed': return 'Valorant Closed';
      default: return 'Connected';
    }
  }

  private parseMatchInfo(mi: any): void {
    // Map (backup)
    if (mi.map && this.isMapName(mi.map)) {
      this.gameData.map = mi.map;
    }

    // Round
    this.gameData.roundNumber = parseInt(mi.round_number) || 0;
    this.gameData.roundPhase = mi.round_phase || '';

    // Observing
    this.gameData.observing = mi.observing || '';

    // Local player team
    this.gameData.localPlayer.team = mi.team || '';

    // Game mode (JSON string)
    if (mi.game_mode) {
      const gm = this.parseJson(mi.game_mode);
      if (gm) {
        this.gameData.gameMode = gm.mode || '';
        this.gameData.isCustom = gm.custom === true;
        this.gameData.isRanked = gm.ranked === '1' || gm.ranked === 1;
      }
    }

    // Match score (JSON string)
    if (mi.match_score) {
      const score = this.parseJson(mi.match_score);
      if (score) {
        this.gameData.score.team0 = parseInt(score.team_0) || 0;
        this.gameData.score.team1 = parseInt(score.team_1) || 0;
      }
    }

    // Parse players
    this.parsePlayersFromMatchInfo(mi);
  }

  private parsePlayersFromMatchInfo(mi: any): void {
    const players: Map<string, ValorantPlayer> = new Map();

    // Parse roster_N entries
    for (let i = 0; i < 20; i++) {
      const rosterKey = `roster_${i}`;
      if (mi[rosterKey]) {
        const roster = this.parseJson(mi[rosterKey]);
        if (roster && roster.player_id) {
          players.set(roster.player_id, {
            name: roster.name || 'Unknown',
            playerId: roster.player_id,
            agent: this.formatAgent(roster.character || ''),
            team: parseInt(roster.team) || 0,
            isAlive: true,
            health: 100,
            shield: 0,
            weapon: '',
            kills: 0,
            deaths: 0,
            assists: 0,
            money: 0,
            ultPoints: 0,
            ultMax: 0,
            hasSpike: false,
            isLocal: roster.local === true
          });
        }
      }
    }

    // Parse scoreboard_N entries (live stats)
    for (let i = 0; i < 20; i++) {
      const sbKey = `scoreboard_${i}`;
      if (mi[sbKey]) {
        const sb = this.parseJson(mi[sbKey]);
        if (sb && sb.player_id) {
          const existing = players.get(sb.player_id);
          if (existing) {
            existing.isAlive = sb.alive === true;
            existing.shield = parseInt(sb.shield) || 0;
            existing.weapon = this.formatWeapon(sb.weapon || '');
            existing.kills = parseInt(sb.kills) || 0;
            existing.deaths = parseInt(sb.deaths) || 0;
            existing.assists = parseInt(sb.assists) || 0;
            existing.money = parseInt(sb.money) || 0;
            existing.ultPoints = parseInt(sb.ult_points) || 0;
            existing.ultMax = parseInt(sb.ult_max) || 0;
            existing.hasSpike = sb.spike !== '' && sb.spike !== undefined;
            existing.isLocal = sb.is_local === true;
            if (sb.character) {
              existing.agent = this.formatAgent(sb.character);
            }
          } else {
            players.set(sb.player_id, {
              name: sb.name || 'Unknown',
              playerId: sb.player_id,
              agent: this.formatAgent(sb.character || ''),
              team: parseInt(sb.team) || 0,
              isAlive: sb.alive === true,
              health: 100,
              shield: parseInt(sb.shield) || 0,
              weapon: this.formatWeapon(sb.weapon || ''),
              kills: parseInt(sb.kills) || 0,
              deaths: parseInt(sb.deaths) || 0,
              assists: parseInt(sb.assists) || 0,
              money: parseInt(sb.money) || 0,
              ultPoints: parseInt(sb.ult_points) || 0,
              ultMax: parseInt(sb.ult_max) || 0,
              hasSpike: sb.spike !== '' && sb.spike !== undefined,
              isLocal: sb.is_local === true
            });
          }
        }
      }
    }

    this.gameData.players = Array.from(players.values());
  }

  private formatAgent(character: string): string {
    const agentMap: Record<string, string> = {
      'Clay': 'Raze',
      'Pandemic': 'Viper',
      'Wraith': 'Omen',
      'Hunter': 'Sova',
      'Thorne': 'Sage',
      'Phoenix': 'Phoenix',
      'Wushu': 'Jett',
      'Gumshoe': 'Cypher',
      'Sarge': 'Brimstone',
      'Breach': 'Breach',
      'Vampire': 'Reyna',
      'Killjoy': 'Killjoy',
      'Guide': 'Skye',
      'Stealth': 'Yoru',
      'Rift': 'Astra',
      'Grenadier': 'KAY/O',
      'Deadeye': 'Chamber',
      'Sprinter': 'Neon',
      'BountyHunter': 'Fade',
      'Mage': 'Harbor',
      'AggroBot': 'Gekko',
      'Cable': 'Deadlock',
      'Sequoia': 'Iso',
      'Smonk': 'Clove',
      'Nox': 'Vyse',
      'Cashew': 'Tejo',
      'Terra': 'Waylay',
    };
    const key = character.replace(/_PC_C$/i, '');
    return agentMap[key] || character;
  }

  private formatWeapon(weapon: string): string {
    // Scoreboard weapon codes → display names
    const weaponMap: Record<string, string> = {
      // Sidearms
      'TX_Hud_Pistol_Classic': 'Classic',
      'TX_Hud_Pistol_Slim': 'Shorty',
      'TX_Hud_Pistol_AutoPistol': 'Frenzy',
      'TX_Hud_Pistol_Luger': 'Ghost',
      'TX_Hud_Pistol_Sheriff': 'Sheriff',
      // SMGs
      'TX_Hud_SMGs_Vector': 'Stinger',
      'TX_Hud_SMGs_Ninja': 'Spectre',
      // Shotguns
      'TX_Hud_Shotguns_Pump': 'Bucky',
      'TX_Hud_Shotguns_Persuader': 'Judge',
      // Rifles
      'TX_Hud_Rifles_Burst': 'Bulldog',
      'TX_Hud_Rifles_DMR': 'Guardian',
      'TX_Hud_Rifles_Ghost': 'Phantom',
      'TX_Hud_Rifles_Volcano': 'Vandal',
      // Snipers
      'TX_Hud_Sniper_Bolt': 'Marshal',
      'TX_Hud_Sniper_Operater': 'Operator',
      'TX_Hud_Sniper_DoubleSniper': 'Outlaw',
      // Machine Guns
      'TX_Hud_LMG': 'Ares',
      'TX_Hud_HMG': 'Odin',
      // Melee
      'knife': 'Melee',
    };
    return weaponMap[weapon] || weapon;
  }

  private parseJson(str: string): any {
    if (typeof str !== 'string') return str;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  private registerPackageManager(): void {
    app.overwolf.packages.on('ready', (e, packageName, version) => {
      if (packageName !== 'gep') return;
      this.log(`GEP ready v${version}`);
      this.onGepReady();
    });
  }

  private onGepReady(): void {
    this.gepApi = app.overwolf.packages.gep;
    if (!this.gepApi) {
      this.log('GEP API not available');
      return;
    }

    this.gepApi.removeAllListeners();

    this.gepApi.on('game-detected', (e, gameId, name, gameInfo) => {
      this.log(`Game detected: ${name} (ID: ${gameId}, PID: ${gameInfo?.pid})`);

      if (!this.registeredGameIds.includes(gameId)) {
        this.log('Not a registered game, ignoring');
        return;
      }

      e.enable();
      this.activeGameId = gameId;
      this.featuresSet = false;
      this.gameData = this.createEmptyGameData();
      this.emit('status', 'Valorant detected - connecting...');

      // Try to set features after a short delay
      setTimeout(() => {
        this.setRequiredFeatures();
      }, 3000);
    });

    // @ts-ignore
    this.gepApi.on('game-exit', (e, gameId) => {
      if (gameId === this.activeGameId) {
        this.log('Valorant closed');
        this.stopPolling();
        this.activeGameId = 0;
        this.featuresSet = false;
        this.gameData = this.createEmptyGameData();
        this.gameData.gameState = 'closed';
        this.emit('status', 'Valorant closed');
        this.emit('game-data', this.gameData);
      }
    });

    // Game events (kills, etc)
    this.gepApi.on('new-game-event', (e, gameId, ...args) => {
      if (gameId !== this.activeGameId) return;

      if (args.length >= 1) {
        const eventData = args[0];
        if (Array.isArray(eventData)) {
          eventData.forEach((ev: any) => this.handleGameEvent(ev));
        } else if (typeof eventData === 'object') {
          this.handleGameEvent(eventData);
        }
      }
    });

    this.gepApi.on('error', (e, gameId, error) => {
      this.log('GEP error: ' + JSON.stringify(error));
    });

    this.emit('status', 'Waiting for Valorant...');
  }

  private handleGameEvent(event: any): void {
    const name = event.name || event.type || '';
    const data = event.data || event;

    this.log(`Event: ${name}`);

    switch (name) {
      case 'kill':
      case 'death':
        this.addKillToFeed(data);
        break;
      case 'match_start':
        this.gameData.killFeed = [];
        this.emit('status', 'Match started');
        break;
      case 'match_end':
        this.emit('status', 'Match ended');
        break;
      case 'round_start':
        this.gameData.killFeed = [];
        break;
    }

    this.emit('game-event', { name, data });
  }

  private addKillToFeed(data: any): void {
    const kill: KillEvent = {
      timestamp: Date.now(),
      attacker: data.attacker || data.killer || '',
      victim: data.victim || data.killed || '',
      weapon: data.weapon || '',
      headshot: data.headshot === true || data.headshot === 'true'
    };

    if (kill.attacker || kill.victim) {
      this.gameData.killFeed.unshift(kill);
      if (this.gameData.killFeed.length > 10) {
        this.gameData.killFeed.pop();
      }
    }
  }

  private createEmptyGameData(): ValorantGameData {
    return {
      connected: false,
      gameState: 'closed',
      map: '',
      gameMode: '',
      isRanked: false,
      isCustom: false,
      roundNumber: 0,
      roundPhase: '',
      score: { team0: 0, team1: 0 },
      spike: { planted: false, carrier: '' },
      players: [],
      killFeed: [],
      observing: '',
      localPlayer: { name: '', id: '', team: '' }
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string): void {
    console.log(`[GEP] ${message}`);
    this.emit('log', message);
  }
}