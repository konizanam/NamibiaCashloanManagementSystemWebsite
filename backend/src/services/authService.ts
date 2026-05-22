import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { signAuthToken, type Role } from '../lib/jwt.js';
import { unauthorized, badRequest } from '../lib/errors.js';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  status: 'active' | 'suspended' | 'pending';
  must_change_password: boolean;
}

export const login = async (email: string, password: string) => {
  const { rows } = await pool.query<UserRow>(
    `SELECT id, email, password_hash, full_name, role, status, must_change_password
       FROM nclms_users
      WHERE email = $1`,
    [email.toLowerCase()],
  );
  const user = rows[0];
  if (!user) throw unauthorized('Invalid email or password');
  if (user.status !== 'active') throw unauthorized('Account is not active');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw unauthorized('Invalid email or password');

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
    },
  };
};

export const getMe = async (userId: string) => {
  const { rows } = await pool.query<{
    id: string;
    email: string;
    full_name: string;
    role: Role;
    status: string;
    must_change_password: boolean;
  }>(
    `SELECT id, email, full_name, role, status, must_change_password
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
