import { pool } from '../db.js';
import type pg from 'pg';
import { TIER_FEES, commissionFromBase, type Tier } from '../lib/pricing.js';

export interface CommissionRow {
  id: string;
  agent_id: string;
  microlender_id: string | null;
  application_id: string | null;
  period_month: string;
  type: 'onboarding' | 'monthly' | 'bonus' | 'adjustment';
  tier: string | null;
  rate_applied: string | null;
  base_amount: string | null;
  amount: string;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  paid_reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateOnboardingCommissionInput {
  agentId: string;
  microlenderId: string;
  applicationId: string;
  tier: Tier;
  rate: number;
}

export const firstOfMonth = (d = new Date()): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

export async function createOnboardingCommission(
  client: pg.PoolClient,
  input: CreateOnboardingCommissionInput,
): Promise<CommissionRow | null> {
  const base = TIER_FEES[input.tier].onboarding;
  if (base <= 0 || input.rate <= 0) return null;
  const amount = commissionFromBase(input.rate, base);
  const period = firstOfMonth();
  const { rows } = await client.query<CommissionRow>(
    `INSERT INTO nclms_agent_commissions
       (agent_id, microlender_id, application_id, period_month, type, tier, rate_applied, base_amount, amount)
     VALUES ($1, $2, $3, $4, 'onboarding', $5, $6, $7, $8)
     RETURNING *`,
    [input.agentId, input.microlenderId, input.applicationId, period, input.tier, input.rate, base, amount],
  );
  return rows[0] ?? null;
}

export async function generateMonthlyCommissions(
  period: string, // 'YYYY-MM-01'
): Promise<{ created: number; skipped: number }> {
  // Find all active microlenders with a referring agent, attempt to insert a monthly commission row.
  // The unique partial index protects against duplicates for the same (microlender, month).
  const { rows: pairs } = await pool.query<{
    agent_id: string;
    microlender_id: string;
    tier: Tier;
    rate: string;
  }>(
    `SELECT m.referred_by_agent_id AS agent_id,
            m.id                   AS microlender_id,
            m.tier::text           AS tier,
            a.commission_rate::text AS rate
       FROM nclms_microlenders m
       JOIN nclms_marketing_agents a ON a.id = m.referred_by_agent_id
       JOIN nclms_users u ON u.id = m.user_id
      WHERE m.referred_by_agent_id IS NOT NULL
        AND a.is_active = TRUE
        AND u.status = 'active'`,
  );

  let created = 0;
  let skipped = 0;
  for (const p of pairs) {
    const tierKey = (p.tier as Tier) in TIER_FEES ? (p.tier as Tier) : null;
    if (!tierKey) {
      skipped++;
      continue;
    }
    const rate = Number(p.rate);
    const base = TIER_FEES[tierKey].monthly;
    if (rate <= 0) { skipped++; continue; }
    const amount = commissionFromBase(rate, base);
    try {
      await pool.query(
        `INSERT INTO nclms_agent_commissions
           (agent_id, microlender_id, period_month, type, tier, rate_applied, base_amount, amount)
         VALUES ($1, $2, $3, 'monthly', $4, $5, $6, $7)`,
        [p.agent_id, p.microlender_id, period, tierKey, rate, base, amount],
      );
      created++;
    } catch (err) {
      // Unique constraint => already exists for this microlender + month.
      const code = (err as { code?: string }).code;
      if (code === '23505') skipped++;
      else throw err;
    }
  }
  return { created, skipped };
}

export async function markPaid(id: string, reference?: string | null): Promise<CommissionRow | null> {
  const { rows } = await pool.query<CommissionRow>(
    `UPDATE nclms_agent_commissions
        SET status = 'paid',
            paid_at = NOW(),
            paid_reference = $2,
            updated_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING *`,
    [id, reference ?? null],
  );
  return rows[0] ?? null;
}

export async function cancel(id: string, reason?: string | null): Promise<CommissionRow | null> {
  const { rows } = await pool.query<CommissionRow>(
    `UPDATE nclms_agent_commissions
        SET status = 'cancelled', updated_at = NOW(),
            notes  = COALESCE(notes, '') || CASE WHEN $2::text IS NULL OR $2::text = '' THEN '' ELSE E'\\n[cancelled] ' || $2::text END
      WHERE id = $1 AND status = 'pending'
      RETURNING *`,
    [id, reason ?? null],
  );
  return rows[0] ?? null;
}
