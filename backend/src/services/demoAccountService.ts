import { config } from '../config.js';
import { HttpError } from '../lib/errors.js';

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
  items: DemoAccount[];
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

export const listDemoAccounts = async (opts: { q?: string; status?: string }): Promise<DemoAccountList> => {
  const { apiUrl, username, password } = requireCmsConfig();
  const qs = new URLSearchParams();
  if (opts.q) qs.set('q', opts.q);
  if (opts.status) qs.set('status', opts.status);
  const url = `${apiUrl}/api/tenants${qs.size ? `?${qs.toString()}` : ''}`;

  let res: Response;
  try {
    res = await fetch(url, {
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
  if (!res.ok) {
    throw upstreamError(`Cash Loan Management System API returned ${res.status} for the demo account list.`);
  }
  return (await res.json()) as DemoAccountList;
};
