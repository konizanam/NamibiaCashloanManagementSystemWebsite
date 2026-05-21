import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { HttpError } from '../lib/errors.js';
import { config } from '../config.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Request validation failed',
      details: err.flatten(),
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json({
      error: 'upload_error',
      message: err.message,
      details: { field: err.field, code: err.code },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: 'internal_error',
    message: config.env === 'production' ? 'Internal server error' : (err as Error)?.message,
  });
};
