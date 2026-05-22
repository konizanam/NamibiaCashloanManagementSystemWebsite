import { z } from 'zod';

const trimmed = z.string().trim();
const nonEmpty = trimmed.min(1);

export const listMicrolendersQuerySchema = z.object({
  q: trimmed.max(255).optional(),
  status: z.enum(['active', 'suspended', 'pending']).optional(),
  tier: z.enum(['tier1', 'tier2', 'tier3', 'tier4']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createMicrolenderSchema = z.object({
  business_name: nonEmpty.max(255),
  namfisa_reg_no: nonEmpty.max(100),
  business_type: nonEmpty.max(100),
  physical_address: trimmed.max(1000).optional().nullable(),
  city: nonEmpty.max(100),
  country: trimmed.max(100).default('Namibia'),
  phone: trimmed.max(50).optional().nullable(),
  business_email: trimmed.email().max(255),
  full_name: nonEmpty.max(255),
  password: z.string().min(8).max(200),
  tier: z.enum(['tier1', 'tier2', 'tier3', 'tier4']).default('tier1'),
  referred_by_agent_id: z.string().uuid().optional().nullable(),
});

export const updateMicrolenderSchema = z.object({
  business_name: nonEmpty.max(255).optional(),
  namfisa_reg_no: nonEmpty.max(100).optional(),
  business_type: nonEmpty.max(100).optional(),
  physical_address: trimmed.max(1000).optional().nullable(),
  city: nonEmpty.max(100).optional(),
  country: trimmed.max(100).optional(),
  phone: trimmed.max(50).optional().nullable(),
  tier: z.enum(['tier1', 'tier2', 'tier3', 'tier4']).optional(),
  user_status: z.enum(['active', 'suspended']).optional(),
  full_name: nonEmpty.max(255).optional(),
  email: trimmed.email().max(255).optional(),
  referred_by_agent_id: z.string().uuid().optional().nullable(),
});
