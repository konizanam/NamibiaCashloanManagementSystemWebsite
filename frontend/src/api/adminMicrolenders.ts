import { api } from './client';
import type {
  AdminMicrolenderDetail,
  AdminMicrolenderList,
  Paginated,
  Tier,
  UserStatus,
} from './types';

export interface ListAdminMicrolendersOpts {
  q?: string;
  status?: UserStatus;
  tier?: Tier;
  limit?: number;
  offset?: number;
}

export const listAdminMicrolenders = (opts: ListAdminMicrolendersOpts = {}) => {
  const qs = new URLSearchParams();
  if (opts.q) qs.set('q', opts.q);
  if (opts.status) qs.set('status', opts.status);
  if (opts.tier) qs.set('tier', opts.tier);
  qs.set('limit', String(opts.limit ?? 50));
  qs.set('offset', String(opts.offset ?? 0));
  return api<Paginated<AdminMicrolenderList>>(`/api/microlenders?${qs.toString()}`);
};

export const getAdminMicrolender = (id: string) =>
  api<AdminMicrolenderDetail>(`/api/microlenders/${id}`);

export interface CreateAdminMicrolenderInput {
  business_name: string;
  namfisa_reg_no: string;
  business_type: string;
  physical_address?: string;
  city: string;
  country?: string;
  phone?: string;
  business_email: string;
  full_name: string;
  password: string;
  tier?: Tier;
  referred_by_agent_id?: string;
}

export const createAdminMicrolender = (input: CreateAdminMicrolenderInput) =>
  api<AdminMicrolenderDetail>('/api/microlenders', { method: 'POST', json: input });

export interface UpdateAdminMicrolenderInput {
  business_name?: string;
  namfisa_reg_no?: string;
  business_type?: string;
  physical_address?: string | null;
  city?: string;
  country?: string;
  phone?: string | null;
  tier?: Tier;
  user_status?: 'active' | 'suspended';
  full_name?: string;
  email?: string;
  referred_by_agent_id?: string | null;
}

export const updateAdminMicrolender = (id: string, input: UpdateAdminMicrolenderInput) =>
  api<AdminMicrolenderDetail>(`/api/microlenders/${id}`, { method: 'PATCH', json: input });
