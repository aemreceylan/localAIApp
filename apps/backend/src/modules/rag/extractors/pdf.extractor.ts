/**
 * @file pdf.extractor.ts
 * @description Kurumsal PDF Doküman Metin Çıkarıcı Stratejisi.
 * `pdf-parse` motoru ile ikili (binary) PDF verisinden ham metni,
 * sayfa numaralarını ve sayfa bazlı metin bloklarını ayıklar.
 *
 * Mimari Rol & Tasarım Deseni:
 * - Design Pattern: Concrete Strategy (ITextExtractor implementasyonu).
 *
 * @example
 * ```typescript
 * import { pdfExtractor } from '#modules/rag/extractors/pdf.extractor.js';
 *
 * const doc = await pdfExtractor.extract(pdfBuffer, 'yonetmelik.pdf');
 * console.log(`Toplam ${doc.pageCount} sayfa metin ayıklandı.`);
 * ```
 */

import { PDFParse } from 'pdf-parse';
import type { ITextExtractor, ExtractedDocument, ExtractedPage } from './extractor.types.js';

export class PdfExtractor implements ITextExtractor {
  supports(mimeType: string, extension: string): boolean {
    const ext = extension.toLowerCase();
    const mime = mimeType.toLowerCase();
    return ext === '.pdf' || mime === 'application/pdf';
  }

  async extract(buffer: Buffer, filename?: string): Promise<ExtractedDocument> {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      const pages: ExtractedPage[] = [];

      if (result.pages && Array.isArray(result.pages)) {
        for (const p of result.pages) {
          const normalized = p.text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim();
          if (normalized.length > 0) {
            pages.push({
              pageNumber: p.num,
              text: normalized,
            });
          }
        }
      }

      const cleanText = result.text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim();

      const finalPages = pages.length > 0 ? pages : [{ pageNumber: 1, text: cleanText }];

      return {
        text: cleanText,
        pageCount: finalPages.length,
        pages: finalPages,
        metadata: {
          filename,
          pageCount: finalPages.length,
          characterCount: cleanText.length,
          format: 'pdf',
        },
      };
    } finally {
      await parser.destroy();
    }
  }
}

export const pdfExtractor = new PdfExtractor();
