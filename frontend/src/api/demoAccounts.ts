import { api } from './client';

export interface DemoAccount {
  id: number;
  companyName: string;
  slug: string | null;
  ownerEmail: string;
  status: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  userCount: number;
  createdAt: string;
  lastLoginAt: string | null;
  lastResetAt: string | null;
  nextResetAt: string | null;
}

export interface DemoAccountList {
  environment: string;
  resetIntervalHours: number;
  total: number;
  limit: number;
  offset: number;
  summary: { all: number; verified: number; unverified: number };
  items: DemoAccount[];
}

export type DemoAccountSort = 'newest' | 'oldest' | 'last_login' | 'company';

export interface ListDemoAccountsOpts {
  q?: string;
  verified?: 'true' | 'false';
  loggedIn?: 'true' | 'false';
  from?: string;
  to?: string;
  sort?: DemoAccountSort;
  limit?: number;
  offset?: number;
}

export const listDemoAccounts = (opts: ListDemoAccountsOpts = {}) => {
  const qs = new URLSearchParams();
  if (opts.q) qs.set('q', opts.q);
  if (opts.verified) qs.set('verified', opts.verified);
  if (opts.loggedIn) qs.set('loggedIn', opts.loggedIn);
  if (opts.from) qs.set('from', opts.from);
  if (opts.to) qs.set('to', opts.to);
  if (opts.sort) qs.set('sort', opts.sort);
  qs.set('limit', String(opts.limit ?? 25));
  qs.set('offset', String(opts.offset ?? 0));
  return api<DemoAccountList>(`/api/admin/demo-accounts?${qs.toString()}`);
};

export const resendDemoActivation = (id: number) =>
  api<{ ok: boolean; email: string; message: string }>(
    `/api/admin/demo-accounts/${id}/resend-activation`,
    { method: 'POST' },
  );
