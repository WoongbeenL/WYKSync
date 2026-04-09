/* 
 *  FILE          : application.ts
 *  PROJECT       : SENG3221 - WYKSync
 *  PROGRAMMER    : Ygnacio Maza, Krystin Theoret, Will Lee
 *  DATE          : 2026-08-04
 *  DESCRIPTION   :
 *    Main application class. Wires GEP, WebSocket, and main window
 *    services together, registers IPC handlers for team config,
 *    tournament API fetch, and map pool broadcast to the overlay.
 */

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

    // Render Request for match info — fetches tournament overlay data
    ipcMain.handle('fetch-match-config', async (_event, apiUrl: string) => {
      try {
        console.log(`[Match] Fetching overlay config from: ${apiUrl}`);

        const response = await fetch(apiUrl);

        if (!response.ok) {
          const errBody = await response.text();
          console.error(`[Match] API error ${response.status}:`, errBody);
          return { success: false, error: `API returned ${response.status}: ${errBody}` };
        }

        const data = await response.json();
        console.log('[Match] Received overlay data:', JSON.stringify(data));

        // Support both { overlay: {...} } and flat structures
        const overlay = data.overlay || data;

        const result: any = {};

        // Team A
        if (overlay.team_a) {
          result.teamA = {
            name: overlay.team_a.name || '',
            tricode: overlay.team_a.tricode || '',
            logo: overlay.team_a.logo_url || overlay.team_a.logo || '',
          };
        }
        // Team B
        if (overlay.team_b) {
          result.teamB = {
            name: overlay.team_b.name || '',
            tricode: overlay.team_b.tricode || '',
            logo: overlay.team_b.logo_url || overlay.team_b.logo || '',
          };
        }

        // Extract picks (the map pool) — ignore bans
        if (overlay.picks && Array.isArray(overlay.picks)) {
          result.mapPool = overlay.picks.map((p: any) => p.map);
          result.bestOf = overlay.picks.length;
          result.picksDetail = overlay.picks; // full pick details for the UI
        }

        // Pass bans along for display purposes
        if (overlay.bans && Array.isArray(overlay.bans)) {
          result.bans = overlay.bans;
        }

        // Do NOT auto-broadcast to overlay — let the user review and click Apply
        return { success: true, match: result };
      } catch (err: any) {
        console.error('[Match] Fetch error:', err);
        return { success: false, error: err.message || 'Unknown error' };
      }
    });

    // IPC: renderer sends map pool config → broadcast to overlay via WS
    ipcMain.handle('send-map-pool-config', (_event, config) => {
      this.webSocketService.broadcast({
        type: 'map-pool-config',
        timestamp: Date.now(),
        config
      });
      return true;
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
