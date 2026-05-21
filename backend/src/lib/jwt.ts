import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';

export type Role = 'admin' | 'marketing_agent' | 'microlender';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export const signAuthToken = (payload: JwtPayload): string =>
  jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
  });

export const verifyAuthToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, config.jwt.secret);
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Invalid token payload');
  }
  return decoded as JwtPayload;
};
