import { config } from '../config.js';
import { HttpError, conflict, notFound } from '../lib/errors.js';

export interface DemoAccount {
  id: number;
  companyName: string;
  slug: string | null;
  ownerEmail: string;
  status: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  userCount: number;
  createdAt: string;
  lastLoginAt: string | null;
  lastResetAt: string | null;
  nextResetAt: string | null;
}

export interface DemoAccountList {
  environment: string;
  resetIntervalHours: number;
  total: number;
  limit: number;
  offset: number;
  summary: { all: number; verified: number; unverified: number };
  items: DemoAccount[];
}

export interface ListDemoAccountsQuery {
  q?: string;
  verified?: 'true' | 'false';
  loggedIn?: 'true' | 'false';
  from?: string;
  to?: string;
  sort?: 'newest' | 'oldest' | 'last_login' | 'company';
  limit: number;
  offset: number;
}

const upstreamError = (message: string): HttpError => new HttpError(502, 'cms_unavailable', message);

const requireCmsConfig = () => {
  const { apiUrl, username, password } = config.cms;
  if (!apiUrl || !username || !password) {
    throw new HttpError(
      503,
      'cms_not_configured',
      'The Cash Loan Management System API is not configured (CMS_API_URL, CMS_API_USERNAME, CMS_API_PASSWORD).',
    );
  }
  return { apiUrl, username, password };
};

const cmsFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const { apiUrl, username, password } = requireCmsConfig();
  let res: Response;
  try {
    res = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw upstreamError('Could not reach the Cash Loan Management System API.');
  }
  if (res.status === 401) {
    throw upstreamError('Cash Loan Management System API rejected CMS_API_USERNAME / CMS_API_PASSWORD.');
  }
  if (res.status === 503) {
    throw upstreamError('Tenant listing is not configured on the Cash Loan Management System API (TENANTS_API_USERNAME / TENANTS_API_PASSWORD).');
  }
  return res;
};

const upstreamMessage = async (res: Response, fallback: string): Promise<string> => {
  try {
    const body = (await res.json()) as { error?: unknown };
    return typeof body.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
};

export const listDemoAccounts = async (opts: ListDemoAccountsQuery): Promise<DemoAccountList> => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(opts)) {
    if (value !== undefined && value !== '') qs.set(key, String(value));
  }
  const res = await cmsFetch(`/api/tenants?${qs.toString()}`);
  if (!res.ok) {
    throw upstreamError(`Cash Loan Management System API returned ${res.status} for the demo account list.`);
  }
  return (await res.json()) as DemoAccountList;
};

export const resendDemoActivation = async (id: number): Promise<{ email: string; message: string }> => {
  const res = await cmsFetch(`/api/tenants/${id}/resend-verification`, { method: 'POST' });
  if (res.status === 404) throw notFound(await upstreamMessage(res, 'Demo account not found.'));
  if (res.status === 409) throw conflict(await upstreamMessage(res, 'This account is already verified.'));
  if (!res.ok) {
    throw upstreamError(await upstreamMessage(res, `Cash Loan Management System API returned ${res.status}.`));
  }
  return (await res.json()) as { email: string; message: string };
};
