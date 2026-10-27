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
  const { apiUrl, clientId, clientSecret } = config.cms;
  if (!apiUrl || !clientId || !clientSecret) {
    throw new HttpError(
      503,
      'cms_not_configured',
      'The Cash Loan Management System API is not configured (CMS_API_URL, CMS_CLIENT_ID, CMS_CLIENT_SECRET).',
    );
  }
  return { apiUrl, clientId, clientSecret };
};

// Client-credentials token, reused until a minute before it expires.
let cachedToken: { value: string; expiresAt: number } | null = null;

const getAccessToken = async (): Promise<string> => {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const { apiUrl, clientId, clientSecret } = requireCmsConfig();
  let res: Response;
  try {
    res = await fetch(`${apiUrl}/api/integration/auth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw upstreamError('Could not reach the Cash Loan Management System API.');
  }
  if (!res.ok) {
    throw upstreamError(`Cash Loan Management System API rejected the client credentials (${res.status}).`);
  }
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw upstreamError('Cash Loan Management System API returned no access token.');

  const ttlMs = Math.max(60, body.expires_in ?? 3600) * 1000;
  cachedToken = { value: body.access_token, expiresAt: Date.now() + ttlMs - 60_000 };
  return body.access_token;
};

export const listDemoAccounts = async (opts: { q?: string; status?: string }): Promise<DemoAccountList> => {
  const { apiUrl } = requireCmsConfig();
  const qs = new URLSearchParams();
  if (opts.q) qs.set('q', opts.q);
  if (opts.status) qs.set('status', opts.status);
  const url = `${apiUrl}/api/tenants${qs.size ? `?${qs.toString()}` : ''}`;

  const call = async (): Promise<Response> => {
    try {
      return await fetch(url, {
        headers: { Authorization: `Bearer ${await getAccessToken()}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw upstreamError('Could not reach the Cash Loan Management System API.');
    }
  };

  let res = await call();
  if (res.status === 401) {
    // Token revoked or secret rotated upstream: fetch a fresh one once.
    cachedToken = null;
    res = await call();
  }
  if (!res.ok) {
    throw upstreamError(`Cash Loan Management System API returned ${res.status} for the demo account list.`);
  }
  return (await res.json()) as DemoAccountList;
};
