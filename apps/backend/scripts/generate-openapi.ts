import { saveOpenApiDocument } from '#config/openapi.config.js';

console.log('[OpenAPI] Doküman üretiliyor ve diske kaydediliyor...');
const savedPath = saveOpenApiDocument();
console.log(`[OpenAPI] Başarıyla kaydedildi: ${savedPath}`);
