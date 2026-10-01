import app from "#app.js";
import { env } from "#config/env.config.js";
import { connectDatabase, disconnectDatabase } from "#shared/database/index.js";

const PORT = env.PORT;

async function bootstrap() {
  try {
    // 1. Veritabanı bağlantısı
    await connectDatabase();

    // 2. HTTP sunucusu başlatma
    const server = app.listen(PORT, env.HOST, () => {
      console.log(`[Backend API] Sunucu ${PORT} portunda başarıyla başlatıldı.`);
      console.log(`[Environment] MOD: ${env.NODE_ENV}`);
      console.log(`[Docs] Swagger UI: http://${env.HOST}:${env.PORT}/api/docs`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n⚠️ ${signal} sinyali alındı. Sunucu güvenli bir şekilde kapatılıyor...`);

      server.close(async () => {
        console.log("🛑 [Backend API] Tüm aktif HTTP bağlantıları sonlandırıldı.");
        await disconnectDatabase();
        process.exit(0);
      });

      setTimeout(() => {
        console.error("❌ Kapanma işlemi zaman aşımına uğradı, süreç zorla öldürülüyor.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (err) {
    console.error("❌ Uygulama başlatılamadı:", err);
    process.exit(1);
  }
}

await bootstrap();
