import { api } from './client';
import type { Application, ApplicationDocument, ApplicationStatus, Paginated } from './types';

export interface ListAppsOpts {
  status?: ApplicationStatus;
  limit?: number;
  offset?: number;
}

export const listApplications = (opts: ListAppsOpts = {}) => {
  const qs = new URLSearchParams();
  if (opts.status) qs.set('status', opts.status);
  qs.set('limit', String(opts.limit ?? 25));
  qs.set('offset', String(opts.offset ?? 0));
  return api<Paginated<Application>>(`/api/applications?${qs.toString()}`);
};

export const getApplication = (id: string) =>
  api<{ application: Application; documents: ApplicationDocument[] }>(`/api/applications/${id}`);

export const approveApplication = (
  id: string,
  body: { tier?: 'tier1' | 'tier2' | 'tier3' | 'tier4'; notes?: string },
) =>
  api<{ application: Application; microlender_user_id: string; temporary_password: string }>(
    `/api/applications/${id}/approve`,
    { method: 'POST', json: body },
  );

export const rejectApplication = (id: string, reason: string) =>
  api<{ application: Application }>(`/api/applications/${id}/reject`, {
    method: 'POST',
    json: { reason },
  });

export const submitApplication = (formData: FormData) =>
  api<{ id: string; status: ApplicationStatus; submitted_at: string; message: string }>(
    '/api/applications',
    { method: 'POST', auth: false, body: formData },
  );

export const validateReferral = (code: string) =>
  api<{ valid: boolean; agentName?: string }>(
    `/api/referrals/validate?code=${encodeURIComponent(code)}`,
    { auth: false },
  );
