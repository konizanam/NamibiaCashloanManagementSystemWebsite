import type { Request, RequestHandler } from 'express';
import { verifyAuthToken, type JwtPayload, type Role } from '../lib/jwt.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next(unauthorized());
  try {
    (req as AuthedRequest).user = verifyAuthToken(token);
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    const user = (req as AuthedRequest).user;
    if (!user) return next(unauthorized());
    if (!roles.includes(user.role)) return next(forbidden('Insufficient role'));
    next();
  };

export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    (req as AuthedRequest).user = verifyAuthToken(token);
  } catch {
    /* ignore */
  }
  next();
};
