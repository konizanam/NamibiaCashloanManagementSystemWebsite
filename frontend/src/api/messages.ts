import { api } from './client';
import type { ApplicationMessage } from './types';

export const listApplicationMessages = (applicationId: string) =>
  api<{ items: ApplicationMessage[] }>(`/api/applications/${applicationId}/messages`);

export interface PostMessageInput {
  subject?: string;
  body: string;
  send_email?: boolean;
  is_info_request?: boolean;
}

export const postApplicationMessage = (applicationId: string, input: PostMessageInput) =>
  api<ApplicationMessage>(`/api/applications/${applicationId}/messages`, {
    method: 'POST',
    json: input,
  });

export const requestApplicationInfo = (applicationId: string, notes?: string) =>
  api<{ application: unknown }>(`/api/applications/${applicationId}/request-info`, {
    method: 'POST',
    json: { notes },
  });
