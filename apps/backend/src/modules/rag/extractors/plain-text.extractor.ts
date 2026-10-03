/**
 * @file plain-text.extractor.ts
 * @description Düz Metin (TXT, Markdown, CSV, JSON) Metin Çıkarıcı Stratejisi.
 * UTF-8 karakter kodlamasıyla metinleri okur, satır sonlarını normalize eder
 * ve sayfa/bölüm bloklarını yapılandırır.
 *
 * Mimari Rol & Tasarım Deseni:
 * - Design Pattern: Concrete Strategy (ITextExtractor implementasyonu).
 *
 * @example
 * ```typescript
 * import { PlainTextExtractor } from '#modules/rag/extractors/plain-text.extractor.js';
 *
 * const extractor = new PlainTextExtractor();
 * const doc = await extractor.extract(buffer, 'rehber.md');
 * console.log(doc.text, doc.pageCount);
 * ```
 */

import type { ITextExtractor, ExtractedDocument, ExtractedPage } from './extractor.types.js';

export class PlainTextExtractor implements ITextExtractor {
  private readonly supportedExtensions = new Set([
    '.txt',
    '.md',
    '.markdown',
    '.csv',
    '.tsv',
    '.json',
  ]);

  private readonly supportedMimes = new Set([
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'text/csv',
    'text/tab-separated-values',
    'application/json',
  ]);

  supports(mimeType: string, extension: string): boolean {
    const ext = extension.toLowerCase();
    const mime = mimeType.toLowerCase();
    return this.supportedExtensions.has(ext) || this.supportedMimes.has(mime);
  }

  async extract(buffer: Buffer, filename?: string): Promise<ExtractedDocument> {
    const rawText = buffer.toString('utf-8');
    // Satır sonlarını CRLF -> LF olarak normalize et
    const normalizedText = rawText.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim();

    // Form feed (\f) karakteri varsa sayfalara ayır, yoksa tek sayfa kabul et
    const pageChunks = normalizedText.split('\f');
    const pages: ExtractedPage[] = [];

    for (let i = 0; i < pageChunks.length; i++) {
      const pageText = pageChunks[i]?.trim();
      if (pageText && pageText.length > 0) {
        pages.push({
          pageNumber: i + 1,
          text: pageText,
        });
      }
    }

    // Eğer form feed yoksa veya boşsa tüm metni 1. sayfa olarak ekle
    if (pages.length === 0 && normalizedText.length > 0) {
      pages.push({
        pageNumber: 1,
        text: normalizedText,
      });
    }

    return {
      text: normalizedText,
      pageCount: Math.max(1, pages.length),
      pages,
      metadata: {
        filename,
        characterCount: normalizedText.length,
        format: 'plain-text',
      },
    };
  }
}

export const plainTextExtractor = new PlainTextExtractor();
