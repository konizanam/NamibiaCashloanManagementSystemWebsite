const TOKEN_KEY = 'nclms.token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string | null) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

export interface ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
}

interface ApiOptions extends RequestInit {
  auth?: boolean;
  json?: unknown;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { auth = true, json, headers, ...rest } = opts;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  let body = rest.body;
  if (json !== undefined) {
    body = JSON.stringify(json);
    finalHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...rest, headers: finalHeaders, body });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const err = new Error(
      (payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as Record<string, unknown>).message)
        : `Request failed (${res.status})`),
    ) as ApiError;
    err.status = res.status;
    if (payload && typeof payload === 'object') {
      err.code = String((payload as Record<string, unknown>).error ?? '');
      err.details = (payload as Record<string, unknown>).details;
    }
    throw err;
  }

  return payload as T;
}
