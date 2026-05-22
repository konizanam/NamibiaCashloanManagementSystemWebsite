import { createHash, randomBytes, randomInt } from 'node:crypto';

export const generateOtp = (): string => String(randomInt(100000, 1000000));

export const generateResetToken = (): string => randomBytes(32).toString('hex');

export const sha256Hex = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

export const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};
