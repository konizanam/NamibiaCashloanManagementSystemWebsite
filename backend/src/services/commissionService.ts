import { pool } from '../db.js';
import type pg from 'pg';
import {
  TIER_FEES,
  ONBOARDING_COMMISSION_RATE,
  commissionFromBase,
  monthlyCommissionRate,
  type Tier,
} from '../lib/pricing.js';

export type CommissionStatus =
  | 'pending'
  | 'payment_requested'
  | 'awaiting_agent_confirmation'
  | 'paid'
  | 'disputed'
  | 'cancelled';

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
  status: CommissionStatus;
  paid_at: string | null;
  paid_reference: string | null;
  notes: string | null;
  created_at: string;
  proof_file_path: string | null;
  proof_file_name: string | null;
  proof_mime_type: string | null;
  proof_uploaded_at: string | null;
  payment_marked_at: string | null;
  agent_confirmed_at: string | null;
  agent_disputed_at: string | null;
  dispute_reason: string | null;
  payment_request_at: string | null;
  payment_request_message: string | null;
  last_reminder_at: string | null;
  reminder_count: number;
}

export interface CreateOnboardingCommissionInput {
  agentId: string;
  microlenderId: string;
  applicationId: string;
  tier: Tier;
}

export const firstOfMonth = (d = new Date()): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

const monthStart = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

/**
 * Onboarding commission: 15% of the tier's onboarding fee. One-off, on approval.
 * Per the Sales Agreement (clause 5.3), this is paid once-off and is independent
 * of the per-agent commission_rate field.
 */
export async function createOnboardingCommission(
  client: pg.PoolClient,
  input: CreateOnboardingCommissionInput,
): Promise<CommissionRow | null> {
  const base = TIER_FEES[input.tier].onboarding;
  if (base <= 0) return null;
  const rate = ONBOARDING_COMMISSION_RATE;
  const amount = commissionFromBase(rate, base);
  const period = firstOfMonth();
  const { rows } = await client.query<CommissionRow>(
    `INSERT INTO nclms_agent_commissions
       (agent_id, microlender_id, application_id, period_month, type, tier, rate_applied, base_amount, amount, notes)
     VALUES ($1, $2, $3, $4, 'onboarding', $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.agentId,
      input.microlenderId,
      input.applicationId,
      period,
      input.tier,
      rate,
      base,
      amount,
      'Onboarding (15% of onboarding fee per Sales Agreement clause 5.3).',
    ],
  );
  return rows[0] ?? null;
}

/**
 * Monthly commissions: for each active referred microlender, the rate depends
 * on how many months have elapsed since their subscription started.
 *   Months  0–23 : 25% (Year 1 & 2)
 *   Months 24–35 : 15% (Year 3)
 *   Months 36+   : 0  — skipped (Commission Period exhausted)
 */
export async function generateMonthlyCommissions(
  period: string, // 'YYYY-MM-01'
): Promise<{ created: number; skipped: number; expired: number }> {
  const { rows: pairs } = await pool.query<{
    agent_id: string;
    microlender_id: string;
    tier: Tier;
    activated_at: Date;
  }>(
    `SELECT m.referred_by_agent_id AS agent_id,
            m.id                   AS microlender_id,
            m.tier::text           AS tier,
            m.activated_at         AS activated_at
       FROM nclms_microlenders m
       JOIN nclms_marketing_agents a ON a.id = m.referred_by_agent_id
       JOIN nclms_users u ON u.id = m.user_id
      WHERE m.referred_by_agent_id IS NOT NULL
        AND a.is_active = TRUE
        AND u.status = 'active'`,
  );

  const periodDate = new Date(`${period}T00:00:00Z`);

  let created = 0;
  let skipped = 0;
  let expired = 0;

  for (const p of pairs) {
    const tierKey = (p.tier as Tier) in TIER_FEES ? (p.tier as Tier) : null;
    if (!tierKey) { skipped++; continue; }

    const activated = monthStart(new Date(p.activated_at));
    const rate = monthlyCommissionRate(activated, periodDate);
    if (rate === 0) { expired++; continue; }

    const base = TIER_FEES[tierKey].monthly;
    if (base <= 0) { skipped++; continue; }
    const amount = commissionFromBase(rate, base);

    try {
      await pool.query(
        `INSERT INTO nclms_agent_commissions
           (agent_id, microlender_id, period_month, type, tier, rate_applied, base_amount, amount, notes)
         VALUES ($1, $2, $3, 'monthly', $4, $5, $6, $7, $8)`,
        [p.agent_id, p.microlender_id, period, tierKey, rate, base, amount, `Monthly subscription commission (${rate}% per Sales Agreement clause 1.1.6).`],
      );
      created++;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === '23505') skipped++;
      else throw err;
    }
  }
  return { created, skipped, expired };
}

export interface MarkPaidInput {
  reference?: string | null;
  proof?: {
    filePath: string;
    fileName: string;
    mimeType: string;
  } | null;
}

/**
 * Admin marks the payment as made. Status moves to "awaiting_agent_confirmation".
 * The commission is not considered "paid" yet — the agent must confirm receipt.
 */
export async function markPaid(id: string, input: MarkPaidInput): Promise<CommissionRow | null> {
  const proof = input.proof ?? null;
  const { rows } = await pool.query<CommissionRow>(
    `UPDATE nclms_agent_commissions
        SET status = 'awaiting_agent_confirmation',
            paid_reference = $2,
            payment_marked_at = NOW(),
            proof_file_path = COALESCE($3, proof_file_path),
            proof_file_name = COALESCE($4, proof_file_name),
            proof_mime_type = COALESCE($5, proof_mime_type),
            proof_uploaded_at = CASE WHEN $3 IS NULL THEN proof_uploaded_at ELSE NOW() END,
            last_reminder_at = NULL,
            reminder_count = 0,
            updated_at = NOW()
      WHERE id = $1 AND status IN ('pending','payment_requested')
      RETURNING *`,
    [
      id,
      input.reference ?? null,
      proof?.filePath ?? null,
      proof?.fileName ?? null,
      proof?.mimeType ?? null,
    ],
  );
  return rows[0] ?? null;
}

/** Agent confirms receipt: status → paid. */
export async function confirmPayment(id: string, agentId: string): Promise<CommissionRow | null> {
  const { rows } = await pool.query<CommissionRow>(
    `UPDATE nclms_agent_commissions
        SET status = 'paid',
            agent_confirmed_at = NOW(),
            paid_at = COALESCE(paid_at, NOW()),
            last_reminder_at = NULL,
            updated_at = NOW()
      WHERE id = $1 AND agent_id = $2 AND status = 'awaiting_agent_confirmation'
      RETURNING *`,
    [id, agentId],
  );
  return rows[0] ?? null;
}

/** Agent disputes: status → disputed, captures reason. */
export async function disputePayment(
  id: string,
  agentId: string,
  reason: string,
): Promise<CommissionRow | null> {
  const { rows } = await pool.query<CommissionRow>(
    `UPDATE nclms_agent_commissions
        SET status = 'disputed',
            agent_disputed_at = NOW(),
            dispute_reason = $3,
            updated_at = NOW()
      WHERE id = $1 AND agent_id = $2 AND status = 'awaiting_agent_confirmation'
      RETURNING *`,
    [id, agentId, reason],
  );
  return rows[0] ?? null;
}

/** Agent formally requests payment for a pending commission. */
export async function requestPayment(
  id: string,
  agentId: string,
  message?: string,
): Promise<CommissionRow | null> {
  const { rows } = await pool.query<CommissionRow>(
    `UPDATE nclms_agent_commissions
        SET status = 'payment_requested',
            payment_request_at = NOW(),
            payment_request_message = $3,
            last_reminder_at = NULL,
            reminder_count = 0,
            updated_at = NOW()
      WHERE id = $1 AND agent_id = $2 AND status = 'pending'
      RETURNING *`,
    [id, agentId, message ?? null],
  );
  return rows[0] ?? null;
}

export async function cancel(id: string, reason?: string | null): Promise<CommissionRow | null> {
  const { rows } = await pool.query<CommissionRow>(
    `UPDATE nclms_agent_commissions
        SET status = 'cancelled', updated_at = NOW(),
            notes  = COALESCE(notes, '') || CASE WHEN $2::text IS NULL OR $2::text = '' THEN '' ELSE E'\\n[cancelled] ' || $2::text END
      WHERE id = $1 AND status IN ('pending','payment_requested','disputed')
      RETURNING *`,
    [id, reason ?? null],
  );
  return rows[0] ?? null;
}

export async function getCommissionById(id: string): Promise<CommissionRow | null> {
  const { rows } = await pool.query<CommissionRow>(
    `SELECT * FROM nclms_agent_commissions WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
