import bcrypt from 'bcryptjs';
import { pool } from './db.js';

async function seedAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME ?? 'NCLMS Admin';

  if (!email || !password) {
    console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env before running seed.');
    process.exit(1);
  }

  const existing = await pool.query<{ id: string; role: string }>(
    'SELECT id, role FROM nclms_users WHERE email = $1',
    [email],
  );

  if ((existing.rowCount ?? 0) > 0) {
    const row = existing.rows[0]!;
    console.log(`admin already exists: ${email} (role=${row.role})`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { rows } = await pool.query<{ id: string; email: string }>(
    `INSERT INTO nclms_users (email, password_hash, full_name, role, status)
     VALUES ($1, $2, $3, 'admin', 'active')
     RETURNING id, email`,
    [email, passwordHash, fullName],
  );

  console.log(`created admin: ${rows[0]!.email} (id=${rows[0]!.id})`);
}

seedAdmin()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
