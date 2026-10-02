import net from 'node:net';
import type { Response } from 'express';
import type { DevTrafficEntry, DevInspectorStats } from '#shared/dev-inspector/dev-traffic.types.js';

/**
 * @module DevInspectorHub
 * @description Geliştirme ortamında HTTP istek, yanıt ve LLM akışlarını
 * web arayüzlerine (SSE) ve isteğe bağlı terminal istemcilerine dağıtan merkezi yayın motoru.
 *
 * **Tasarım Deseni:** Observer & In-Memory Ring Buffer
 * - Gelen ve giden tüm trafiği hafızada son 100 kayıtlık bir döngüsel tamponda (ring buffer) saklar.
 * - Bağlanan tüm Web UI (SSE - Server-Sent Events) istemcilerine anlık JSON akışı sağlar.
 * - Harici bağımsız bir CMD penceresi fırlatmaz; terminal kirliliğini önler.
 * - İsteğe bağlı olarak TCP portunu (4005) dinlemeye devam eder, böylece CLI aracı da çalışabilir.
 */
export class DevInspectorHub {
  private static instance: DevInspectorHub | null = null;
  private readonly maxHistory = 100;
  private readonly history: DevTrafficEntry[] = [];
  private readonly sseClients: Set<Response> = new Set();
  private readonly tcpClients: Set<net.Socket> = new Set();
  private tcpServer: net.Server | null = null;
  private isRunning = false;
  private readonly port = Number(process.env['DEV_INSPECTOR_PORT']) || 4005;

  private constructor() {}

  /** Singleton örneğini döner */
  public static getInstance(): DevInspectorHub {
    if (!DevInspectorHub.instance) {
      DevInspectorHub.instance = new DevInspectorHub();
    }
    return DevInspectorHub.instance;
  }

  /**
   * Inspector hub altyapısını başlatır (TCP soketi isteğe bağlı CLI dinler, pencere açmaz).
   */
  public start(): void {
    if (this.isRunning || process.env['NODE_ENV'] === 'production' || process.env['NODE_ENV'] === 'test') {
      return;
    }

    try {
      this.tcpServer = net.createServer((socket) => {
        this.tcpClients.add(socket);

        socket.on('close', () => {
          this.tcpClients.delete(socket);
        });

        socket.on('error', () => {
          this.tcpClients.delete(socket);
        });
      });

      this.tcpServer.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code !== 'EADDRINUSE') {
          console.warn(`[DevInspectorHub] TCP soket uyarısı: ${err.message}`);
        }
      });

      this.tcpServer.listen(this.port, '127.0.0.1', () => {
        this.isRunning = true;
      });
    } catch (err) {
      console.warn('[DevInspectorHub] TCP sunucusu başlatılamadı:', err);
    }
  }

  /**
   * Web istemcisi için yeni bir SSE bağlantısı ekler.
   */
  public addSseClient(res: Response): void {
    this.sseClients.add(res);
  }

  /**
   * Kapanan SSE bağlantısını listeden çıkarır.
   */
  public removeSseClient(res: Response): void {
    this.sseClients.delete(res);
  }

  private pushToHistory(entry: DevTrafficEntry): void {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  }

  private broadcastToSse(payload: string): void {
    if (this.sseClients.size === 0) return;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private broadcastToTcp(payload: string): void {
    if (this.tcpClients.size === 0) return;
    for (const socket of this.tcpClients) {
      if (!socket.destroyed) {
        try {
          socket.write(payload);
        } catch {
          this.tcpClients.delete(socket);
        }
      }
    }
  }

  /**
   * Yeni bir HTTP trafik kaydını kaydeder ve bağlı istemcilere yayınlar.
   */
  public emitTraffic(entry: DevTrafficEntry): void {
    this.pushToHistory(entry);
    this.broadcastToSse(`data: ${JSON.stringify(entry)}\n\n`);
    if (entry.formattedText) {
      this.broadcastToTcp(entry.formattedText + '\n');
    }
  }

  /**
   * Geçmiş log kayıtlarını döner.
   */
  public getHistory(): DevTrafficEntry[] {
    return [...this.history];
  }

  /**
   * Log geçmişini temizler.
   */
  public clearHistory(): void {
    this.history.length = 0;
    if (this.sseClients.size > 0) {
      const payload = `event: clear\ndata: {}\n\n`;
      for (const client of this.sseClients) {
        try {
          client.write(payload);
        } catch {
          this.sseClients.delete(client);
        }
      }
    }
  }

  /**
   * Genel istatistikleri hesaplar.
   */
  public getStats(): DevInspectorStats {
    const totalRequests = this.history.length;
    const errorCount = this.history.filter((h) => h.status >= 400).length;
    const totalDuration = this.history.reduce((acc, h) => acc + h.durationMs, 0);
    const avgDurationMs = totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0;

    return {
      totalRequests,
      errorCount,
      avgDurationMs,
      activeSseClients: this.sseClients.size,
    };
  }

  /**
   * Geriye dönük uyumluluk için metin tabanlı loglayıcı.
   */
  public log(message: string): void {
    if (this.tcpClients.size > 0) {
      for (const client of this.tcpClients) {
        if (!client.destroyed) {
          client.write(message + '\n');
        }
      }
    }
  }

  /**
   * Sunucuyu güvenli şekilde kapatır.
   */
  public stop(): void {
    for (const client of this.tcpClients) {
      client.destroy();
    }
    this.tcpClients.clear();

    for (const client of this.sseClients) {
      try {
        client.end();
      } catch {
        // noop
      }
    }
    this.sseClients.clear();

    if (this.tcpServer) {
      this.tcpServer.close();
      this.tcpServer = null;
    }
    this.isRunning = false;
  }
}

export const devInspectorHub = DevInspectorHub.getInstance();
