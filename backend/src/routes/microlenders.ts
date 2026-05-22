import { Router } from 'express';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createMicrolender,
  getMicrolender,
  listMicrolenders,
  updateMicrolender,
} from '../services/microlenderAdminService.js';
import {
  createMicrolenderSchema,
  listMicrolendersQuerySchema,
  updateMicrolenderSchema,
} from '../schemas/microlender.js';
import { logAudit } from '../lib/audit.js';

export const microlendersRouter = Router();

microlendersRouter.use(requireAuth, requireRole('admin'));

microlendersRouter.get(
  '/',
  validate(listMicrolendersQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as {
        q?: string;
        status?: 'active' | 'suspended' | 'pending';
        tier?: 'tier1' | 'tier2' | 'tier3' | 'tier4';
        limit: number;
        offset: number;
      };
      const result = await listMicrolenders(q);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

microlendersRouter.post(
  '/',
  validate(createMicrolenderSchema),
  async (req, res, next) => {
    try {
      const auth = (req as AuthedRequest).user!;
      const ml = await createMicrolender(req.body);
      await logAudit({
        actorId: auth.sub,
        actorRole: auth.role,
        action: 'microlender.create',
        entityType: 'microlender',
        entityId: ml.id,
        metadata: { business_name: ml.business_name, tier: ml.tier },
        ipAddress: req.ip,
      });
      res.status(201).json(ml);
    } catch (err) {
      next(err);
    }
  },
);

microlendersRouter.get('/:id', async (req, res, next) => {
  try {
    const ml = await getMicrolender(req.params.id!);
    res.json(ml);
  } catch (err) {
    next(err);
  }
});

microlendersRouter.patch(
  '/:id',
  validate(updateMicrolenderSchema),
  async (req, res, next) => {
    try {
      const auth = (req as AuthedRequest).user!;
      const body = req.body as Record<string, unknown>;
      const ml = await updateMicrolender(req.params.id!, body);
      await logAudit({
        actorId: auth.sub,
        actorRole: auth.role,
        action: 'microlender.update',
        entityType: 'microlender',
        entityId: ml.id,
        metadata: { fields: Object.keys(body) },
        ipAddress: req.ip,
      });
      res.json(ml);
    } catch (err) {
      next(err);
    }
  },
);
