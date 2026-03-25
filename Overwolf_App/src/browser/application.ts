import { GepService } from './services/gep.service';
import { WebSocketService } from './services/websocket.service';
import { MainWindowController } from './controllers/main-window.controller';
import { ipcMain } from 'electron';

const VALORANT_GAME_ID = 21640;

export class Application {
  constructor(
    private readonly gepService: GepService,
    private readonly webSocketService: WebSocketService,
    private readonly mainWindowController: MainWindowController
  ) {
    this.wireEvents();
  }

  public run(): void {
    this.mainWindowController.createAndShow();
    this.webSocketService.start();
    this.gepService.registerGames([VALORANT_GAME_ID]);

    // IPC: renderer sends team config → broadcast to overlay via WS
    ipcMain.handle('send-team-config', (_event, config) => {
      this.webSocketService.broadcast({
        type: 'team-config',
        timestamp: Date.now(),
        config
      });
      return true;
    });

<<<<<<< HEAD
    // Render Request for match info
    ipcMain.handle('fetch-match-config', async (_event, matchCode: string, apiUrl: string) => {
      try {
        const url = `${apiUrl}?match_code=${encodeURIComponent(matchCode)}`;
        console.log(`[Match] Fetching match config from: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
          const errBody = await response.text();
          console.error(`[Match] API error ${response.status}:`, errBody);
          return { success: false, error: `API returned ${response.status}: ${errBody}` };
        }

        const data = await response.json();
        console.log('[Match] Received match data:', JSON.stringify(data));

        const match = data.match || data;

        const config: any = {};
        if (match.teamA) {
          config.teamA = {
            name: match.teamA.name || undefined,
            logo: match.teamA.logo || undefined,
          };
        }
        if (match.teamB) {
          config.teamB = {
            name: match.teamB.name || undefined,
            logo: match.teamB.logo || undefined,
          };
        }
        if (match.mapPool) {
          config.mapPool = match.mapPool;
        }
        if (match.bestOf !== undefined) {
          config.bestOf = match.bestOf;
        }

        this.webSocketService.broadcast({
          type: 'team-config',
          timestamp: Date.now(),
          config
        });

        return { success: true, match: match };
      } catch (err: any) {
        console.error('[Match] Fetch error:', err);
        return { success: false, error: err.message || 'Unknown error' };
      }
=======
    // IPC: renderer sends map pool config → broadcast to overlay via WS
    ipcMain.handle('send-map-pool-config', (_event, config) => {
      this.webSocketService.broadcast({
        type: 'map-pool-config',
        timestamp: Date.now(),
        config
      });
      return true;
>>>>>>> 28eeceefd66ffa61e20b67d5c4c02a49a71ef862
    });
  }

  public shutdown(): void {
    this.webSocketService.stop();
  }

  private wireEvents(): void {
    this.gepService.on('game-data', (data) => {
      this.webSocketService.broadcast({
        type: 'game-data',
        timestamp: Date.now(),
        data
      });
    });

    this.gepService.on('game-event', (event) => {
      this.webSocketService.broadcast({
        type: 'game-event',
        timestamp: Date.now(),
        event
      });
    });

    this.gepService.on('status', (status) => {
      this.mainWindowController.updateStatus(status);
      this.webSocketService.broadcast({
        type: 'status',
        timestamp: Date.now(),
        status
      });
    });

    this.gepService.on('log', (message, ...args) => {
      this.mainWindowController.log(message, ...args);
    });
  }
}
