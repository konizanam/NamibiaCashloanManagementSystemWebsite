import { api } from './client';
import type { MarketingAgent } from './types';

export const listAgents = () => api<{ items: MarketingAgent[] }>('/api/marketing-agents');

export interface CreateAgentInput {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  commission_rate?: number;
  notes?: string;
}

export const createAgent = (body: CreateAgentInput) =>
  api<MarketingAgent>('/api/marketing-agents', { method: 'POST', json: body });

export const updateAgent = (
  id: string,
  body: Partial<{ full_name: string; phone: string | null; commission_rate: number; is_active: boolean; notes: string | null }>,
) => api<MarketingAgent>(`/api/marketing-agents/${id}`, { method: 'PATCH', json: body });
