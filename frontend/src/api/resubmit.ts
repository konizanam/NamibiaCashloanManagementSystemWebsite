import { api } from './client';
import type { Application, ApplicationDocument } from './types';

export interface ResubmitMessage {
  id: string;
  author_name: string | null;
  subject: string | null;
  body: string;
  created_at: string;
}

export interface LoadResubmitResponse {
  application: Application;
  documents: ApplicationDocument[];
  recent_messages: ResubmitMessage[];
}

export const loadResubmit = (token: string) =>
  api<LoadResubmitResponse>(`/api/applications/resubmit/${encodeURIComponent(token)}`, { auth: false });

export const postResubmit = (token: string, formData: FormData) =>
  api<{ application: Application; message: string }>(
    `/api/applications/resubmit/${encodeURIComponent(token)}`,
    { method: 'POST', auth: false, body: formData },
  );
