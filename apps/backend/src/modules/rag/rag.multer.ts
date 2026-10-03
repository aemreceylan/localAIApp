/**
 * @file rag.multer.ts
 * @description RAG Doküman Yükleme Multer Middleware Yapılandırması.
 * Kullanıcıların yüklediği PDF, metin, markdown, csv ve json dosyalarını
 * güvenli geçici depolama alanına (`uploads/rag/`) yazar.
 *
 * Güvenlik & Doğrulama:
 * - MIME Türü ve Uzantı Beyaz Listesi: Yalnızca metin ve PDF türlerine izin verilir.
 * - Dosya Boyutu Sınırı: Maksimum 25 MB (`25 * 1024 * 1024`).
 * - Benzersiz Güvenli Dosya Adı: `crypto.randomUUID()` ile dosya adı çakışmaları ve dizin atlatma (path traversal) önlenir.
 */

import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { ValidationError } from '#shared/errors/index.js';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/rag');

// Yükleme dizini yoksa oluştur
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const EXTENSION_MIME_MAP: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.txt': ['text/plain'],
  '.md': ['text/markdown', 'text/x-markdown', 'text/plain'],
  '.markdown': ['text/markdown', 'text/x-markdown', 'text/plain'],
  '.csv': ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
  '.tsv': ['text/tab-separated-values', 'text/plain'],
  '.json': ['application/json', 'text/plain'],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = Object.hasOwn(EXTENSION_MIME_MAP, ext) ? ext : '.txt';
    const safeName = `${randomUUID()}${safeExt}`;
    cb(null, safeName);
  },
});

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  const allowedMimes = EXTENSION_MIME_MAP[ext];
  // Hem uzantı beyaz listede olmalı HEM de MIME türü o uzantıyla uyuşmalı (AND prensibi)
  if (allowedMimes && (allowedMimes.includes(mime) || mime === 'application/octet-stream')) {
    cb(null, true);
  } else {
    cb(
      new ValidationError(
        `Desteklenmeyen veya geçersiz dosya formatı: '${ext || mime}'. Desteklenen formatlar: PDF (.pdf), Metin (.txt, .md, .csv, .tsv, .json).`
      )
    );
  }
};

export const ragMulter = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
    files: 1, // Tek seferde tek dosya yükleme
  },
});
