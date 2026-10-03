/**
 * @file ragService.ts
 * @description Kurumsal RAG Bilgi Bankası REST API entegrasyonu.
 * Doküman yükleme, listeleme, silme ve anlık semantik arama işlemlerini yönetir.
 */

import { apiFetch } from '#services/apiClient';
import type { RAGDocument, RagQueryResult } from '#types/rag.types';

/**
 * Kullanıcının rollerine göre erişim izni olan tüm dokümanları listeler.
 */
export async function getDocuments(query?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ documents: RAGDocument[]; total: number; page: number; totalPages: number }> {
  const searchParams = new URLSearchParams();
  if (query?.status) searchParams.set('status', query.status);
  if (query?.page) searchParams.set('page', query.page.toString());
  if (query?.limit) searchParams.set('limit', query.limit.toString());

  const queryString = searchParams.toString();
  const url = queryString ? `/api/rag/documents?${queryString}` : '/api/rag/documents';

  const res = await apiFetch<{
    success: boolean;
    data: {
      documents: RAGDocument[];
      total: number;
      page: number;
      totalPages: number;
    };
  }>(url);

  return res.data;
}

/**
 * Tekil bir dokümanın detayını getirir.
 */
export async function getDocumentById(id: string): Promise<RAGDocument> {
  const res = await apiFetch<{ success: boolean; data: RAGDocument }>(`/api/rag/documents/${id}`);
  return res.data;
}

/**
 * Yeni bir dokümanı (PDF, TXT, MD, CSV, JSON) backend BullMQ Ingestion kuyruğuna yükler.
 *
 * @param file Yüklenecek dosya nesnesi
 * @param title Doküman başlığı (isteğe bağlı)
 * @param allowedRoles Erişim izni verilecek roller (örn: ['hr', 'finance'], boşsa ['*'])
 */
export async function uploadDocument(
  file: File,
  title?: string,
  allowedRoles?: string[]
): Promise<RAGDocument> {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (allowedRoles && allowedRoles.length > 0) {
    formData.append('allowed_roles', JSON.stringify(allowedRoles));
  }

  const token =
    typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem('nexus_token')
      : null;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch('/api/rag/upload', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Dosya yükleme başarısız oldu (${response.status})`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Bir dokümanı MongoDB ve Qdrant vektör tabanından tamamen siler.
 */
export async function deleteDocument(id: string): Promise<void> {
  await apiFetch<{ success: boolean; message: string }>(`/api/rag/documents/${id}`, {
    method: 'DELETE',
  });
}

/**
 * RAG bilgi bankasında test veya anlık semantik arama yapar.
 */
export async function queryKnowledge(
  query: string,
  options?: {
    limit?: number;
    scoreThreshold?: number;
    documentIds?: string[];
  }
): Promise<RagQueryResult> {
  const res = await apiFetch<{ success: boolean; data: RagQueryResult }>('/api/rag/query', {
    method: 'POST',
    body: JSON.stringify({
      query,
      ...(options?.limit ? { limit: options.limit } : {}),
      ...(options?.scoreThreshold ? { score_threshold: options.scoreThreshold } : {}),
      ...(options?.documentIds && options.documentIds.length > 0
        ? { document_ids: options.documentIds }
        : {}),
    }),
  });

  return res.data;
}
