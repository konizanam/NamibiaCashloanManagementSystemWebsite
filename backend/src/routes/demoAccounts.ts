import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logAudit } from '../lib/audit.js';
import {
  listDemoAccounts,
  resendDemoActivation,
  type ListDemoAccountsQuery,
} from '../services/demoAccountService.js';

export const demoAccountsRouter = Router();

demoAccountsRouter.use(requireAuth, requireRole('admin'));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const listDemoAccountsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  verified: z.enum(['true', 'false']).optional(),
  loggedIn: z.enum(['true', 'false']).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  sort: z.enum(['newest', 'oldest', 'last_login', 'company']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

demoAccountsRouter.get(
  '/',
  validate(listDemoAccountsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      res.json(await listDemoAccounts(req.query as unknown as ListDemoAccountsQuery));
    } catch (err) {
      next(err);
    }
  },
);

const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });

demoAccountsRouter.post(
  '/:id/resend-activation',
  validate(idParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const auth = (req as AuthedRequest).user!;
      const id = (req.params as unknown as { id: number }).id;
      const result = await resendDemoActivation(id);
      await logAudit({
        actorId: auth.sub,
        actorRole: auth.role,
        action: 'demo_account.resend_activation',
        entityType: 'demo_account',
        // entity_id is a UUID column; CMS tenant ids are integers.
        metadata: { tenant_id: id, email: result.email },
        ipAddress: req.ip,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
