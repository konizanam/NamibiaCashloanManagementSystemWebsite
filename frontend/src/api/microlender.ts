import { api } from './client';
import type { Tier } from './types';

export interface MicrolenderProfile {
  id: string;
  user_id: string;
  business_name: string;
  namfisa_reg_no: string | null;
  business_type: string | null;
  physical_address: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  tier: Tier;
  application_id: string | null;
  activated_at: string;
  email: string;
  full_name: string;
  agent_name: string | null;
  agent_email: string | null;
  agent_phone: string | null;
}

export interface MicrolenderMessage {
  id: string;
  author_name: string | null;
  subject: string | null;
  body: string;
  created_at: string;
}

export const fetchMicrolenderDashboard = () =>
  api<{ profile: MicrolenderProfile; recent_messages: MicrolenderMessage[] }>('/api/microlender/dashboard');

export const fetchMicrolenderProfile = () =>
  api<{ profile: MicrolenderProfile }>('/api/microlender/me');
