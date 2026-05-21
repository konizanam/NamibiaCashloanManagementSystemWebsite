import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import {
  createMarketingAgentSchema,
  updateMarketingAgentSchema,
} from '../schemas/marketingAgent.js';
import {
  createMarketingAgent,
  getMarketingAgent,
  listMarketingAgents,
  updateMarketingAgent,
} from '../services/marketingAgentService.js';
import { logAudit } from '../lib/audit.js';

export const marketingAgentsRouter = Router();

marketingAgentsRouter.use(requireAuth, requireRole('admin'));

marketingAgentsRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ items: await listMarketingAgents() });
  } catch (err) {
    next(err);
  }
});

marketingAgentsRouter.post(
  '/',
  validate(createMarketingAgentSchema),
  async (req, res, next) => {
    try {
      const auth = (req as AuthedRequest).user!;
      const agent = await createMarketingAgent(req.body);
      await logAudit({
        actorId: auth.sub,
        actorRole: auth.role,
        action: 'marketing_agent.create',
        entityType: 'marketing_agent',
        entityId: agent.id,
        metadata: { referral_code: agent.referral_code, email: agent.email },
        ipAddress: req.ip,
      });
      res.status(201).json(agent);
    } catch (err) {
      next(err);
    }
  },
);

marketingAgentsRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await getMarketingAgent(req.params.id!));
  } catch (err) {
    next(err);
  }
});

marketingAgentsRouter.patch(
  '/:id',
  validate(updateMarketingAgentSchema),
  async (req, res, next) => {
    try {
      const auth = (req as AuthedRequest).user!;
      const agent = await updateMarketingAgent(req.params.id!, req.body);
      await logAudit({
        actorId: auth.sub,
        actorRole: auth.role,
        action: 'marketing_agent.update',
        entityType: 'marketing_agent',
        entityId: agent.id,
        ipAddress: req.ip,
      });
      res.json(agent);
    } catch (err) {
      next(err);
    }
  },
);
