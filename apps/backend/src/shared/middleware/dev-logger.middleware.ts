import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { devInspectorHub, type DevTrafficEntry } from '#shared/dev-inspector/index.js';

/**
 * @module devLoggerMiddleware
 * @description Geliştirme ortamına özgü kapsamlı HTTP istek/yanıt ve LLM akış loglayıcısı.
 *
 * **Tasarım Deseni:** Decorator & Interceptor
 * - `res.write` ve `res.end` metodlarını monkey-patch ederek JSON, SSE ve
 *   Vercel AI SDK data-stream yanıtlarını yakalar ve birleştirir.
 * - Uint8Array / Buffer akışlarını ikili byte sayısına dönüştürmeden doğrudan UTF-8 çözer.
 * - Çıktıları hem DevInspectorHub (Web SSE ve in-memory ring buffer) hem de TCP/konsola aktarır.
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

function toBuffer(chunk: unknown, encodingOrCallback?: unknown): Buffer | null {
  if (!chunk) return null;
  if (Buffer.isBuffer(chunk)) return chunk;
  if (chunk instanceof Uint8Array || ArrayBuffer.isView(chunk)) {
    return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  }
  if (typeof chunk === 'string') {
    const enc = (typeof encodingOrCallback === 'string' ? encodingOrCallback : 'utf8') as BufferEncoding;
    return Buffer.from(chunk, enc);
  }
  if (chunk instanceof ArrayBuffer) return Buffer.from(chunk);
  return Buffer.from(JSON.stringify(chunk), 'utf8');
}

function tryDecodeByteString(str: string): string {
  const trimmed = str.trim();
  if (/^\d{1,3}(,\s*\d{1,3}){3,}/.test(trimmed)) {
    try {
      const numbers = trimmed
        .split(',')
        .map((n) => Number.parseInt(n.trim(), 10))
        .filter((n) => !Number.isNaN(n));
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

function isRawNumberDump(str: string): boolean {
  return /^\d[\d,\s]{20,}$/.test(str.trim());
}

interface StreamMetaCollector {
  finishReason: string;
  usage: Record<string, unknown> | null;
}

function parseStreamLine(line: string, textDeltas: string[], meta: StreamMetaCollector): boolean {
  if (line.startsWith('0:')) {
    try {
      textDeltas.push(JSON.parse(line.slice(2)));
    } catch {
      textDeltas.push(line.slice(2));
    }
    return true;
  }
  if (line.startsWith('d:')) {
    try {
      const parsed = JSON.parse(line.slice(2));
      if (parsed.finishReason) meta.finishReason = parsed.finishReason;
      if (parsed.usage) meta.usage = parsed.usage;
    } catch {
      // noop
    }
    return true;
  }
  return false;
}

function parseVercelAiStream(raw: string): { fullText: string; summary: string } | null {
  const lines = raw.split('\n');
  const textDeltas: string[] = [];
  const meta: StreamMetaCollector = { finishReason: '', usage: null };
  let hasAiTokens = false;

  for (const line of lines) {
    if (parseStreamLine(line, textDeltas, meta)) {
      hasAiTokens = true;
    }
  }

  if (!hasAiTokens) return null;

  const fullText = textDeltas.join('');
  let summary = `${textDeltas.length} token/chunk`;
  if (meta.finishReason) summary += `, Bitiş: ${meta.finishReason}`;
  if (meta.usage) summary += `, Token: ${JSON.stringify(meta.usage)}`;

  return { fullText, summary };
}

function headerToString(val: unknown): string {
  if (Array.isArray(val)) {
    return val.join(', ');
  }
  if (typeof val === 'string') {
    return val;
  }
  return JSON.stringify(val);
}

function sanitizeHeaders(headers: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    if (val === undefined) continue;
    const lowerKey = key.toLowerCase();
    const str = headerToString(val);
    if (lowerKey === 'authorization' || lowerKey === 'cookie') {
      result[key] = str.toLowerCase().startsWith('bearer ') ? 'Bearer ********' : '********';
    } else {
      result[key] = str;
    }
  }
  return result;
}

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const copy = { ...(body as Record<string, unknown>) };
  for (const key of Object.keys(copy)) {
    const lk = key.toLowerCase();
    if (lk.includes('password') || lk.includes('token') || lk.includes('secret')) {
      copy[key] = '********';
    }
  }
  return copy;
}

function shouldSkipInspection(url: string): boolean {
  return (
    url.startsWith('/api/dev/inspector') ||
    url.startsWith('/dev/inspector') ||
    url.startsWith('/dev-inspector')
  );
}

function extractResponseDetails(rawBody: string): {
  parsedBody: unknown;
  resLines: string[];
  aiStream: { fullText: string; summary: string } | null;
} {
  const aiStream = parseVercelAiStream(rawBody);
  const resLines: string[] = [];
  let parsedBody: unknown = rawBody;

  if (aiStream) {
    parsedBody = aiStream.fullText;
    resLines.push(
      `${MAGENTA}${BOLD}   🤖 LLM Stream Yanıtı (${aiStream.summary}):${RESET}`,
      aiStream.fullText
        .split('\n')
        .map((line) => `      ${GREEN}${line}${RESET}`)
        .join('\n'),
    );
  } else if (rawBody.trim().startsWith('{') || rawBody.trim().startsWith('[')) {
    try {
      parsedBody = JSON.parse(rawBody);
      resLines.push(`${GREEN}   gelen yanıt (response):${RESET}\n${formatJson(parsedBody)}`);
    } catch {
      if (!isRawNumberDump(rawBody)) {
        resLines.push(`${GREEN}   gelen yanıt (raw):${RESET} ${rawBody}`);
      }
    }
  } else if (rawBody.trim().length > 0 && !isRawNumberDump(rawBody)) {
    resLines.push(`${GREEN}   gelen yanıt (text):${RESET} ${rawBody}`);
  }

  return { parsedBody, resLines, aiStream };
}

export function devLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env['NODE_ENV'] === 'production' || process.env['NODE_ENV'] === 'test') {
    next();
    return;
  }

  // Inspector'ın kendi SSE veya UI isteklerini loglamaktan kaçın (Döngü engelleme)
  if (shouldSkipInspection(req.originalUrl || req.url)) {
    next();
    return;
  }

  const startTime = Date.now();
  const id = `req_${randomUUID()}`;
  const timestamp = new Date().toISOString();
  const sanitizedHeaders = sanitizeHeaders(req.headers);
  const sanitizedBody = sanitizeBody(req.body);

  // 1. Terminal formatlı log satırları
  const separator = '─'.repeat(70);
  const reqLines: string[] = [
    `\n${DIM}${separator}${RESET}`,
    `${BOLD}${CYAN}▶ REQ${RESET}  ${BOLD}${req.method}${RESET} ${WHITE}${req.originalUrl}${RESET} ${DIM}[${new Date().toLocaleTimeString('tr-TR')}]${RESET}`,
  ];

  if (sanitizedHeaders['authorization']) {
    reqLines.push(`${DIM}   yetki (auth):${RESET}   ${sanitizedHeaders['authorization']}`);
  }
  if (sanitizedBody && Object.keys(sanitizedBody as object).length > 0) {
    reqLines.push(`${BLUE}   giden gövde (body):${RESET}\n${formatJson(sanitizedBody)}`);
  }

  // 2. Response Intercept
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

    let rawBody = Buffer.concat(chunks).toString('utf8');
    rawBody = tryDecodeByteString(rawBody);

    const { parsedBody, resLines, aiStream } = extractResponseDetails(rawBody);

    resLines.push(
      `${BOLD}${color}◀ RES${RESET}  ${color}${status}${RESET} ${DIM}(${duration}ms)${RESET}`,
      `${DIM}${separator}${RESET}\n`,
    );

    // 3. Yapılandırılmış veriyi DevInspectorHub'a ilet
    const trafficEntry: DevTrafficEntry = {
      id,
      timestamp,
      method: req.method,
      url: req.originalUrl || req.url,
      status,
      durationMs: duration,
      clientIp: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      request: {
        headers: sanitizedHeaders,
        body: sanitizedBody,
        query: req.query as Record<string, unknown>,
      },
      response: {
        status,
        body: parsedBody,
        streamSummary: aiStream ? aiStream.summary : undefined,
        isStream: Boolean(aiStream),
      },
      formattedText: [...reqLines, ...resLines].join('\n'),
    };

    devInspectorHub.emitTraffic(trafficEntry);

    return (originalEnd as Function).apply(res, [chunk, encodingOrCallback, callback]) as Response;
  } as typeof res.end;

  next();
}
