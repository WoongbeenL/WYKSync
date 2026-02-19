import { app as ElectronApp } from 'electron';
import { Application } from './application';
import { GepService } from './services/gep.service';
import { WebSocketService } from './services/websocket.service';
import { MainWindowController } from './controllers/main-window.controller';

const WEBSOCKET_PORT = 8765;

const bootstrap = (): Application => {
  const gepService = new GepService();
  const webSocketService = new WebSocketService(WEBSOCKET_PORT);
  const mainWindowController = new MainWindowController(gepService);

  return new Application(gepService, webSocketService, mainWindowController);
};

const app = bootstrap();

ElectronApp.whenReady().then(() => {
  app.run();
});

ElectronApp.on('window-all-closed', () => {
  app.shutdown();
  if (process.platform !== 'darwin') {
    ElectronApp.quit();
  }
});