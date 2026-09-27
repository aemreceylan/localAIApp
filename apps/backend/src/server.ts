import "dotenv/config";
import app from "./app.js";
import { env } from "./config/env.config.js";

const PORT = env.PORT;

const server = app.listen(PORT, env.HOST, () => {
  console.log(`[Backend API] Sunucu ${PORT} portunda başarıyla başlatıldı.`);
  console.log(`[Environment] MOD: ${process.env.NODE_ENV || "development"}`);
  console.log(`http://${env.HOST}:${env.PORT}`);
});

export const gracefulShutdown = (signal: string) => {
  console.log(
    `\n⚠️ ${signal} sinyali alındı. Sunucu güvenli bir şekilde kapatılıyor...`,
  );

  server.close(() => {
    console.log("🛑 [Backend API] Tüm aktif HTTP bağlantıları sonlandırıldı.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error(
      "❌ Kapanma işlemi zaman aşımına uğradı, süreç zorla öldürülüyor.",
    );
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
