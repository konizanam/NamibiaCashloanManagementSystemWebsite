import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listCommissionsQuerySchema } from '../schemas/agent.js';
import {
  getAgentByUserId,
  getDashboardStats,
  listCommissionsForAgent,
  listReferredApplications,
  listReferredMicrolenders,
} from '../services/agentService.js';
import {
  confirmPayment,
  disputePayment,
  getCommissionById,
  getCommissionProof,
  requestPayment,
} from '../services/commissionService.js';
import { commissionsHelpers } from './commissions.js';
import { badRequest, notFound } from '../lib/errors.js';
import { logAudit } from '../lib/audit.js';
import {
  sendAdminAgentConfirmationEmail,
  sendAdminPaymentRequestEmail,
} from '../services/notificationService.js';

export const agentRouter = Router();

agentRouter.use(requireAuth, requireRole('marketing_agent'));

agentRouter.get('/me', async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const profile = await getAgentByUserId(user.sub);
    res.json({ agent: profile });
  } catch (err) {
    next(err);
  }
});

agentRouter.get('/dashboard', async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const profile = await getAgentByUserId(user.sub);
    const stats = await getDashboardStats(profile.id);
    res.json({ agent: profile, stats });
  } catch (err) {
    next(err);
  }
});

agentRouter.get(
  '/commissions',
  validate(listCommissionsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const profile = await getAgentByUserId(user.sub);
      const q = req.query as unknown as {
        status?: 'pending' | 'paid' | 'cancelled' | 'payment_requested' | 'awaiting_agent_confirmation' | 'disputed';
        type?: 'onboarding' | 'monthly' | 'bonus' | 'adjustment';
        period_month?: string;
        limit: number;
        offset: number;
      };
      const result = await listCommissionsForAgent(profile.id, q as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

agentRouter.get('/microlenders', async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const profile = await getAgentByUserId(user.sub);
    const items = await listReferredMicrolenders(profile.id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

agentRouter.get('/applications', async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const profile = await getAgentByUserId(user.sub);
    const items = await listReferredApplications(profile.id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Agent-side commission actions
// ---------------------------------------------------------------------------
async function getOwnedCommission(userId: string, commissionId: string) {
  const profile = await getAgentByUserId(userId);
  const row = await getCommissionById(commissionId);
  if (!row || row.agent_id !== profile.id) throw notFound('Commission not found.');
  return { profile, row };
}

agentRouter.post('/commissions/:id/confirm', async (req, res, next) => {
  try {
    const auth = (req as AuthedRequest).user!;
    const { profile, row } = await getOwnedCommission(auth.sub, req.params.id!);
    const updated = await confirmPayment(row.id, profile.id);
    if (!updated) throw badRequest('Commission is not awaiting your confirmation.');
    await logAudit({
      actorId: auth.sub,
      actorRole: auth.role,
      action: 'commissions.confirm',
      entityType: 'commission',
      entityId: row.id,
      ipAddress: req.ip,
    });
    void sendAdminAgentConfirmationEmail({
      adminRecipients: await commissionsHelpers.adminEmails(),
      agentName: profile.full_name,
      microlenderName: await commissionsHelpers.microlenderName(row.microlender_id),
      amount: Number(row.amount),
      confirmed: true,
    }).catch((e) => console.error('[email] admin confirmation email failed:', e));
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const disputeSchema = z.object({ reason: z.string().trim().min(3).max(2000) });

agentRouter.post('/commissions/:id/dispute', validate(disputeSchema), async (req, res, next) => {
  try {
    const auth = (req as AuthedRequest).user!;
    const { profile, row } = await getOwnedCommission(auth.sub, req.params.id!);
    const body = req.body as { reason: string };
    const updated = await disputePayment(row.id, profile.id, body.reason);
    if (!updated) throw badRequest('Commission is not awaiting your confirmation.');
    await logAudit({
      actorId: auth.sub,
      actorRole: auth.role,
      action: 'commissions.dispute',
      entityType: 'commission',
      entityId: row.id,
      metadata: { reason: body.reason },
      ipAddress: req.ip,
    });
    void sendAdminAgentConfirmationEmail({
      adminRecipients: await commissionsHelpers.adminEmails(),
      agentName: profile.full_name,
      microlenderName: await commissionsHelpers.microlenderName(row.microlender_id),
      amount: Number(row.amount),
      confirmed: false,
      disputeReason: body.reason,
    }).catch((e) => console.error('[email] admin dispute email failed:', e));
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const requestPaymentSchema = z.object({ message: z.string().trim().max(2000).optional() });

agentRouter.post(
  '/commissions/:id/request-payment',
  validate(requestPaymentSchema),
  async (req, res, next) => {
    try {
      const auth = (req as AuthedRequest).user!;
      const { profile, row } = await getOwnedCommission(auth.sub, req.params.id!);
      const body = req.body as { message?: string };
      const updated = await requestPayment(row.id, profile.id, body.message);
      if (!updated) throw badRequest('Only pending commissions can have payment requested.');
      await logAudit({
        actorId: auth.sub,
        actorRole: auth.role,
        action: 'commissions.request_payment',
        entityType: 'commission',
        entityId: row.id,
        metadata: { message: body.message ?? null },
        ipAddress: req.ip,
      });
      void sendAdminPaymentRequestEmail({
        adminRecipients: await commissionsHelpers.adminEmails(),
        agentName: profile.full_name,
        microlenderName: await commissionsHelpers.microlenderName(row.microlender_id),
        amount: Number(row.amount),
        periodMonth: row.period_month,
        message: body.message,
      }).catch((e) => console.error('[email] admin payment-request email failed:', e));
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

agentRouter.get('/commissions/:id/proof', async (req, res, next) => {
  try {
    const auth = (req as AuthedRequest).user!;
    const { profile, row } = await getOwnedCommission(auth.sub, req.params.id!);
    const proof = await getCommissionProof(row.id, profile.id);
    if (!proof) throw notFound('No proof of payment uploaded.');
    const inline = req.query.inline === '1' || req.query.inline === 'true';
    if (proof.mimeType) res.setHeader('Content-Type', proof.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(proof.fileName ?? 'proof')}"`,
    );
    res.send(proof.content);
  } catch (err) {
    next(err);
  }
});
