import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../db.js';
import { conflict, notFound } from '../lib/errors.js';

export interface MicrolenderListRow {
  id: string;
  user_id: string;
  business_name: string;
  namfisa_reg_no: string | null;
  business_type: string | null;
  city: string | null;
  country: string;
  tier: 'tier1' | 'tier2' | 'tier3' | 'tier4';
  activated_at: string;
  email: string;
  full_name: string;
  user_status: 'active' | 'suspended' | 'pending';
  agent_id: string | null;
  agent_name: string | null;
  agent_referral_code: string | null;
}

export interface MicrolenderDetailRow extends MicrolenderListRow {
  physical_address: string | null;
  phone: string | null;
  application_id: string | null;
  agent_email: string | null;
  agent_phone: string | null;
}

const SELECT_LIST = `
  SELECT m.id, m.user_id, m.business_name, m.namfisa_reg_no, m.business_type,
         m.city, m.country, m.tier::text AS tier, m.activated_at,
         u.email, u.full_name, u.status AS user_status,
         a.id AS agent_id, au.full_name AS agent_name, a.referral_code AS agent_referral_code
    FROM nclms_microlenders m
    JOIN nclms_users u ON u.id = m.user_id
    LEFT JOIN nclms_marketing_agents a ON a.id = m.referred_by_agent_id
    LEFT JOIN nclms_users au ON au.id = a.user_id
`;

const SELECT_DETAIL = `
  SELECT m.id, m.user_id, m.business_name, m.namfisa_reg_no, m.business_type,
         m.physical_address, m.city, m.country, m.phone, m.tier::text AS tier,
         m.application_id, m.activated_at,
         u.email, u.full_name, u.status AS user_status,
         a.id AS agent_id, au.full_name AS agent_name, au.email AS agent_email,
         au.phone AS agent_phone, a.referral_code AS agent_referral_code
    FROM nclms_microlenders m
    JOIN nclms_users u ON u.id = m.user_id
    LEFT JOIN nclms_marketing_agents a ON a.id = m.referred_by_agent_id
    LEFT JOIN nclms_users au ON au.id = a.user_id
`;

export interface ListOpts {
  q?: string;
  status?: 'active' | 'suspended' | 'pending';
  tier?: 'tier1' | 'tier2' | 'tier3' | 'tier4';
  limit: number;
  offset: number;
}

export async function listMicrolenders(opts: ListOpts) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.q) {
    params.push(`%${opts.q}%`);
    where.push(`(m.business_name ILIKE $${params.length} OR m.namfisa_reg_no ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (opts.status) { params.push(opts.status); where.push(`u.status = $${params.length}`); }
  if (opts.tier)   { params.push(opts.tier);   where.push(`m.tier = $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  params.push(opts.limit, opts.offset);
  const { rows } = await pool.query<MicrolenderListRow>(
    `${SELECT_LIST}
      ${whereSql}
      ORDER BY m.activated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const { rows: countRows } = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::int AS total
       FROM nclms_microlenders m
       JOIN nclms_users u ON u.id = m.user_id
       ${whereSql}`,
    params.slice(0, params.length - 2),
  );

  return {
    items: rows,
    total: Number(countRows[0]?.total ?? 0),
    limit: opts.limit,
    offset: opts.offset,
  };
}

export async function getMicrolender(id: string): Promise<MicrolenderDetailRow> {
  const { rows } = await pool.query<MicrolenderDetailRow>(
    `${SELECT_DETAIL} WHERE m.id = $1`,
    [id],
  );
  if (rows.length === 0) throw notFound('Microlender not found.');
  return rows[0]!;
}

export interface CreateMicrolenderInput {
  business_name: string;
  namfisa_reg_no: string;
  business_type: string;
  physical_address?: string | null;
  city: string;
  country: string;
  phone?: string | null;
  business_email: string;
  full_name: string;
  password: string;
  tier: 'tier1' | 'tier2' | 'tier3' | 'tier4';
  referred_by_agent_id?: string | null;
}

export async function createMicrolender(input: CreateMicrolenderInput): Promise<MicrolenderDetailRow> {
  const email = input.business_email.toLowerCase();

  // Uniqueness: NAMFISA reg no across both applications and existing microlenders.
  const { rows: dupMl } = await pool.query<{ id: string }>(
    `SELECT id FROM nclms_microlenders WHERE namfisa_reg_no = $1`,
    [input.namfisa_reg_no],
  );
  if (dupMl.length > 0) throw conflict('A microlender with this NAMFISA Reg No already exists.');

  const { rows: dupUser } = await pool.query<{ id: string; role: string }>(
    `SELECT id, role FROM nclms_users WHERE email = $1`,
    [email],
  );
  if (dupUser.length > 0) {
    throw conflict(`An account with this email already exists (role: ${dupUser[0]!.role}).`);
  }

  const id = await withTransaction(async (client) => {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const { rows: userRows } = await client.query<{ id: string }>(
      `INSERT INTO nclms_users (email, password_hash, full_name, phone, role, status, must_change_password)
       VALUES ($1, $2, $3, $4, 'microlender', 'active', TRUE)
       RETURNING id`,
      [email, passwordHash, input.full_name, input.phone ?? null],
    );
    const userId = userRows[0]!.id;

    const { rows: mlRows } = await client.query<{ id: string }>(
      `INSERT INTO nclms_microlenders (
         user_id, business_name, namfisa_reg_no, business_type,
         physical_address, city, country, phone, tier, referred_by_agent_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        userId,
        input.business_name,
        input.namfisa_reg_no,
        input.business_type,
        input.physical_address ?? null,
        input.city,
        input.country,
        input.phone ?? null,
        input.tier,
        input.referred_by_agent_id ?? null,
      ],
    );
    return mlRows[0]!.id;
  });

  return getMicrolender(id);
}

export interface UpdateMicrolenderInput {
  business_name?: string;
  namfisa_reg_no?: string;
  business_type?: string;
  physical_address?: string | null;
  city?: string;
  country?: string;
  phone?: string | null;
  tier?: 'tier1' | 'tier2' | 'tier3' | 'tier4';
  user_status?: 'active' | 'suspended';
  full_name?: string;
  email?: string;
  referred_by_agent_id?: string | null;
}

export async function updateMicrolender(
  id: string,
  input: UpdateMicrolenderInput,
): Promise<MicrolenderDetailRow> {
  const current = await getMicrolender(id);

  // Uniqueness re-checks.
  if (input.namfisa_reg_no && input.namfisa_reg_no !== current.namfisa_reg_no) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM nclms_microlenders WHERE namfisa_reg_no = $1 AND id <> $2`,
      [input.namfisa_reg_no, id],
    );
    if (rows.length > 0) throw conflict('Another microlender already uses this NAMFISA Reg No.');
  }
  if (input.email && input.email.toLowerCase() !== current.email.toLowerCase()) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM nclms_users WHERE email = $1 AND id <> $2`,
      [input.email.toLowerCase(), current.user_id],
    );
    if (rows.length > 0) throw conflict('Another account already uses this email.');
  }

  await withTransaction(async (client) => {
    // 1) Microlender row.
    const mlSetters: string[] = [];
    const mlParams: unknown[] = [];
    const mlSet = (col: string, v: unknown) => {
      if (v === undefined) return;
      mlParams.push(v);
      mlSetters.push(`${col} = $${mlParams.length}`);
    };
    mlSet('business_name', input.business_name);
    mlSet('namfisa_reg_no', input.namfisa_reg_no);
    mlSet('business_type', input.business_type);
    mlSet('physical_address', input.physical_address);
    mlSet('city', input.city);
    mlSet('country', input.country);
    mlSet('phone', input.phone);
    mlSet('tier', input.tier);
    mlSet('referred_by_agent_id', input.referred_by_agent_id);
    if (mlSetters.length > 0) {
      mlSetters.push(`updated_at = NOW()`);
      mlParams.push(id);
      await client.query(
        `UPDATE nclms_microlenders SET ${mlSetters.join(', ')} WHERE id = $${mlParams.length}`,
        mlParams,
      );
    }

    // 2) User row.
    const uSetters: string[] = [];
    const uParams: unknown[] = [];
    const uSet = (col: string, v: unknown) => {
      if (v === undefined) return;
      uParams.push(v);
      uSetters.push(`${col} = $${uParams.length}`);
    };
    uSet('full_name', input.full_name);
    uSet('email', input.email?.toLowerCase());
    uSet('phone', input.phone);
    uSet('status', input.user_status);
    if (uSetters.length > 0) {
      uSetters.push(`updated_at = NOW()`);
      uParams.push(current.user_id);
      await client.query(
        `UPDATE nclms_users SET ${uSetters.join(', ')} WHERE id = $${uParams.length}`,
        uParams,
      );
    }
  });

  return getMicrolender(id);
}
