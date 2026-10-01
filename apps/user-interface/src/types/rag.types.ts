/**
 * @file rag.types.ts
 * @description RAG (Retrieval-Augmented Generation) doküman parçaları, alıntılar ve vektör arama tipleri.
 */

export interface CitationItem {
  id: string; // Örn: "cite-1" veya "chunk-082"
  documentId: string;
  filename: string;
  pageNumber?: number;
  sectionTitle?: string;
  chunkIndex: number;
  similarityPercentage: number; // Örn: 94 (%94 Eşleşme)
  vectorScore: number; // Örn: 0.9412
  excerpt: string; // Vurgulu veya tam alıntı metni
  highlightedTerm?: string;
  mimeType?: string;
}
