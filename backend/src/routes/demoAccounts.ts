import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listDemoAccounts } from '../services/demoAccountService.js';

export const demoAccountsRouter = Router();

demoAccountsRouter.use(requireAuth, requireRole('admin'));

const listDemoAccountsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(32).optional(),
});

demoAccountsRouter.get(
  '/',
  validate(listDemoAccountsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as { q?: string; status?: string };
      res.json(await listDemoAccounts(q));
    } catch (err) {
      next(err);
    }
  },
);
