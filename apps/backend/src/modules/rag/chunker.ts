/**
 * @file chunker.ts
 * @description RAG Rekürsif Metin Parçalama Motoru (Recursive Character Text Splitter).
 * Doküman metinlerini paragraf, cümle ve kelime sınırlarını gözeterek anlam bütünlüğü
 * bozulmayacak şekilde yapılandırılabilir `chunkSize` ve `chunkOverlap` değerleriyle parçalara ayırır.
 *
 * Mimari Rol & Standartlar:
 * - Parçalar arası bağlamsal akış (Contextual Continuity): `chunkOverlap` sayesinde her parça
 *   bir önceki parçanın son kısmını içerir; cümle ortasında anlam kopması önlenir.
 * - Sayfa Farkındalığı (Page-Aware Chunking): Sayfa bazlı dokümanlarda her parçaya ait olduğu
 *   orijinal sayfa numarası metadata olarak iliştirilir.
 *
 * @example
 * ```typescript
 * import { recursiveChunker } from '#modules/rag/chunker.js';
 *
 * const chunks = recursiveChunker.splitText(largeDocumentText, {
 *   chunkSize: 1000,
 *   chunkOverlap: 200,
 * });
 * console.log(`Toplam ${chunks.length} parça oluşturuldu.`);
 * ```
 */

import { randomUUID } from 'node:crypto';
import type { ExtractedPage } from './extractors/extractor.types.js';

export interface DocumentChunk {
  id: string;
  chunkIndex: number;
  text: string;
  characterCount: number;
  pageNumber?: number;
  metadata?: Record<string, unknown>;
}

export interface ChunkerOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export class RecursiveCharacterChunker {
  private readonly defaultSeparators: string[] = [
    '\n\n', // Paragraflar
    '\n',   // Satırlar
    '. ',   // Cümle sonları
    '? ',   // Soru cümleleri
    '! ',   // Ünlem cümleleri
    '; ',   // Noktalı virgüller
    ', ',   // Virgüller
    ' ',    // Kelimeler
    '',     // Karakter bazlı son çare
  ];

  /**
   * Ham metni hiyerarşik ayraçlar ve örtüşme (overlap) kuralına göre parçalar.
   *
   * @param text Parçalanacak ham metin
   * @param options Parçalama boyutu ve örtüşme ayarları
   * @param baseMetadata Her parçaya eklenecek ortak üst veriler
   * @returns Üretilen parça nesneleri dizisi
   */
  splitText(
    text: string,
    options: ChunkerOptions = {},
    baseMetadata: Record<string, unknown> = {}
  ): DocumentChunk[] {
    const chunkSize = options.chunkSize ?? 1000;
    const chunkOverlap = options.chunkOverlap ?? 200;
    const separators = options.separators ?? this.defaultSeparators;

    const trimmed = text.trim();
    if (trimmed.length === 0) return [];

    const rawSplits = this.splitRecursive(trimmed, separators, chunkSize);
    const mergedTexts = this.mergeSplits(rawSplits, chunkSize, chunkOverlap);

    return mergedTexts.map((chunkText, index) => ({
      id: randomUUID(),
      chunkIndex: index,
      text: chunkText,
      characterCount: chunkText.length,
      metadata: { ...baseMetadata },
    }));
  }

  /**
   * Sayfa bazlı dokümanları sayfa numarası farkındalığıyla parçalar.
   *
   * @param pages Sayfa listesi
   * @param options Parçalama ayarları
   * @param baseMetadata Ortak üst veriler
   * @returns Sayfa numarası işlenmiş parça listesi
   */
  splitPages(
    pages: ExtractedPage[],
    options: ChunkerOptions = {},
    baseMetadata: Record<string, unknown> = {}
  ): DocumentChunk[] {
    const allChunks: DocumentChunk[] = [];
    let globalIndex = 0;

    for (const page of pages) {
      const pageText = page.text.trim();
      if (pageText.length === 0) continue;

      const pageChunks = this.splitText(pageText, options, {
        ...baseMetadata,
        pageNumber: page.pageNumber,
      });

      for (const chunk of pageChunks) {
        allChunks.push({
          ...chunk,
          chunkIndex: globalIndex++,
          pageNumber: page.pageNumber,
        });
      }
    }

    return allChunks;
  }

  /**
   * Ayraç öncelik sırasına göre metni rekürsif olarak böler.
   */
  private splitRecursive(text: string, separators: string[], chunkSize: number): string[] {
    if (text.length <= chunkSize || separators.length === 0) {
      return [text];
    }

    const separator = separators[0]!;
    const remainingSeparators = separators.slice(1);

    const parts = separator === '' ? text.split('') : text.split(separator);
    const result: string[] = [];

    for (const part of parts) {
      const trimmedPart = part.trim();
      if (trimmedPart.length === 0) continue;

      if (trimmedPart.length <= chunkSize) {
        result.push(trimmedPart);
      } else {
        const subSplits = this.splitRecursive(trimmedPart, remainingSeparators, chunkSize);
        result.push(...subSplits);
      }
    }

    return result;
  }

  /**
   * Küçük parçaları `chunkSize` sınırına kadar birleştirir ve `chunkOverlap` kadar geriden başlatır.
   */
  private mergeSplits(splits: string[], chunkSize: number, chunkOverlap: number): string[] {
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const split of splits) {
      const splitLength = split.length;

      // Parça boyutu aşıldıysa mevcut birikimi kaydet
      if (currentLength + splitLength > chunkSize && currentChunk.length > 0) {
        const fullChunk = currentChunk.join(' ').trim();
        if (fullChunk.length > 0) {
          chunks.push(fullChunk);
        }

        // Örtüşme (Overlap) hesapla: Geriye dönük birikim oluştur
        currentChunk = this.calculateOverlapSeed(currentChunk, chunkOverlap);
        currentLength = currentChunk.reduce((acc, s) => acc + s.length + 1, 0);
      }

      currentChunk.push(split);
      currentLength += splitLength + 1;
    }

    // Kalan son parçayı ekle
    if (currentChunk.length > 0) {
      const finalChunk = currentChunk.join(' ').trim();
      if (finalChunk.length > 0) {
        chunks.push(finalChunk);
      }
    }

    return chunks;
  }

  /**
   * Önceki parçanın sonundan `chunkOverlap` karakter kadar tohum (seed) oluşturur.
   */
  private calculateOverlapSeed(previousChunk: string[], chunkOverlap: number): string[] {
    const seed: string[] = [];
    let seedLength = 0;

    for (let i = previousChunk.length - 1; i >= 0; i--) {
      const piece = previousChunk[i]!;
      if (seedLength + piece.length <= chunkOverlap) {
        seed.unshift(piece);
        seedLength += piece.length + 1;
      } else {
        break;
      }
    }

    return seed;
  }
}

export const recursiveChunker = new RecursiveCharacterChunker();
