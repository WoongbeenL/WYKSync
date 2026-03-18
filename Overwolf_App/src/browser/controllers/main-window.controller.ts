import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { GepService } from '../services/gep.service';

export class MainWindowController {
  private window: BrowserWindow | null = null;

  constructor(private readonly gepService: GepService) {
    this.registerIpc();
  }

  public createAndShow(): void {
    this.window = new BrowserWindow({
      width: 500,
      height: 620,
      resizable: false,
      title: 'WYKSync',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js'),
      },
    });

    this.window.loadFile(path.join(__dirname, '../renderer/index.html'));
    this.window.setMenuBarVisibility(false);

    if (process.env.ELECTRON_IS_DEV === '1') {
      this.window.webContents.openDevTools({ mode: 'detach' });
    }
  }

  public updateStatus(status: string): void {
    if (this.window?.isDestroyed()) return;
    this.window?.webContents.send('status-update', status);
  }

  public log(message: string, ...args: any[]): void {
    if (this.window?.isDestroyed()) return;
    this.window?.webContents.send('log-message', message, ...args);
  }

  private registerIpc(): void {
    ipcMain.handle('get-info', async () => {
      return await this.gepService.getInfo();
    });

    ipcMain.handle('set-features', async () => {
      return await this.gepService.setRequiredFeatures();
    });
  }
}