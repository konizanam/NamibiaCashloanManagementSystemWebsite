import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { config } from '../config.js';
import { badRequest } from './errors.js';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    cb(badRequest(`Unsupported file type: ${file.mimetype}. Allow PDF, PNG, JPG, WebP.`));
    return;
  }
  cb(null, true);
};

// In-memory buffer per upload — files land directly in DB, never on disk.
const memoryStorage = multer.memoryStorage();

export const applicationUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: config.maxUploadSize, files: 20 },
});

export const proofUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: config.maxUploadSize, files: 1 },
});
