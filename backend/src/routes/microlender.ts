import { Router } from 'express';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { pool } from '../db.js';
import { notFound } from '../lib/errors.js';

export const microlenderRouter = Router();

microlenderRouter.use(requireAuth, requireRole('microlender'));

interface ProfileRow {
  id: string;
  user_id: string;
  business_name: string;
  namfisa_reg_no: string | null;
  business_type: string | null;
  physical_address: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  tier: 'tier1' | 'tier2' | 'tier3' | 'tier4';
  application_id: string | null;
  activated_at: string;
  email: string;
  full_name: string;
  agent_name: string | null;
  agent_email: string | null;
  agent_phone: string | null;
}

async function loadProfile(userId: string): Promise<ProfileRow> {
  const { rows } = await pool.query<ProfileRow>(
    `SELECT m.id, m.user_id, m.business_name, m.namfisa_reg_no, m.business_type,
            m.physical_address, m.city, m.country, m.phone, m.tier::text AS tier,
            m.application_id, m.activated_at,
            u.email, u.full_name,
            au.full_name AS agent_name, au.email AS agent_email, au.phone AS agent_phone
       FROM nclms_microlenders m
       JOIN nclms_users u ON u.id = m.user_id
       LEFT JOIN nclms_marketing_agents a ON a.id = m.referred_by_agent_id
       LEFT JOIN nclms_users au ON au.id = a.user_id
      WHERE m.user_id = $1`,
    [userId],
  );
  if (rows.length === 0) throw notFound('Microlender profile not found.');
  return rows[0]!;
}

microlenderRouter.get('/me', async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const profile = await loadProfile(user.sub);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

microlenderRouter.get('/dashboard', async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const profile = await loadProfile(user.sub);

    const { rows: messages } = profile.application_id
      ? await pool.query(
          `SELECT id, author_name, subject, body, created_at
             FROM nclms_application_messages
            WHERE application_id = $1
            ORDER BY created_at DESC
            LIMIT 10`,
          [profile.application_id],
        )
      : { rows: [] };

    res.json({ profile, recent_messages: messages });
  } catch (err) {
    next(err);
  }
});
