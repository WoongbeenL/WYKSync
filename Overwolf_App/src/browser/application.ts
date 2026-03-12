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
