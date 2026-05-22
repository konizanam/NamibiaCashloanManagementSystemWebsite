import { Router } from 'express';
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
        status?: 'pending' | 'paid' | 'cancelled';
        type?: 'onboarding' | 'monthly' | 'bonus' | 'adjustment';
        period_month?: string;
        limit: number;
        offset: number;
      };
      const result = await listCommissionsForAgent(profile.id, q);
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
