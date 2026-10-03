/**
 * @file rag.types.ts
 * @description RAG (Retrieval-Augmented Generation) doküman parçaları, alıntılar ve vektör arama tipleri.
 */

/**
 * Backend Qdrant ve Vercel AI SDK DataStream'den dönen onaylı alıntı (Citation) formatı.
 */
export interface RagCitation {
  documentId: string;
  documentTitle?: string;
  chunkIndex: number;
  text: string;
  score: number; // Cosine benzerlik skoru (0.0 - 1.0)
  pageNumber?: number;
  metadata?: Record<string, unknown>;
}

/**
 * UI bileşenlerinde gösterilen zenginleştirilmiş alıntı öğesi.
 */
export interface CitationItem {
  id: string; // "cite-1" veya "chunk-0"
  documentId: string;
  documentTitle?: string;
  filename: string;
  pageNumber?: number;
  chunkIndex: number;
  similarityPercentage: number; // 0 - 100 (%88 vb.)
  vectorScore: number;
  excerpt: string;
  highlightedTerm?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Kullanıcının erişebildiği ve sisteme yüklenen kurumsal doküman modeli.
 */
export interface RAGDocument {
  _id: string;
  title: string;
  file_name: string;
  file_path?: string;
  file_size: number;
  mime_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count: number;
  allowed_roles: string[];
  uploaded_by?: string;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Backend /api/rag/query arama sonucu zarfı.
 */
export interface RagQueryResult {
  query: string;
  totalMatches: number;
  citations: RagCitation[];
}
