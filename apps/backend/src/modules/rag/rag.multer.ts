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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${randomUUID()}${ext}`;
    cb(null, safeName);
  },
});

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt', '.md', '.markdown', '.csv', '.tsv', '.json']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/csv',
  'text/tab-separated-values',
  'application/json',
]);

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (ALLOWED_EXTENSIONS.has(ext) || ALLOWED_MIME_TYPES.has(mime)) {
    cb(null, true);
  } else {
    cb(
      new ValidationError(
        `Desteklenmeyen dosya formatı: '${ext || mime}'. Desteklenen formatlar: PDF (.pdf), Metin (.txt, .md, .csv, .json).`
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
