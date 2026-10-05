import net from 'node:net';

/**
 * @module DevInspectorViewer
 * @description Ayrı konsol penceresinde çalışan canlı HTTP İstek / Yanıt ve LLM Stream İzleyicisi.
 *
 * Backend'deki DevInspectorHub TCP soketine bağlanır ve tüm trafiği renkli ANSI
 * formatında bu terminale yansıtır.
 */

const PORT = Number(process.env['DEV_INSPECTOR_PORT']) || 4005;
const HOST = '127.0.0.1';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

function printBanner(): void {
  console.clear();
  console.log(`${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║           🚀 Chotonack AI Dev Traffic & Stream Inspector             ║${RESET}`);
  console.log(`${CYAN}${BOLD}║                  (Canlı İstek & Yanıt Gözlemcisi)                    ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`${DIM}Bu pencere backend çalışırken gelen/giden tüm HTTP trafiğini ve${RESET}`);
  console.log(`${DIM}LLM stream akışını ayrı bir ekranda canlı izlemenizi sağlar.${RESET}\n`);
}

function connect(): void {
  const socket = net.createConnection({ port: PORT, host: HOST });

  socket.on('connect', () => {
    printBanner();
    console.log(`${GREEN}${BOLD}● Backend ile bağlantı kuruldu.${RESET} ${DIM}[tcp://${HOST}:${PORT}]${RESET}`);
    console.log(`${BLUE}Trafik bekleniyor... İstek yapıldığında buraya akacaktır.${RESET}\n`);
  });

  socket.on('data', (data) => {
    process.stdout.write(data);
  });

  socket.on('close', () => {
    console.log(`\n${YELLOW}⚠️  Backend bağlantısı koptu (sunucu yeniden başlatılıyor olabilir)...${RESET}`);
    console.log(`${DIM}1.5 saniye sonra tekrar bağlanılacak...${RESET}\n`);
    setTimeout(connect, 1500);
  });

  socket.on('error', () => {
    // İlk açılışta veya ara geçişlerde hata verebilir; close event'i yeniden bağlantıyı yönetecek
  });
}

// Başlat
connect();
