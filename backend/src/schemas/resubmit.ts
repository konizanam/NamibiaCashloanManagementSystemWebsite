import { z } from 'zod';

const trimmed = z.string().trim();
const nonEmpty = trimmed.min(1);

// All fields optional — applicants only need to send what changed. We keep
// validation on shape, not presence.
export const resubmitApplicationSchema = z.object({
  business_name: nonEmpty.max(255).optional(),
  namfisa_reg_no: nonEmpty.max(100).optional(),
  business_type: nonEmpty.max(100).optional(),
  physical_address: trimmed.max(1000).optional(),
  city: nonEmpty.max(100).optional(),
  country: trimmed.max(100).optional(),
  business_phone: nonEmpty.max(50).optional(),
  business_email: trimmed.email().max(255).optional(),
  principal_officer_name: nonEmpty.max(255).optional(),
  principal_officer_id_number: nonEmpty.max(50).optional(),
  principal_officer_phone: nonEmpty.max(50).optional(),
  principal_officer_email: trimmed.email().max(255).optional(),
  preferred_tier: z.enum(['tier1', 'tier2', 'tier3', 'tier4']).optional(),
});
