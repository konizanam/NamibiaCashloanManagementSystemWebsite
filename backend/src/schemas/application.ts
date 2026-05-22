import { z } from 'zod';

const trimmed = z.string().trim();
const nonEmpty = trimmed.min(1);

export const createApplicationSchema = z.object({
  business_name: nonEmpty.max(255),
  namfisa_reg_no: nonEmpty.max(100),
  business_type: nonEmpty.max(100),
  physical_address: trimmed.max(1000).optional().nullable(),
  city: nonEmpty.max(100),
  country: trimmed.max(100).default('Namibia'),
  business_phone: nonEmpty.max(50),
  business_email: trimmed.email().max(255),

  principal_officer_name: nonEmpty.max(255),
  principal_officer_id_number: nonEmpty.max(50),
  principal_officer_phone: nonEmpty.max(50),
  principal_officer_email: trimmed.email().max(255),

  preferred_tier: z.enum(['tier1', 'tier2', 'tier3', 'tier4']),

  referral_code: trimmed.max(20).optional().nullable(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const listApplicationsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'requires_info']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const rejectApplicationSchema = z.object({
  reason: nonEmpty.max(2000),
});

export const approveApplicationSchema = z.object({
  tier: z.enum(['tier1', 'tier2', 'tier3', 'tier4']).default('tier1'),
  notes: trimmed.max(2000).optional(),
});
