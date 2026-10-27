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
  items: DemoAccount[];
}

export interface ListDemoAccountsOpts {
  q?: string;
  status?: string;
}

export const listDemoAccounts = (opts: ListDemoAccountsOpts = {}) => {
  const qs = new URLSearchParams();
  if (opts.q) qs.set('q', opts.q);
  if (opts.status) qs.set('status', opts.status);
  const suffix = qs.toString();
  return api<DemoAccountList>(`/api/admin/demo-accounts${suffix ? `?${suffix}` : ''}`);
};
