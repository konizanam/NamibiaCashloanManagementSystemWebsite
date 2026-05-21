import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { validateReferralCode } from '../services/applicationService.js';

export const referralsRouter = Router();

const querySchema = z.object({ code: z.string().trim().min(1).max(20) });

referralsRouter.get('/validate', validate(querySchema, 'query'), async (req, res, next) => {
  try {
    const { code } = req.query as unknown as { code: string };
    const result = await validateReferralCode(code);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
