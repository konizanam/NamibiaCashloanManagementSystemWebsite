export type Role = 'admin' | 'marketing_agent' | 'microlender';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status?: string;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'requires_info';

export interface Application {
  id: string;
  business_name: string;
  registration_number: string | null;
  business_type: string | null;
  physical_address: string | null;
  city: string | null;
  country: string;
  business_phone: string | null;
  business_email: string;
  principal_officer_name: string;
  principal_officer_id_number: string;
  principal_officer_phone: string;
  principal_officer_email: string;
  referral_code_used: string | null;
  referred_by_agent_id: string | null;
  status: ApplicationStatus;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  review_notes: string | null;
  approved_user_id: string | null;
  document_count?: number;
}

export type DocumentType =
  | 'founding_statement'
  | 'namfisa_certificate'
  | 'namfisa_approval_letter'
  | 'principal_officer_id'
  | 'member_id'
  | 'other';

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_type: DocumentType;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
}

export interface MarketingAgent {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  referral_code: string;
  commission_rate: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export type Tier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

export interface AgentProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  referral_code: string;
  commission_rate: string;
  is_active: boolean;
  created_at: string;
}

export interface AgentDashboardStats {
  total_referred_applications: number;
  total_active_microlenders: number;
  total_earned_all_time: number;
  total_paid_all_time: number;
  total_pending: number;
  this_month_earned: number;
  projected_next_month: number;
}

export type CommissionStatus = 'pending' | 'paid' | 'cancelled';
export type CommissionType = 'onboarding' | 'monthly' | 'bonus' | 'adjustment';

export interface Commission {
  id: string;
  agent_id: string;
  microlender_id: string | null;
  application_id: string | null;
  period_month: string;
  type: CommissionType;
  tier: string | null;
  rate_applied: string | null;
  base_amount: string | null;
  amount: string;
  currency: string;
  status: CommissionStatus;
  paid_at: string | null;
  paid_reference: string | null;
  notes: string | null;
  created_at: string;
  microlender_name?: string | null;
  agent_name?: string | null;
}

export interface ReferredMicrolender {
  id: string;
  business_name: string;
  city: string | null;
  country: string;
  tier: Tier;
  email: string;
  status: string;
  activated_at: string;
}

export interface ReferredApplication {
  id: string;
  business_name: string;
  status: ApplicationStatus;
  city: string | null;
  country: string;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface ApplicationMessage {
  id: string;
  application_id: string;
  author_user_id: string | null;
  author_name: string | null;
  kind: 'admin_note' | 'system';
  subject: string | null;
  body: string;
  email_sent: boolean;
  email_sent_at: string | null;
  email_to: string | null;
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
