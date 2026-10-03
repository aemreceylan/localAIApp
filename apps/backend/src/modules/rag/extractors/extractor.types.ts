/**
 * @file extractor.types.ts
 * @description RAG Doküman Metin Çıkarıcıları (Text Extractors) Ortak Arayüz ve Tip Tanımları.
 * Farklı kurumsal dosya formatlarının (PDF, TXT, Markdown, vb.) metin içeriklerini
 * tek tip bir veri yapısına (`ExtractedDocument`) dönüştüren strateji sözleşmesidir.
 *
 * Mimari Rol & Tasarım Deseni:
 * - Design Pattern: Strategy Pattern (SOLID - Open/Closed & Interface Segregation).
 * - Format bağımsız metin çıkarımı.
 */

/**
 * Sayfa bazlı çıkarılan metin bloğu
 */
export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

/**
 * Bir dokümandan çıkarılan nihai metin ve üst veri sözleşmesi
 */
export interface ExtractedDocument {
  text: string;
  pageCount: number;
  pages: ExtractedPage[];
  metadata?: Record<string, unknown>;
}

/**
 * Metin Çıkarıcı Strateji Arayüzü (Strategy Pattern)
 */
export interface ITextExtractor {
  /**
   * Çıkarıcının verilen MIME türü veya dosya uzantısını destekleyip desteklemediğini bildirir.
   *
   * @param mimeType Dosyanın MIME türü (örn: 'application/pdf', 'text/plain')
   * @param extension Dosya uzantısı (örn: '.pdf', '.md')
   */
  supports(mimeType: string, extension: string): boolean;

  /**
   * Dosya içeriğini Buffer olarak alır ve temiz metin çıktısını üretir.
   *
   * @param buffer Dosya ikili (binary) verisi
   * @param filename Dosya adı (opsiyonel metadata için)
   * @returns Çıkarılan metin ve sayfa dökümü
   */
  extract(buffer: Buffer, filename?: string): Promise<ExtractedDocument>;
}
