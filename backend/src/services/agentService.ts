import { pool } from '../db.js';
import { notFound } from '../lib/errors.js';
import {
  TIER_FEES,
  commissionFromBase,
  monthlyCommissionRate,
  type Tier,
} from '../lib/pricing.js';

export interface AgentProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  referral_code: string;
  commission_rate: string;
  is_active: boolean;
  created_at: string;
}

export async function getAgentByUserId(userId: string): Promise<AgentProfile> {
  const { rows } = await pool.query<AgentProfile>(
    `SELECT a.id, a.user_id, u.full_name, u.email, u.phone,
            a.referral_code, a.commission_rate, a.is_active, a.created_at
       FROM nclms_marketing_agents a
       JOIN nclms_users u ON u.id = a.user_id
      WHERE a.user_id = $1`,
    [userId],
  );
  if (rows.length === 0) throw notFound('Marketing agent profile not found for this user.');
  return rows[0]!;
}

export interface DashboardStats {
  total_referred_applications: number;
  total_active_microlenders: number;
  total_earned_all_time: number;
  total_paid_all_time: number;
  total_pending: number;
  this_month_earned: number;
  projected_next_month: number;
}

export async function getDashboardStats(agentId: string): Promise<DashboardStats> {
  const [apps, microlenders, totals, thisMonth, projection] = await Promise.all([
    pool.query<{ c: string }>(`SELECT COUNT(*)::int AS c FROM nclms_microlender_applications WHERE referred_by_agent_id = $1`, [agentId]),
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::int AS c
         FROM nclms_microlenders m
         JOIN nclms_users u ON u.id = m.user_id
        WHERE m.referred_by_agent_id = $1 AND u.status = 'active'`,
      [agentId],
    ),
    pool.query<{ earned: string; paid: string; pending: string }>(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('pending','paid') THEN amount ELSE 0 END), 0)::text AS earned,
         COALESCE(SUM(CASE WHEN status = 'paid'    THEN amount ELSE 0 END), 0)::text AS paid,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0)::text AS pending
       FROM nclms_agent_commissions
       WHERE agent_id = $1`,
      [agentId],
    ),
    pool.query<{ amt: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS amt
         FROM nclms_agent_commissions
        WHERE agent_id = $1
          AND status IN ('pending','paid')
          AND period_month = date_trunc('month', NOW())::date`,
      [agentId],
    ),
    pool.query<{ tier: string | null; activated_at: Date }>(
      `SELECT m.tier::text AS tier, m.activated_at
         FROM nclms_microlenders m
         JOIN nclms_marketing_agents a ON a.id = m.referred_by_agent_id
         JOIN nclms_users u            ON u.id = m.user_id
        WHERE m.referred_by_agent_id = $1 AND u.status = 'active' AND a.is_active = TRUE`,
      [agentId],
    ),
  ]);

  // Projected next month: contractual rate applied to each active microlender's
  // tier monthly fee, depending on how many months elapsed since their subscription started.
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const projected = projection.rows.reduce((sum, r) => {
    const tier = r.tier as Tier | null;
    if (!tier || !(tier in TIER_FEES)) return sum;
    const activated = new Date(r.activated_at);
    const activatedMonth = new Date(Date.UTC(activated.getUTCFullYear(), activated.getUTCMonth(), 1));
    const rate = monthlyCommissionRate(activatedMonth, nextMonth);
    if (rate === 0) return sum;
    return sum + commissionFromBase(rate, TIER_FEES[tier].monthly);
  }, 0);

  return {
    total_referred_applications: Number(apps.rows[0]!.c),
    total_active_microlenders:   Number(microlenders.rows[0]!.c),
    total_earned_all_time:       Number(totals.rows[0]!.earned),
    total_paid_all_time:         Number(totals.rows[0]!.paid),
    total_pending:               Number(totals.rows[0]!.pending),
    this_month_earned:           Number(thisMonth.rows[0]!.amt),
    projected_next_month:        Math.round(projected * 100) / 100,
  };
}

export interface ListCommissionOpts {
  status?: 'pending' | 'paid' | 'cancelled';
  type?: 'onboarding' | 'monthly' | 'bonus' | 'adjustment';
  period_month?: string;
  limit: number;
  offset: number;
}

export async function listCommissionsForAgent(agentId: string, opts: ListCommissionOpts) {
  const where: string[] = ['c.agent_id = $1'];
  const params: unknown[] = [agentId];
  if (opts.status)       { params.push(opts.status);       where.push(`c.status = $${params.length}`); }
  if (opts.type)         { params.push(opts.type);         where.push(`c.type = $${params.length}`); }
  if (opts.period_month) { params.push(opts.period_month); where.push(`c.period_month = $${params.length}`); }

  params.push(opts.limit, opts.offset);
  const { rows } = await pool.query(
    `SELECT c.*,
            m.business_name AS microlender_name
       FROM nclms_agent_commissions c
       LEFT JOIN nclms_microlenders m ON m.id = c.microlender_id
      WHERE ${where.join(' AND ')}
      ORDER BY c.period_month DESC, c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const { rows: countRows } = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::int AS total FROM nclms_agent_commissions c WHERE ${where.join(' AND ')}`,
    params.slice(0, params.length - 2),
  );

  return {
    items: rows,
    total: Number(countRows[0]?.total ?? 0),
    limit: opts.limit,
    offset: opts.offset,
  };
}

export async function listReferredMicrolenders(agentId: string) {
  const { rows } = await pool.query(
    `SELECT m.id, m.business_name, m.city, m.country, m.tier,
            u.email, u.status, m.activated_at
       FROM nclms_microlenders m
       JOIN nclms_users u ON u.id = m.user_id
      WHERE m.referred_by_agent_id = $1
      ORDER BY m.activated_at DESC`,
    [agentId],
  );
  return rows;
}

export async function listReferredApplications(agentId: string) {
  const { rows } = await pool.query(
    `SELECT id, business_name, status, city, country, submitted_at, reviewed_at
       FROM nclms_microlender_applications
       WHERE referred_by_agent_id = $1
       ORDER BY submitted_at DESC`,
    [agentId],
  );
  return rows;
}
