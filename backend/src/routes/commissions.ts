import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  cancel,
  generateMonthlyCommissions,
  markPaid,
  firstOfMonth,
} from '../services/commissionService.js';
import { listCommissionsForAgent } from '../services/agentService.js';
import { pool } from '../db.js';
import { generateMonthlySchema, listCommissionsQuerySchema, markPaidSchema } from '../schemas/agent.js';
import { logAudit } from '../lib/audit.js';

export const commissionsRouter = Router();

commissionsRouter.use(requireAuth, requireRole('admin'));

// Admin: list any agent's commissions (filterable + agent_id required for now).
const adminListSchema = listCommissionsQuerySchema.extend({
  agent_id: z.string().uuid().optional(),
});

commissionsRouter.get('/', validate(adminListSchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as unknown as {
      agent_id?: string;
      status?: 'pending' | 'paid' | 'cancelled';
      type?: 'onboarding' | 'monthly' | 'bonus' | 'adjustment';
      period_month?: string;
      limit: number;
      offset: number;
    };
    if (q.agent_id) {
      const result = await listCommissionsForAgent(q.agent_id, {
        status: q.status,
        type: q.type,
        period_month: q.period_month,
        limit: q.limit,
        offset: q.offset,
      });
      res.json(result);
      return;
    }
    // No agent filter — return totals across the system (lightweight summary).
    const where: string[] = [];
    const params: unknown[] = [];
    if (q.status)       { params.push(q.status);       where.push(`c.status = $${params.length}`); }
    if (q.type)         { params.push(q.type);         where.push(`c.type = $${params.length}`); }
    if (q.period_month) { params.push(q.period_month); where.push(`c.period_month = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(q.limit, q.offset);
    const { rows } = await pool.query(
      `SELECT c.*, m.business_name AS microlender_name, u.full_name AS agent_name
         FROM nclms_agent_commissions c
         JOIN nclms_marketing_agents a ON a.id = c.agent_id
         JOIN nclms_users u ON u.id = a.user_id
         LEFT JOIN nclms_microlenders m ON m.id = c.microlender_id
         ${whereSql}
         ORDER BY c.period_month DESC, c.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::int AS total FROM nclms_agent_commissions c ${whereSql}`,
      params.slice(0, params.length - 2),
    );
    res.json({
      items: rows,
      total: Number(countRows[0]?.total ?? 0),
      limit: q.limit,
      offset: q.offset,
    });
  } catch (err) {
    next(err);
  }
});

commissionsRouter.post('/generate-monthly', validate(generateMonthlySchema), async (req, res, next) => {
  try {
    const auth = (req as AuthedRequest).user!;
    const body = req.body as { period_month: string };
    const result = await generateMonthlyCommissions(body.period_month || firstOfMonth());
    await logAudit({
      actorId: auth.sub,
      actorRole: auth.role,
      action: 'commissions.generate_monthly',
      metadata: { period_month: body.period_month, ...result },
      ipAddress: req.ip,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

commissionsRouter.post(
  '/:id/mark-paid',
  validate(markPaidSchema),
  async (req, res, next) => {
    try {
      const auth = (req as AuthedRequest).user!;
      const body = req.body as { reference?: string };
      const row = await markPaid(req.params.id!, body.reference);
      if (!row) {
        res.status(409).json({ error: 'conflict', message: 'Commission is not pending or does not exist.' });
        return;
      }
      await logAudit({
        actorId: auth.sub,
        actorRole: auth.role,
        action: 'commissions.mark_paid',
        entityType: 'commission',
        entityId: row.id,
        metadata: { reference: body.reference ?? null },
        ipAddress: req.ip,
      });
      res.json(row);
    } catch (err) {
      next(err);
    }
  },
);

commissionsRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const auth = (req as AuthedRequest).user!;
    const reason = (req.body as { reason?: string })?.reason;
    const row = await cancel(req.params.id!, reason);
    if (!row) {
      res.status(409).json({ error: 'conflict', message: 'Commission is not pending or does not exist.' });
      return;
    }
    await logAudit({
      actorId: auth.sub,
      actorRole: auth.role,
      action: 'commissions.cancel',
      entityType: 'commission',
      entityId: row.id,
      metadata: { reason: reason ?? null },
      ipAddress: req.ip,
    });
    res.json(row);
  } catch (err) {
    next(err);
  }
});
