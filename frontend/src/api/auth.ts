import { api } from './client';
import type { User } from './types';

export interface LoginSuccess {
  token: string;
  user: User;
}

export interface LoginChallenge {
  requires_2fa: true;
  challenge_token: string;
  email_masked: string;
}

export type LoginResponse = LoginSuccess | LoginChallenge;

export const isChallenge = (r: LoginResponse): r is LoginChallenge =>
  (r as LoginChallenge).requires_2fa === true;

export const login = (email: string, password: string) =>
  api<LoginResponse>('/api/auth/login', { method: 'POST', auth: false, json: { email, password } });

export const verifyTwoFactor = (challenge_token: string, code: string) =>
  api<LoginSuccess>('/api/auth/2fa/verify', {
    method: 'POST',
    auth: false,
    json: { challenge_token, code },
  });

export const resendTwoFactor = (challenge_token: string) =>
  api<{ email_masked: string }>('/api/auth/2fa/resend', {
    method: 'POST',
    auth: false,
    json: { challenge_token },
  });

export const enableTwoFactor = (password: string) =>
  api<{ ok: true }>('/api/auth/2fa/enable', { method: 'POST', json: { password } });

export const disableTwoFactor = (password: string) =>
  api<{ ok: true }>('/api/auth/2fa/disable', { method: 'POST', json: { password } });

export const forgotPassword = (email: string) =>
  api<{ ok: true }>('/api/auth/forgot-password', {
    method: 'POST',
    auth: false,
    json: { email },
  });

export const resetPassword = (token: string, new_password: string) =>
  api<{ ok: true }>('/api/auth/reset-password', {
    method: 'POST',
    auth: false,
    json: { token, new_password },
  });

export const fetchMe = () => api<{ user: User | null }>('/api/auth/me');

export const changePassword = (current_password: string, new_password: string) =>
  api<{ ok: true }>('/api/auth/change-password', {
    method: 'POST',
    json: { current_password, new_password },
  });
