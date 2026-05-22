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

// ---------------------------------------------------------------------------
// Two-factor challenge tokens — issued after a valid password login when the
// account has 2FA enabled. The applicant must then POST the OTP back along
// with this token to receive the real auth token.
// ---------------------------------------------------------------------------

export interface TwoFactorChallengePayload {
  type: '2fa_challenge';
  sub: string;
}

export const signTwoFactorChallenge = (userId: string): string =>
  jwt.sign({ type: '2fa_challenge', sub: userId } satisfies TwoFactorChallengePayload, config.jwt.secret, {
    expiresIn: '10m' as SignOptions['expiresIn'],
  });

export const verifyTwoFactorChallenge = (token: string): TwoFactorChallengePayload => {
  const decoded = jwt.verify(token, config.jwt.secret);
  if (typeof decoded === 'string') throw new Error('Invalid token');
  const p = decoded as TwoFactorChallengePayload;
  if (p.type !== '2fa_challenge' || !p.sub) throw new Error('Invalid 2FA challenge token');
  return p;
};

// ---------------------------------------------------------------------------
// Application resubmit tokens — used when an admin asks for more information.
// The token lets the applicant edit + resubmit their application via a public
// URL without needing an account.
// ---------------------------------------------------------------------------

export interface ResubmitTokenPayload {
  type: 'app_resubmit';
  applicationId: string;
}

export const signResubmitToken = (applicationId: string): string =>
  jwt.sign(
    { type: 'app_resubmit', applicationId } satisfies ResubmitTokenPayload,
    config.jwt.secret,
    { expiresIn: config.jwt.passwordSetupExpiresIn as SignOptions['expiresIn'] },
  );

export const verifyResubmitToken = (token: string): ResubmitTokenPayload => {
  const decoded = jwt.verify(token, config.jwt.secret);
  if (typeof decoded === 'string') throw new Error('Invalid token');
  const payload = decoded as ResubmitTokenPayload;
  if (payload.type !== 'app_resubmit' || !payload.applicationId) {
    throw new Error('Invalid resubmit token payload');
  }
  return payload;
};
