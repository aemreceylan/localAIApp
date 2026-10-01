/**
 * @file chatService.spec.ts
 * @description Vercel AI SDK Data Stream ve SSE akış çözümleme motorunu doğrulayan birim testleri.
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { streamChat } from '#services/chatService';

describe('chatService Unit Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mock.reset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('Vercel AI SDK 0:"token" veri akışını doğru ayrıştırıp birleştirmelidir', async () => {
    // Simüle edilmiş stream yanıtı: 0:"Merhaba " \n 0:"Dünya!"
    const streamChunks = [
      new TextEncoder().encode('0:"Merhaba "\n'),
      new TextEncoder().encode('0:"Dünya!"\n'),
    ];

    let readIndex = 0;
    const mockReadableStream = {
      getReader: () => ({
        read: () => {
          if (readIndex < streamChunks.length) {
            return Promise.resolve({ done: false, value: streamChunks[readIndex++] });
          }
          return Promise.resolve({ done: true, value: undefined });
        },
      }),
    };

    const mockFetch = mock.fn(async () => ({
      ok: true,
      body: mockReadableStream,
    }));
    global.fetch = mockFetch as unknown as typeof fetch;

    const receivedTokens: string[] = [];
    let finishedText = '';
    let finishedMeta: { latencyMs?: number; tokens?: number } | undefined;

    await streamChat(
      {
        messages: [{ role: 'user', content: 'Selam' }],
        model: 'llama3.3:70b',
      },
      {
        onChunk: (token) => {
          receivedTokens.push(token);
        },
        onFinish: (full, meta) => {
          finishedText = full;
          finishedMeta = meta;
        },
      }
    );

    assert.deepEqual(receivedTokens, ['Merhaba ', 'Dünya!']);
    assert.equal(finishedText, 'Merhaba Dünya!');
    assert.ok(finishedMeta);
    assert.ok((finishedMeta.tokens ?? 0) > 0);
  });

  it('sunucu 502 veya hata döndürdüğünde onError callback fonksiyonunu çağırmalıdır', async () => {
    const errorBody = {
      success: false,
      error: { code: 'OLLAMA_OFFLINE', message: 'Ollama servisine erişilemiyor.' },
    };

    const mockFetch = mock.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => errorBody,
    }));
    global.fetch = mockFetch as unknown as typeof fetch;

    let errorReceived: Error | null = null;

    await streamChat(
      {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'llama3.3:70b',
      },
      {
        onChunk: () => {},
        onError: (err) => {
          errorReceived = err;
        },
      }
    );

    assert.ok(errorReceived);
    assert.equal((errorReceived as Error).message, 'Ollama servisine erişilemiyor.');
  });
});
