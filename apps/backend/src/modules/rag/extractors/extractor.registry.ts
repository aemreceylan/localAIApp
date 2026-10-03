/**
 * @file extractor.registry.ts
 * @description Metin Çıkarıcıları Merkezi Sicil ve Yönlendirici (Strategy & Registry Pattern).
 * Yüklenen dosyanın MIME türü ve dosya uzantısına göre en uygun çıkarıcıyı belirler.
 * Open/Closed Prensibine (OCP) tam uyumludur; sisteme yeni dosya formatları eklenirken
 * mevcut kodlar değiştirilmeden `registerExtractor` ile genişletilebilir.
 *
 * Mimari Rol:
 * - Strategy Registry & Factory (SOLID - Single Responsibility & Open/Closed Principle)
 *
 * @example
 * ```typescript
 * import { extractorRegistry } from '#modules/rag/extractors/extractor.registry.js';
 *
 * const doc = await extractorRegistry.extract(fileBuffer, 'yonetmelik.pdf', 'application/pdf');
 * console.log(doc.text);
 * ```
 */

import path from 'node:path';
import { ValidationError } from '#shared/errors/index.js';
import type { ITextExtractor, ExtractedDocument } from './extractor.types.js';
import { plainTextExtractor } from './plain-text.extractor.js';
import { pdfExtractor } from './pdf.extractor.js';

export class ExtractorRegistry {
  private readonly extractors: ITextExtractor[] = [];

  constructor() {
    // Varsayılan çıkarıcıları kaydet
    this.registerExtractor(pdfExtractor);
    this.registerExtractor(plainTextExtractor);
  }

  /**
   * Sisteme yeni bir metin çıkarıcı stratejisi kaydeder (OCP).
   *
   * @param extractor Eklenen metin çıkarıcı örneği
   */
  registerExtractor(extractor: ITextExtractor): void {
    this.extractors.push(extractor);
  }

  /**
   * Verilen dosya adı ve MIME türünü işleyebilen uygun çıkarıcıyı bulur.
   *
   * @param mimeType Dosya MIME türü (örn: 'application/pdf')
   * @param filename Dosya adı (uzantı tespiti için)
   * @returns İlgili ITextExtractor örneği
   * @throws ValidationError Desteklenmeyen bir dosya formatı gelirse fırlatılır
   */
  getExtractor(mimeType: string, filename: string): ITextExtractor {
    const ext = path.extname(filename).toLowerCase();
    const cleanMime = (mimeType || '').toLowerCase();

    for (const extractor of this.extractors) {
      if (extractor.supports(cleanMime, ext)) {
        return extractor;
      }
    }

    throw new ValidationError(
      `Desteklenmeyen dosya formatı: '${ext || cleanMime}'. Desteklenen formatlar: PDF (.pdf), Metin (.txt, .md, .csv, .json).`,
      { filename, mimeType, extension: ext }
    );
  }

  /**
   * Dosya içeriğini ilgili çıkarıcı ile otomatik olarak ayıklar.
   *
   * @param buffer Dosya ikili verisi
   * @param filename Dosya adı
   * @param mimeType Dosya MIME türü
   */
  async extract(buffer: Buffer, filename: string, mimeType: string): Promise<ExtractedDocument> {
    const extractor = this.getExtractor(mimeType, filename);
    return await extractor.extract(buffer, filename);
  }
}

export const extractorRegistry = new ExtractorRegistry();
