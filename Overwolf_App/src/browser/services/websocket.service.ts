/* 
 *  FILE          : websocket.service.ts
 *  PROJECT       : SENG3221 - WYKSync
 *  PROGRAMMER    : Ygnacio Maza, Krystin Theoret, Will Lee
 *  DATE          : 2026-08-04
 *  DESCRIPTION   :
 *    WebSocket and HTTP server service. Serves the overlay static files
 *    over HTTP, manages WebSocket client connections, broadcasts game
 *    data and config messages, and exposes status/data REST endpoints.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class WebSocketService {
  private httpServer: ReturnType<typeof createServer> | null = null;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private port: number;
  private lastGameData: any = null;

  constructor(port: number) {
    this.port = port;
  }

  public start(): void {
    // Create HTTP server to serve overlay files
    this.httpServer = createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    // Attach WebSocket server to HTTP server
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws, req) => {
      const ip = req.socket.remoteAddress;
      console.log(`[WS] Client connected from ${ip}`);
      this.clients.add(ws);

      if (this.lastGameData) {
        ws.send(JSON.stringify({
          type: 'game-data',
          timestamp: Date.now(),
          data: this.lastGameData
        }));
      }

      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message.toString());
          this.handleMessage(ws, msg);
        } catch (e) {
          console.error('[WS] Invalid message:', e);
        }
      });

      ws.on('close', () => {
        console.log('[WS] Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('[WS] Client error:', err);
        this.clients.delete(ws);
      });
    });

    this.httpServer.listen(this.port, () => {
      console.log(`[HTTP] Overlay available at http://localhost:${this.port}`);
      console.log(`[WS] WebSocket running on ws://localhost:${this.port}`);
    });

    this.httpServer.on('error', (err) => {
      console.error('[HTTP] Server error:', err);
    });
  }

  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url || '/';

    // Status endpoint
    if (url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        clients: this.clients.size,
        hasGameData: this.lastGameData !== null,
        timestamp: Date.now()
      }));
      return;
    }

    // Data endpoint
    if (url === '/data') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.lastGameData || { error: 'No game data' }));
      return;
    }

    // Determine which file to serve
    const requestedFile = (url === '/' || url === '/overlay' || url === '/overlay.html')
      ? 'broadcast-overlay.html'
      : url.replace(/^\//, ''); // strip leading slash

    // Content-type map for all overlay file types
    const extMap: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.gif': 'image/gif',
      '.ico': 'image/x-icon',
      '.json': 'application/json',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
    };

    // Try multiple overlay base directories
    const overlayBases = [
      join(__dirname, '../overlay'),
      join(__dirname, '../../overlay'),
      join(process.cwd(), 'overlay'),
      join(process.cwd(), 'dist/overlay'),
    ];

    const ext = requestedFile.substring(requestedFile.lastIndexOf('.')).toLowerCase();
    const contentType = extMap[ext] || 'application/octet-stream';

    for (const base of overlayBases) {
      const filePath = join(base, requestedFile);
      if (existsSync(filePath)) {
        try {
          const data = readFileSync(filePath);
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
          return;
        } catch (e) {
          console.error('[HTTP] Error reading file:', filePath, e);
        }
      }
    }

    res.writeHead(404);
    res.end('Not found');
  }

  private handleMessage(ws: WebSocket, msg: any): void {
    switch (msg.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      case 'get-data':
        if (this.lastGameData) {
          ws.send(JSON.stringify({
            type: 'game-data',
            timestamp: Date.now(),
            data: this.lastGameData
          }));
        }
        break;
    }
  }

  public broadcast(message: any): void {
    if (message.type === 'game-data') {
      this.lastGameData = message.data;
    }

    const json = JSON.stringify(message);

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    });
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public stop(): void {
    this.clients.forEach(client => {
      client.close(1000, 'Server shutting down');
    });
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }

    console.log('[WS] Server stopped');
  }
}