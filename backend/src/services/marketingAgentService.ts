import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../db.js';
import { conflict, notFound } from '../lib/errors.js';
import { generateReferralCode } from '../lib/referralCode.js';
import { sendAgentWelcomeEmail } from './notificationService.js';
import { enforcePasswordPolicy } from '../lib/passwordPolicy.js';
import type {
  CreateMarketingAgentInput,
} from '../schemas/marketingAgent.js';

export interface MarketingAgentRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  referral_code: string;
  commission_rate: string;
  is_active: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

const SELECT_AGENT = `
  SELECT a.id, a.user_id, u.full_name, u.email, u.phone,
         a.referral_code, a.commission_rate, a.is_active, a.notes,
         a.created_at, a.updated_at
    FROM nclms_marketing_agents a
    JOIN nclms_users u ON u.id = a.user_id
`;

export const createMarketingAgent = async (
  input: CreateMarketingAgentInput,
): Promise<MarketingAgentRow> => {
  enforcePasswordPolicy(input.password);
  const agent = await withTransaction(async (client) => {
    const { rows: existing } = await client.query<{ id: string; role: string }>(
      `SELECT id, role FROM nclms_users WHERE email = $1`,
      [input.email.toLowerCase()],
    );
    if (existing.length > 0) {
      throw conflict(`An account with this email already exists (role: ${existing[0]!.role}).`);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const { rows: userRows } = await client.query<{ id: string }>(
      `INSERT INTO nclms_users (email, password_hash, full_name, phone, role, status, must_change_password)
       VALUES ($1, $2, $3, $4, 'marketing_agent', 'active', TRUE)
       RETURNING id`,
      [input.email.toLowerCase(), passwordHash, input.full_name, input.phone ?? null],
    );
    const userId = userRows[0]!.id;

    let referralCode = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateReferralCode(8);
      const { rows: clash } = await client.query<{ id: string }>(
        `SELECT id FROM nclms_marketing_agents WHERE referral_code = $1`,
        [candidate],
      );
      if (clash.length === 0) {
        referralCode = candidate;
        break;
      }
    }
    if (!referralCode) throw conflict('Could not allocate a unique referral code; try again.');

    const { rows: agentRows } = await client.query<{ id: string }>(
      `INSERT INTO nclms_marketing_agents
         (user_id, referral_code, commission_rate, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, referralCode, input.commission_rate, input.notes ?? null],
    );

    const { rows } = await client.query<MarketingAgentRow>(
      `${SELECT_AGENT} WHERE a.id = $1`,
      [agentRows[0]!.id],
    );
    return rows[0]!;
  });

  // Welcome email with credentials and the agent's referral code (fire-and-forget).
  void sendAgentWelcomeEmail({
    email: agent.email,
    fullName: agent.full_name,
    temporaryPassword: input.password,
    referralCode: agent.referral_code,
  }).catch((e) => console.error('[email] agent welcome failed:', e));

  return agent;
};

export const listMarketingAgents = async (): Promise<MarketingAgentRow[]> => {
  const { rows } = await pool.query<MarketingAgentRow>(
    `${SELECT_AGENT} ORDER BY a.created_at DESC`,
  );
  return rows;
};

export const getMarketingAgent = async (id: string): Promise<MarketingAgentRow> => {
  const { rows } = await pool.query<MarketingAgentRow>(
    `${SELECT_AGENT} WHERE a.id = $1`,
    [id],
  );
  if (rows.length === 0) throw notFound('Marketing agent not found');
  return rows[0]!;
};

export interface UpdateAgentInput {
  full_name?: string;
  phone?: string | null;
  commission_rate?: number;
  is_active?: boolean;
  notes?: string | null;
}

export const updateMarketingAgent = async (
  id: string,
  input: UpdateAgentInput,
): Promise<MarketingAgentRow> => {
  return withTransaction(async (client) => {
    const { rows: existing } = await client.query<{ user_id: string }>(
      `SELECT user_id FROM nclms_marketing_agents WHERE id = $1`,
      [id],
    );
    if (existing.length === 0) throw notFound('Marketing agent not found');
    const userId = existing[0]!.user_id;

    if (input.full_name !== undefined || input.phone !== undefined) {
      await client.query(
        `UPDATE nclms_users
            SET full_name = COALESCE($2, full_name),
                phone = COALESCE($3, phone),
                updated_at = NOW()
          WHERE id = $1`,
        [userId, input.full_name ?? null, input.phone ?? null],
      );
    }

    await client.query(
      `UPDATE nclms_marketing_agents
          SET commission_rate = COALESCE($2, commission_rate),
              is_active       = COALESCE($3, is_active),
              notes           = COALESCE($4, notes),
              updated_at      = NOW()
        WHERE id = $1`,
      [
        id,
        input.commission_rate ?? null,
        input.is_active ?? null,
        input.notes ?? null,
      ],
    );

    const { rows } = await client.query<MarketingAgentRow>(
      `${SELECT_AGENT} WHERE a.id = $1`,
      [id],
    );
    return rows[0]!;
  });
};
