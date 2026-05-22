import { Router } from 'express';
import { z } from 'zod';
import { resolve } from 'node:path';
import { unlink } from 'node:fs/promises';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  cancel,
  generateMonthlyCommissions,
  getCommissionById,
  markPaid,
  firstOfMonth,
} from '../services/commissionService.js';
import { listCommissionsForAgent } from '../services/agentService.js';
import { pool } from '../db.js';
import { proofUpload } from '../lib/upload.js';
import {
  generateMonthlySchema,
  listCommissionsQuerySchema,
} from '../schemas/agent.js';
import { logAudit } from '../lib/audit.js';
import { notFound } from '../lib/errors.js';
import { sendAgentPaymentMarkedEmail } from '../services/notificationService.js';

export const commissionsRouter = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function adminEmails(): Promise<string[]> {
  const { rows } = await pool.query<{ email: string }>(
    `SELECT email FROM nclms_users WHERE role = 'admin' AND status = 'active'`,
  );
  return rows.map((r) => r.email);
}

async function agentContact(agentId: string): Promise<{ email: string; full_name: string } | null> {
  const { rows } = await pool.query<{ email: string; full_name: string }>(
    `SELECT u.email, u.full_name
       FROM nclms_marketing_agents a
       JOIN nclms_users u ON u.id = a.user_id
      WHERE a.id = $1`,
    [agentId],
  );
  return rows[0] ?? null;
}

async function microlenderName(microlenderId: string | null): Promise<string> {
  if (!microlenderId) return '—';
  const { rows } = await pool.query<{ business_name: string }>(
    `SELECT business_name FROM nclms_microlenders WHERE id = $1`,
    [microlenderId],
  );
  return rows[0]?.business_name ?? '—';
}

// ---------------------------------------------------------------------------
// ADMIN routes
// ---------------------------------------------------------------------------
const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

const adminListSchema = listCommissionsQuerySchema.extend({
  agent_id: z.string().uuid().optional(),
});

adminRouter.get('/', validate(adminListSchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as unknown as {
      agent_id?: string;
      status?: 'pending' | 'payment_requested' | 'awaiting_agent_confirmation' | 'paid' | 'disputed' | 'cancelled';
      type?: 'onboarding' | 'monthly' | 'bonus' | 'adjustment';
      period_month?: string;
      limit: number;
      offset: number;
    };
    if (q.agent_id) {
      const result = await listCommissionsForAgent(q.agent_id, {
        status: q.status as never,
        type: q.type,
        period_month: q.period_month,
        limit: q.limit,
        offset: q.offset,
      });
      res.json(result);
      return;
    }
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

adminRouter.post('/generate-monthly', validate(generateMonthlySchema), async (req, res, next) => {
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

adminRouter.post(
  '/:id/mark-paid',
  proofUpload.single('proof'),
  async (req, res, next) => {
    let savedPath: string | null = null;
    try {
      const auth = (req as AuthedRequest).user!;
      const reference = (req.body as { reference?: string }).reference;
      const file = req.file;
      if (file) savedPath = file.path;

      const row = await markPaid(req.params.id!, {
        reference,
        proof: file
          ? { filePath: file.path, fileName: file.originalname, mimeType: file.mimetype }
          : null,
      });
      if (!row) {
        if (savedPath) await unlink(savedPath).catch(() => undefined);
        res.status(409).json({ error: 'conflict', message: 'Commission is not pending/requested or does not exist.' });
        return;
      }
      await logAudit({
        actorId: auth.sub,
        actorRole: auth.role,
        action: 'commissions.mark_paid',
        entityType: 'commission',
        entityId: row.id,
        metadata: { reference: reference ?? null, has_proof: !!file },
        ipAddress: req.ip,
      });

      // Notify the agent so they can confirm receipt.
      const agent = await agentContact(row.agent_id);
      if (agent) {
        void sendAgentPaymentMarkedEmail({
          agentEmail: agent.email,
          agentName: agent.full_name,
          microlenderName: await microlenderName(row.microlender_id),
          amount: Number(row.amount),
          reference: reference,
          periodMonth: row.period_month,
          hasProof: !!file,
        }).catch((e) => console.error('[email] payment-marked email failed:', e));
      }
      res.json(row);
    } catch (err) {
      if (savedPath) await unlink(savedPath).catch(() => undefined);
      next(err);
    }
  },
);

adminRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const auth = (req as AuthedRequest).user!;
    const reason = (req.body as { reason?: string })?.reason;
    const row = await cancel(req.params.id!, reason);
    if (!row) {
      res.status(409).json({ error: 'conflict', message: 'Commission cannot be cancelled in its current state.' });
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

// Admin downloads / views a commission's proof file.
adminRouter.get('/:id/proof', async (req, res, next) => {
  try {
    const row = await getCommissionById(req.params.id!);
    if (!row || !row.proof_file_path) throw notFound('No proof of payment uploaded.');
    const absolute = resolve(row.proof_file_path);
    const inline = req.query.inline === '1' || req.query.inline === 'true';
    if (inline) {
      if (row.proof_mime_type) res.setHeader('Content-Type', row.proof_mime_type);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.proof_file_name ?? 'proof')}"`);
      res.sendFile(absolute);
    } else {
      res.download(absolute, row.proof_file_name ?? 'proof');
    }
  } catch (err) {
    next(err);
  }
});

commissionsRouter.use('/', adminRouter);

// Helpers used by routes/agent.ts for agent-side commission actions.
export const commissionsHelpers = {
  adminEmails,
  agentContact,
  microlenderName,
};
