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

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
