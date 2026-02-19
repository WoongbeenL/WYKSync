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
    
    // Try multiple overlay locations
    const overlayPaths = [
      join(__dirname, '../overlay/broadcast-overlay.html'),
      join(__dirname, '../../overlay/broadcast-overlay.html'),
      join(process.cwd(), 'overlay/broadcast-overlay.html'),
      join(process.cwd(), 'dist/overlay/broadcast-overlay.html'),
    ];

    if (url === '/' || url === '/overlay' || url === '/overlay.html') {
      for (const overlayPath of overlayPaths) {
        if (existsSync(overlayPath)) {
          try {
            const html = readFileSync(overlayPath, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
            return;
          } catch (e) {
            console.error('[HTTP] Error reading overlay:', e);
          }
        }
      }
      
      // Fallback if file not found
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>Overlay not found</h1><p>Looking for: broadcast-overlay.html</p>');
      return;
    }

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