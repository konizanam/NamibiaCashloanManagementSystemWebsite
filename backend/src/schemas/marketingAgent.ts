import { z } from 'zod';

const trimmed = z.string().trim();

export const createMarketingAgentSchema = z.object({
  full_name: trimmed.min(1).max(255),
  email: trimmed.email().max(255),
  phone: trimmed.max(50).optional().nullable(),
  password: z.string().min(8).max(200),
  commission_rate: z.coerce.number().min(0).max(100).default(0),
  notes: trimmed.max(2000).optional().nullable(),
});

export type CreateMarketingAgentInput = z.infer<typeof createMarketingAgentSchema>;

export const updateMarketingAgentSchema = z.object({
  full_name: trimmed.min(1).max(255).optional(),
  phone: trimmed.max(50).optional().nullable(),
  commission_rate: z.coerce.number().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
  notes: trimmed.max(2000).optional().nullable(),
});
