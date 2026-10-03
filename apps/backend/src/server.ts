import app from "#app.js";
import { env } from "#config/env.config.js";
import { connectDatabase, disconnectDatabase } from "#shared/database/index.js";
import { cacheService } from "#shared/cache/index.js";
import { roleService } from "#modules/role/index.js";
import { devInspectorHub } from "#shared/utils/index.js";
import { ragWorker, ragQueue, ragConfigService } from "#modules/rag/index.js";

const PORT = env.PORT;

async function bootstrap() {
  try {
    // 1. Veritabanı bağlantısı
    await connectDatabase();

    // 2. Önbellek altyapısını başlat (Redis / Graceful In-Memory fallback)
    await cacheService.init();

    // 3. Varsayılan kurumsal sistem ve departman rollerini tohumla (seed)
    await roleService.initDefaultRoles();

    // 4. RAG Dinamik Çalışma Ayarlarını Yükle ve Arka Plan Worker'ı Başlat
    await ragConfigService.initializeRuntimeConfig();
    ragWorker.start();

    // 5. HTTP sunucusu başlatma
    const server = app.listen(PORT, env.HOST, () => {
      console.log(`[Backend API] Sunucu ${PORT} portunda başarıyla başlatıldı.`);
      console.log(`[Environment] MOD: ${env.NODE_ENV}`);
      console.log(`[Docs] Swagger UI: http://${env.HOST}:${env.PORT}/api/docs`);
      console.log(`[Bull-Board] Kuyruk İzleme Paneli: http://${env.HOST}:${env.PORT}/admin/queues`);

      // Geliştirme ortamında Dev Traffic & Stream Inspector'ı hazırla
      if (env.NODE_ENV !== 'production') {
        console.log(`[DevInspector] Canlı Trafik ve Stream İzleyici: http://${env.HOST}:${env.PORT}/dev/inspector`);
        devInspectorHub.start();
      }
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n⚠️ ${signal} sinyali alındı. Sunucu güvenli bir şekilde kapatılıyor...`);

      if (env.NODE_ENV !== 'production') {
        devInspectorHub.stop();
      }

      // RAG Worker ve Queue bağlantılarını kapat
      await ragWorker.close();
      await ragQueue.close();

      server.close(async () => {
        console.log("🛑 [Backend API] Tüm aktif HTTP bağlantıları sonlandırıldı.");
        await cacheService.disconnect();
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
