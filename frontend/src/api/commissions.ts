import { api, getToken } from './client';
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
  api<{ created: number; skipped: number; expired: number }>('/api/admin/commissions/generate-monthly', {
    method: 'POST',
    json: { period_month },
  });

export const markPaidWithProof = async (id: string, reference: string | undefined, proof?: File): Promise<Commission> => {
  const token = getToken();
  const fd = new FormData();
  if (reference) fd.append('reference', reference);
  if (proof) fd.append('proof', proof);
  const res = await fetch(`/api/admin/commissions/${id}/mark-paid`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw Object.assign(new Error(payload.message ?? `Request failed (${res.status})`), {
      status: res.status,
      code: payload.error,
    });
  }
  return res.json();
};

export const cancelCommission = (id: string, reason?: string) =>
  api<Commission>(`/api/admin/commissions/${id}/cancel`, {
    method: 'POST',
    json: { reason },
  });

// ---- Agent-side actions ----

export const confirmCommissionPayment = (id: string) =>
  api<Commission>(`/api/agent/commissions/${id}/confirm`, { method: 'POST', json: {} });

export const disputeCommissionPayment = (id: string, reason: string) =>
  api<Commission>(`/api/agent/commissions/${id}/dispute`, { method: 'POST', json: { reason } });

export const requestCommissionPayment = (id: string, message?: string) =>
  api<Commission>(`/api/agent/commissions/${id}/request-payment`, { method: 'POST', json: { message } });
