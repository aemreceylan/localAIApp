import type { Request, Response, NextFunction } from 'express';
import { devInspectorHub } from '#shared/utils/index.js';

/**
 * @module devLoggerMiddleware
 * @description Geliştirme ortamına özgü kapsamlı HTTP istek/yanıt ve LLM akış loglayıcısı.
 *
 * **Tasarım Deseni:** Decorator & Interceptor
 * - `res.write` ve `res.end` metodlarını monkey-patch ederek JSON, SSE ve
 *   Vercel AI SDK data-stream yanıtlarını yakalar ve birleştirir.
 * - Uint8Array / Buffer akışlarını ikili byte sayısına dönüştürmeden doğrudan UTF-8 çözer.
 * - Çıktıları bağımsız çalışan DevInspector konsol penceresine yönlendirir.
 * - Sadece `NODE_ENV !== 'production'` koşulunda etkindir; prodüksiyona sıfır etki eder.
 */

// Terminal ANSI renk kodları
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const MAGENTA = '\x1b[35m';
const BLUE = '\x1b[34m';
const WHITE = '\x1b[37m';

function statusColor(status: number): string {
  if (status < 300) return GREEN;
  if (status < 400) return YELLOW;
  if (status < 500) return MAGENTA;
  return RED;
}

function formatJson(data: unknown): string {
  if (!data || (typeof data === 'object' && Object.keys(data as object).length === 0)) {
    return `${DIM}<boş nesne>${RESET}`;
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Her türlü girdi tipini (Buffer, Uint8Array, ArrayBuffer, string)
 * güvenli bir şekilde ham Buffer'a dönüştürür.
 * Uint8Array'in String(chunk) ile "48,58,34..." gibi sayılara dönüşmesini engeller.
 */
function toBuffer(chunk: unknown, encodingOrCallback?: unknown): Buffer | null {
  if (!chunk) return null;
  if (Buffer.isBuffer(chunk)) {
    return chunk;
  }
  if (chunk instanceof Uint8Array || ArrayBuffer.isView(chunk)) {
    return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  }
  if (typeof chunk === 'string') {
    const enc = (typeof encodingOrCallback === 'string' ? encodingOrCallback : 'utf8') as BufferEncoding;
    return Buffer.from(chunk, enc);
  }
  if (chunk instanceof ArrayBuffer) {
    return Buffer.from(chunk);
  }
  return Buffer.from(String(chunk), 'utf8');
}

/**
 * Eğer metin yanlışlıkla byte sayıları ("48,58,34,77...") olarak serileştirilmişse,
 * bunu otomatik olarak UTF-8 metne çözer.
 */
function tryDecodeByteString(str: string): string {
  const trimmed = str.trim();
  // Virgülle ayrılmış en az 4 sayı dizisi (örn: 48,58,34,77...)
  if (/^\d{1,3}(,\s*\d{1,3}){3,}/.test(trimmed)) {
    try {
      const numbers = trimmed
        .split(',')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !isNaN(n));
      const decoded = Buffer.from(numbers).toString('utf8');
      if (decoded.length > 0 && !decoded.includes('\ufffd')) {
        return decoded;
      }
    } catch {
      // noop
    }
  }
  return str;
}

/**
 * Yanıt metninin çözülememiş ham rakamlardan/baytlardan oluşup oluşmadığını denetler.
 */
function isRawNumberDump(str: string): boolean {
  const trimmed = str.trim();
  return /^\d[\d,\s]{20,}$/.test(trimmed);
}

/**
 * Vercel AI SDK data-stream protokolünü ayrıştırır (0:"metin", d:{"finishReason":...})
 */
function parseVercelAiStream(raw: string): { fullText: string; summary: string } | null {
  const lines = raw.split('\n');
  const textDeltas: string[] = [];
  let finishReason = '';
  let usage: Record<string, unknown> | null = null;
  let hasAiTokens = false;

  for (const line of lines) {
    if (line.startsWith('0:')) {
      hasAiTokens = true;
      try {
        const text = JSON.parse(line.slice(2));
        textDeltas.push(text);
      } catch {
        textDeltas.push(line.slice(2));
      }
    } else if (line.startsWith('d:')) {
      hasAiTokens = true;
      try {
        const meta = JSON.parse(line.slice(2));
        if (meta.finishReason) finishReason = meta.finishReason;
        if (meta.usage) usage = meta.usage;
      } catch {
        // noop
      }
    }
  }

  if (!hasAiTokens) return null;

  const fullText = textDeltas.join('');
  let summary = `${textDeltas.length} token/chunk`;
  if (finishReason) summary += `, Bitiş: ${finishReason}`;
  if (usage) summary += `, Token kullanımı: ${JSON.stringify(usage)}`;

  return { fullText, summary };
}

export function devLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env['NODE_ENV'] === 'production' || process.env['NODE_ENV'] === 'test') {
    next();
    return;
  }

  const startTime = Date.now();
  const separator = '─'.repeat(70);

  // ── 1. REQUEST LOG ────────────────────────────────────────────────────────
  const reqLines: string[] = [];
  reqLines.push(`\n${DIM}${separator}${RESET}`);
  reqLines.push(
    `${BOLD}${CYAN}▶ REQ${RESET}  ${BOLD}${req.method}${RESET} ${WHITE}${req.originalUrl}${RESET} ` +
      `${DIM}[${new Date().toLocaleTimeString('tr-TR')}]${RESET}`,
  );

  if (req.headers['x-tenant-id']) {
    reqLines.push(`${DIM}   kiracı (tenant):${RESET} ${req.headers['x-tenant-id']}`);
  }
  if (req.headers['authorization']) {
    const auth = String(req.headers['authorization']);
    const masked = auth.length > 25 ? auth.slice(0, 25) + '…' : auth;
    reqLines.push(`${DIM}   yetki (auth):${RESET}   ${masked}`);
  }

  if (req.body && Object.keys(req.body).length > 0) {
    const sanitized = { ...req.body } as Record<string, unknown>;
    if ('password' in sanitized) sanitized['password'] = '********';
    if ('token' in sanitized) sanitized['token'] = '********';
    reqLines.push(`${BLUE}   giden gövde (body):${RESET}\n${formatJson(sanitized)}`);
  }

  devInspectorHub.log(reqLines.join('\n'));

  // ── 2. RESPONSE INTERCEPT ────────────────────────────────────────────────
  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);

  const chunks: Buffer[] = [];

  res.write = function (
    chunk: unknown,
    encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void),
    callback?: (error: Error | null | undefined) => void,
  ): boolean {
    const buf = toBuffer(chunk, encodingOrCallback);
    if (buf) chunks.push(buf);
    return (originalWrite as Function).apply(res, [chunk, encodingOrCallback, callback]);
  } as typeof res.write;

  res.end = function (
    chunk?: unknown,
    encodingOrCallback?: BufferEncoding | (() => void),
    callback?: () => void,
  ): Response {
    if (chunk && typeof chunk !== 'function') {
      const buf = toBuffer(chunk, encodingOrCallback);
      if (buf) chunks.push(buf);
    }

    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const color = statusColor(status);
    const resLines: string[] = [];

    // Birleştirilmiş ham yanıt metni
    let rawBody = Buffer.concat(chunks).toString('utf8');

    // Eğer sayısal byte dizisi ("48,58,34...") gelmişse metne çevirmeyi dene
    rawBody = tryDecodeByteString(rawBody);

    // Yanıt türüne göre ayrıştırma ve biçimlendirme
    const aiStream = parseVercelAiStream(rawBody);

    if (aiStream) {
      // 1. LLM Akışı (Vercel AI SDK / SSE stream)
      resLines.push(`${MAGENTA}${BOLD}   🤖 LLM Stream Yanıtı (${aiStream.summary}):${RESET}`);
      resLines.push(
        aiStream.fullText
          .split('\n')
          .map((line) => `      ${GREEN}${line}${RESET}`)
          .join('\n'),
      );
    } else if (rawBody.trim().startsWith('{') || rawBody.trim().startsWith('[')) {
      // 2. Standart JSON Yanıtı
      try {
        const parsed = JSON.parse(rawBody);
        resLines.push(`${GREEN}   gelen yanıt (response):${RESET}\n${formatJson(parsed)}`);
      } catch {
        if (!isRawNumberDump(rawBody)) {
          resLines.push(`${GREEN}   gelen yanıt (raw):${RESET} ${rawBody}`);
        }
      }
    } else if (rawBody.trim().length > 0) {
      // 3. Düz Metin / HTML / Diğer
      if (!isRawNumberDump(rawBody)) {
        resLines.push(`${GREEN}   gelen yanıt (text):${RESET} ${rawBody}`);
      }
    }

    resLines.push(
      `${BOLD}${color}◀ RES${RESET}  ${color}${status}${RESET} ${DIM}(${duration}ms)${RESET}`,
    );
    resLines.push(`${DIM}${separator}${RESET}\n`);

    devInspectorHub.log(resLines.join('\n'));

    return (originalEnd as Function).apply(res, [chunk, encodingOrCallback, callback]) as Response;
  } as typeof res.end;

  next();
}
