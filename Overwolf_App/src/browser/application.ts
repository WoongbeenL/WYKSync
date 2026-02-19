import { GepService } from './services/gep.service';
import { WebSocketService } from './services/websocket.service';
import { MainWindowController } from './controllers/main-window.controller';

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