import multer, { type FileFilterCallback } from 'multer';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { config } from '../config.js';
import { badRequest } from './errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const uploadsRoot = resolve(__dirname, '..', '..', 'uploads');
export const applicationsDir = resolve(uploadsRoot, 'applications');

await mkdir(applicationsDir, { recursive: true });

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, applicationsDir),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    cb(badRequest(`Unsupported file type: ${file.mimetype}. Allow PDF, PNG, JPG, WebP.`));
    return;
  }
  cb(null, true);
};

export const applicationUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.maxUploadSize, files: 20 },
});
