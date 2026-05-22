import { api } from './client';
import type { User } from './types';

export interface LoginResponse {
  token: string;
  user: User;
}

export const login = (email: string, password: string) =>
  api<LoginResponse>('/api/auth/login', { method: 'POST', auth: false, json: { email, password } });

export const fetchMe = () => api<{ user: User | null }>('/api/auth/me');

export const changePassword = (current_password: string, new_password: string) =>
  api<{ ok: true }>('/api/auth/change-password', {
    method: 'POST',
    json: { current_password, new_password },
  });
