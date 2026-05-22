import { api } from './client';
import type { Commission, CommissionStatus, CommissionType, Paginated } from './types';

export interface AdminListCommissionsOpts {
  agent_id?: string;
  status?: CommissionStatus;
  type?: CommissionType;
  period_month?: string;
  limit?: number;
  offset?: number;
}

export const adminListCommissions = (opts: AdminListCommissionsOpts = {}) => {
  const qs = new URLSearchParams();
  if (opts.agent_id) qs.set('agent_id', opts.agent_id);
  if (opts.status)   qs.set('status', opts.status);
  if (opts.type)     qs.set('type', opts.type);
  if (opts.period_month) qs.set('period_month', opts.period_month);
  qs.set('limit',  String(opts.limit ?? 50));
  qs.set('offset', String(opts.offset ?? 0));
  return api<Paginated<Commission>>(`/api/admin/commissions?${qs.toString()}`);
};

export const generateMonthly = (period_month: string) =>
  api<{ created: number; skipped: number }>('/api/admin/commissions/generate-monthly', {
    method: 'POST',
    json: { period_month },
  });

export const markPaid = (id: string, reference?: string) =>
  api<Commission>(`/api/admin/commissions/${id}/mark-paid`, {
    method: 'POST',
    json: { reference },
  });

export const cancelCommission = (id: string, reason?: string) =>
  api<Commission>(`/api/admin/commissions/${id}/cancel`, {
    method: 'POST',
    json: { reason },
  });
