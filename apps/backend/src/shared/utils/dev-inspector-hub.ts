import net from 'node:net';
import { spawn } from 'node:child_process';

/**
 * @module DevInspectorHub
 * @description Geliştirme ortamında HTTP istek ve yanıtlarını bağımsız bir konsol
 * penceresine yönlendiren TCP/IPC yayın sunucusu.
 *
 * **Tasarım Deseni:** Observer / Hub & Spoke
 * - Backend çalışırken 4005 portunda yerel bir TCP soketi açar.
 * - Windows ortamında `cmd.exe /c start` ile ayrı bir terminal penceresi (`dev-inspector.ts`) fırlatır.
 * - Loglar bu ayrı pencereye canlı olarak aktarılır; ana backend terminali temiz kalır.
 * - Eğer ayrı pencere kapatılırsa veya bağlanamazsa, loglar güvenli fallback olarak standart `console.log`'a akar.
 * - `tsx watch` ile hot-reload yapıldığında mevcut pencere yeniden bağlanır; mükerrer pencere açılmaz.
 */
export class DevInspectorHub {
  private static instance: DevInspectorHub | null = null;
  private server: net.Server | null = null;
  private clients: Set<net.Socket> = new Set();
  private isWindowLaunched = false;
  private port = Number(process.env['DEV_INSPECTOR_PORT']) || 4005;
  private isRunning = false;

  private constructor() {}

  /** Singleton örneğini döner */
  public static getInstance(): DevInspectorHub {
    if (!DevInspectorHub.instance) {
      DevInspectorHub.instance = new DevInspectorHub();
    }
    return DevInspectorHub.instance;
  }

  /**
   * Inspector hub sunucusunu başlatır ve gerekirse ayrı terminal penceresini fırlatır.
   */
  public start(): void {
    if (this.isRunning || process.env['NODE_ENV'] === 'production' || process.env['NODE_ENV'] === 'test') {
      return;
    }

    this.server = net.createServer((socket) => {
      this.clients.add(socket);
      this.isWindowLaunched = true;

      socket.on('close', () => {
        this.clients.delete(socket);
      });

      socket.on('error', () => {
        this.clients.delete(socket);
      });
    });

    this.server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // Port zaten açık (başka bir instance veya önceki süreç dinliyor olabilir)
        this.isWindowLaunched = true;
      } else {
        console.warn(`[DevInspectorHub] Soket sunucusu uyarısı: ${err.message}`);
      }
    });

    this.server.listen(this.port, '127.0.0.1', () => {
      this.isRunning = true;

      // 1.2 saniye bekle: Eğer hot-reload sonrası eski pencere yeniden bağlandıysa yeni pencere açma!
      setTimeout(() => {
        if (this.clients.size === 0 && !this.isWindowLaunched) {
          this.launchWindow();
        }
      }, 1200);
    });
  }

  /**
   * Windows üzerinde bağımsız bir CMD penceresinde log görüntüleyici script'i çalıştırır.
   */
  public launchWindow(): void {
    if (this.isWindowLaunched || process.env['NODE_ENV'] === 'production') {
      return;
    }

    this.isWindowLaunched = true;

    try {
      if (process.platform === 'win32') {
        const cwd = process.cwd();
        const child = spawn(
          'cmd.exe',
          ['/c', 'start', '"NexusAI Inspector"', '/D', `"${cwd}"`, 'cmd', '/k', 'npx.cmd', 'tsx', 'scripts/dev-inspector.ts'],
          {
            detached: true,
            stdio: 'ignore',
            shell: true,
            cwd,
          },
        );
        child.unref();
      }
    } catch (err) {
      console.warn('[DevInspectorHub] Ayrı konsol penceresi başlatılamadı, loglar ana konsola yazılacak:', err);
    }
  }

  /**
   * Log mesajını bağlı olan ayrı terminale gönderir; bağlı pencere yoksa ana terminale yazar.
   */
  public log(message: string): void {
    if (this.clients.size > 0) {
      for (const client of this.clients) {
        if (!client.destroyed) {
          client.write(message + '\n');
        }
      }
    } else {
      // Fallback: Ayrı konsol açık değilse ana terminale yaz
      console.log(message);
    }
  }

  /**
   * Bağlı istemci var mı kontrolü
   */
  public hasClients(): boolean {
    return this.clients.size > 0;
  }

  /**
   * Sunucuyu güvenli şekilde kapatır.
   */
  public stop(): void {
    for (const client of this.clients) {
      client.destroy();
    }
    this.clients.clear();
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.isRunning = false;
  }
}

export const devInspectorHub = DevInspectorHub.getInstance();
