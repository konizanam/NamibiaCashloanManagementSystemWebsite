import { z } from 'zod';

export const listCommissionsQuerySchema = z.object({
  status: z.enum(['pending', 'paid', 'cancelled']).optional(),
  type: z.enum(['onboarding', 'monthly', 'bonus', 'adjustment']).optional(),
  period_month: z.string().regex(/^\d{4}-\d{2}-01$/).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const generateMonthlySchema = z.object({
  period_month: z.string().regex(/^\d{4}-\d{2}-01$/),
});

export const markPaidSchema = z.object({
  reference: z.string().trim().max(255).optional(),
});

export const messageSchema = z.object({
  subject: z.string().trim().max(255).optional(),
  body: z.string().trim().min(1).max(10_000),
  send_email: z.boolean().default(true),
  is_info_request: z.boolean().default(false),
});
