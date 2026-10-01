import dotenv from "dotenv";
import { z } from "zod";

// .env dosyasını ortama yükle
dotenv.config({ quiet: true });

// Zod Ortam Değişkenleri Şeması (Sıfır Varsayılan - Fail-Fast Kuralı)
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"], {
    errorMap: () => ({ message: "NODE_ENV yalnızca development, production veya test olabilir." }),
  }),
  HOST: z.string().min(1, "HOST adresi boş olamaz."),
  PORT: z.coerce
    .number({ invalid_type_error: "PORT geçerli bir sayı olmalıdır." })
    .min(1000, "PORT numarası en az 1000 olmalıdır.")
    .max(65535, "PORT numarası 65535 üstünde olamaz."),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN boş olamaz."),
  OLLAMA_BASE_URL: z.string().url("OLLAMA_BASE_URL geçerli bir URL olmalıdır."),
  MONGODB_URI: z.string().min(1, "MONGODB_URI boş olamaz."),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const issuesSummary = _env.error.issues
    .map((issue) => `  ❌ [${issue.path.join(".") || "kök"}]: ${issue.message}`)
    .join("\n");

  console.error(
    `\n[KRİTİK HATA] Ortam değişkenleri (Environment Variables) doğrulanamadı!\n` +
    `Lütfen .env dosyanızı veya sistem ortam değişkenlerinizi kontrol edin.\n\n` +
    `${issuesSummary}\n`
  );

  throw new Error(
    `Ortam değişkenleri doğrulanamadığı için uygulama başlatılamadı:\n${issuesSummary}`
  );
}

export const env = Object.freeze(_env.data);
export type Env = z.infer<typeof envSchema>;
