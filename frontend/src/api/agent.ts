import { api } from './client';
import type {
  AgentDashboardStats,
  AgentProfile,
  Commission,
  CommissionStatus,
  CommissionType,
  Paginated,
  ReferredApplication,
  ReferredMicrolender,
} from './types';

export const fetchAgentDashboard = () =>
  api<{ agent: AgentProfile; stats: AgentDashboardStats }>('/api/agent/dashboard');

export const fetchAgentMe = () =>
  api<{ agent: AgentProfile }>('/api/agent/me');

export interface ListCommissionsOpts {
  status?: CommissionStatus;
  type?: CommissionType;
  period_month?: string;
  limit?: number;
  offset?: number;
}

export const fetchAgentCommissions = (opts: ListCommissionsOpts = {}) => {
  const qs = new URLSearchParams();
  if (opts.status) qs.set('status', opts.status);
  if (opts.type)   qs.set('type', opts.type);
  if (opts.period_month) qs.set('period_month', opts.period_month);
  qs.set('limit',  String(opts.limit ?? 50));
  qs.set('offset', String(opts.offset ?? 0));
  return api<Paginated<Commission>>(`/api/agent/commissions?${qs.toString()}`);
};

export const fetchAgentMicrolenders = () =>
  api<{ items: ReferredMicrolender[] }>('/api/agent/microlenders');

export const fetchAgentApplications = () =>
  api<{ items: ReferredApplication[] }>('/api/agent/applications');
