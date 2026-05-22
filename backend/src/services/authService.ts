import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import {
  signAuthToken,
  signTwoFactorChallenge,
  verifyTwoFactorChallenge,
  type Role,
} from '../lib/jwt.js';
import { unauthorized, badRequest, notFound } from '../lib/errors.js';
import { generateOtp, generateResetToken, sha256Hex } from '../lib/codes.js';
import {
  sendTwoFactorCodeEmail,
  sendPasswordResetEmail,
} from './notificationService.js';
import { config } from '../config.js';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  status: 'active' | 'suspended' | 'pending';
  must_change_password: boolean;
  two_factor_enabled: boolean;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: Role;
    must_change_password: boolean;
    two_factor_enabled: boolean;
  };
}

export interface LoginChallenge {
  requires_2fa: true;
  challenge_token: string;
  email_masked: string;
}

const OTP_TTL_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;
const RESET_TTL_HOURS = 1;

const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const head = name.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
};

async function issueOtp(userId: string, email: string, fullName: string): Promise<void> {
  const code = generateOtp();
  const hash = sha256Hex(code);
  await pool.query(
    `UPDATE nclms_users
        SET two_factor_code_hash = $2,
            two_factor_code_expires_at = NOW() + INTERVAL '${OTP_TTL_MIN} minutes',
            two_factor_attempts = 0,
            updated_at = NOW()
      WHERE id = $1`,
    [userId, hash],
  );
  await sendTwoFactorCodeEmail({ email, fullName, code, ttlMinutes: OTP_TTL_MIN });
}

export const login = async (email: string, password: string): Promise<LoginResult | LoginChallenge> => {
  const { rows } = await pool.query<UserRow>(
    `SELECT id, email, password_hash, full_name, role, status,
            must_change_password, two_factor_enabled
       FROM nclms_users
      WHERE email = $1`,
    [email.toLowerCase()],
  );
  const user = rows[0];
  if (!user) throw unauthorized('Invalid email or password');
  if (user.status !== 'active') throw unauthorized('Account is not active');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw unauthorized('Invalid email or password');

  if (user.two_factor_enabled) {
    await issueOtp(user.id, user.email, user.full_name);
    return {
      requires_2fa: true,
      challenge_token: signTwoFactorChallenge(user.id),
      email_masked: maskEmail(user.email),
    };
  }

  await pool.query(`UPDATE nclms_users SET last_login_at = NOW() WHERE id = $1`, [user.id]);
  const token = signAuthToken({ sub: user.id, email: user.email, role: user.role });
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      must_change_password: user.must_change_password,
      two_factor_enabled: user.two_factor_enabled,
    },
  };
};

export const verifyTwoFactor = async (
  challengeToken: string,
  code: string,
): Promise<LoginResult> => {
  let payload;
  try { payload = verifyTwoFactorChallenge(challengeToken); }
  catch { throw unauthorized('Verification code expired. Please sign in again.'); }

  const { rows } = await pool.query<UserRow & { two_factor_code_hash: string | null; two_factor_code_expires_at: Date | null; two_factor_attempts: number }>(
    `SELECT id, email, password_hash, full_name, role, status,
            must_change_password, two_factor_enabled,
            two_factor_code_hash, two_factor_code_expires_at, two_factor_attempts
       FROM nclms_users WHERE id = $1`,
    [payload.sub],
  );
  const user = rows[0];
  if (!user) throw unauthorized('Account not found');
  if (user.status !== 'active') throw unauthorized('Account is not active');
  if (!user.two_factor_enabled) {
    // 2FA was turned off after the challenge was issued — just authorise.
    const token = signAuthToken({ sub: user.id, email: user.email, role: user.role });
    return {
      token,
      user: {
        id: user.id, email: user.email, full_name: user.full_name, role: user.role,
        must_change_password: user.must_change_password, two_factor_enabled: false,
      },
    };
  }

  if (!user.two_factor_code_hash || !user.two_factor_code_expires_at) {
    throw unauthorized('No verification code on file. Please sign in again.');
  }
  if (user.two_factor_code_expires_at.getTime() < Date.now()) {
    throw unauthorized('Verification code expired. Please request a new one.');
  }
  if (user.two_factor_attempts >= OTP_MAX_ATTEMPTS) {
    throw unauthorized('Too many failed attempts. Please sign in again.');
  }

  if (sha256Hex(code) !== user.two_factor_code_hash) {
    await pool.query(
      `UPDATE nclms_users SET two_factor_attempts = two_factor_attempts + 1, updated_at = NOW() WHERE id = $1`,
      [user.id],
    );
    throw unauthorized('Incorrect verification code.');
  }

  await pool.query(
    `UPDATE nclms_users
        SET two_factor_code_hash = NULL,
            two_factor_code_expires_at = NULL,
            two_factor_attempts = 0,
            last_login_at = NOW(),
            updated_at = NOW()
      WHERE id = $1`,
    [user.id],
  );

  const token = signAuthToken({ sub: user.id, email: user.email, role: user.role });
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      must_change_password: user.must_change_password,
      two_factor_enabled: user.two_factor_enabled,
    },
  };
};

export const resendTwoFactor = async (challengeToken: string): Promise<{ email_masked: string }> => {
  let payload;
  try { payload = verifyTwoFactorChallenge(challengeToken); }
  catch { throw unauthorized('Verification code expired. Please sign in again.'); }
  const { rows } = await pool.query<{ id: string; email: string; full_name: string; status: string; two_factor_enabled: boolean }>(
    `SELECT id, email, full_name, status, two_factor_enabled FROM nclms_users WHERE id = $1`,
    [payload.sub],
  );
  const u = rows[0];
  if (!u || u.status !== 'active' || !u.two_factor_enabled) throw unauthorized('Cannot resend.');
  await issueOtp(u.id, u.email, u.full_name);
  return { email_masked: maskEmail(u.email) };
};

export const getMe = async (userId: string) => {
  const { rows } = await pool.query<{
    id: string;
    email: string;
    full_name: string;
    role: Role;
    status: string;
    must_change_password: boolean;
    two_factor_enabled: boolean;
  }>(
    `SELECT id, email, full_name, role, status, must_change_password, two_factor_enabled
       FROM nclms_users WHERE id = $1`,
    [userId],
  );
  return rows[0] ?? null;
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  if (newPassword.length < 8) throw badRequest('New password must be at least 8 characters.');
  if (newPassword === currentPassword) {
    throw badRequest('New password must be different from your current one.');
  }

  const { rows } = await pool.query<{ password_hash: string }>(
    `SELECT password_hash FROM nclms_users WHERE id = $1`,
    [userId],
  );
  const user = rows[0];
  if (!user) throw unauthorized('User not found');

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) throw unauthorized('Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    `UPDATE nclms_users
        SET password_hash = $2,
            must_change_password = FALSE,
            updated_at = NOW()
      WHERE id = $1`,
    [userId, newHash],
  );
};

// ---------------------------------------------------------------------------
// Two-factor enable / disable
// ---------------------------------------------------------------------------
export const enableTwoFactor = async (userId: string, password: string): Promise<void> => {
  const { rows } = await pool.query<{ password_hash: string }>(
    `SELECT password_hash FROM nclms_users WHERE id = $1`,
    [userId],
  );
  const user = rows[0];
  if (!user) throw notFound('User not found');
  if (!(await bcrypt.compare(password, user.password_hash))) {
    throw unauthorized('Current password is incorrect.');
  }
  await pool.query(
    `UPDATE nclms_users SET two_factor_enabled = TRUE, updated_at = NOW() WHERE id = $1`,
    [userId],
  );
};

export const disableTwoFactor = async (userId: string, password: string): Promise<void> => {
  const { rows } = await pool.query<{ password_hash: string }>(
    `SELECT password_hash FROM nclms_users WHERE id = $1`,
    [userId],
  );
  const user = rows[0];
  if (!user) throw notFound('User not found');
  if (!(await bcrypt.compare(password, user.password_hash))) {
    throw unauthorized('Current password is incorrect.');
  }
  await pool.query(
    `UPDATE nclms_users
        SET two_factor_enabled = FALSE,
            two_factor_code_hash = NULL,
            two_factor_code_expires_at = NULL,
            two_factor_attempts = 0,
            updated_at = NOW()
      WHERE id = $1`,
    [userId],
  );
};

// ---------------------------------------------------------------------------
// Forgot / reset password
// ---------------------------------------------------------------------------

/**
 * Always behaves the same regardless of whether the email exists, to avoid
 * leaking account presence. Emails out the link if a match exists.
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  const { rows } = await pool.query<{ id: string; email: string; full_name: string; status: string }>(
    `SELECT id, email, full_name, status FROM nclms_users WHERE email = $1`,
    [email.toLowerCase()],
  );
  const user = rows[0];
  if (!user || user.status !== 'active') return;

  const token = generateResetToken();
  const hash = sha256Hex(token);
  await pool.query(
    `UPDATE nclms_users
        SET password_reset_token_hash = $2,
            password_reset_expires_at = NOW() + INTERVAL '${RESET_TTL_HOURS} hour',
            updated_at = NOW()
      WHERE id = $1`,
    [user.id, hash],
  );

  const url = `${config.appBaseUrl.replace(/\/$/, '')}/reset-password/${token}`;
  await sendPasswordResetEmail({
    email: user.email,
    fullName: user.full_name,
    resetUrl: url,
    ttlHours: RESET_TTL_HOURS,
  });
};

export const resetPasswordWithToken = async (token: string, newPassword: string): Promise<void> => {
  if (newPassword.length < 8) throw badRequest('New password must be at least 8 characters.');
  const hash = sha256Hex(token);
  const { rows } = await pool.query<{ id: string; password_reset_expires_at: Date | null }>(
    `SELECT id, password_reset_expires_at FROM nclms_users WHERE password_reset_token_hash = $1`,
    [hash],
  );
  const user = rows[0];
  if (!user || !user.password_reset_expires_at) throw unauthorized('Reset link is invalid or has already been used.');
  if (user.password_reset_expires_at.getTime() < Date.now()) {
    throw unauthorized('Reset link has expired. Please request a new one.');
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    `UPDATE nclms_users
        SET password_hash = $2,
            password_reset_token_hash = NULL,
            password_reset_expires_at = NULL,
            must_change_password = FALSE,
            updated_at = NOW()
      WHERE id = $1`,
    [user.id, newHash],
  );
};
