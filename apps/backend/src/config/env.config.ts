import dotenv from "dotenv";
import { z } from "zod";

// .env dosyasını ortama yükle
dotenv.config({ quiet: true });

// Zod Ortam Değişkenleri Şeması
const envSchema = z.object({
  NODE_ENV: z.enum(
    ["development", "production", "test"],
    "NODE_ENV yalnızca development, production veya test olabilir.",
  ),
  HOST: z.string().min(1, "HOST adresi boş olamaz."),
  PORT: z.coerce
    .number("PORT geçerli bir sayı olmalıdır.")
    .min(1000, "PORT numarası en az 1000 olmalıdır.")
    .max(65535, "PORT numarası 65535 üstünde olamaz."),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN boş olamaz."),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error(
    "[KRİTİK HATA] Ortam değişkenleri (Environment Variables) doğrulanamadı!",
  );
  console.error(
    "Lütfen .env dosyanızı veya sistem değişkenlerinizi kontrol edin.\n",
  );

  _env.error.issues.forEach((issue) => {
    const fieldPath = issue.path.join(".") || "kök_dizilim";
    console.error(`  - ${fieldPath}: ${issue.message}`);
  });

  throw new Error(
    "Ortam değişkenleri doğrulanamadığı için uygulama başlatılamadı.",
  );
}

export const env = Object.freeze(_env.data);
export type Env = z.infer<typeof envSchema>;
