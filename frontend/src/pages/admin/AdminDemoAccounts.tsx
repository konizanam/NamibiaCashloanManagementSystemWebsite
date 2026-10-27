import { useEffect, useState } from 'react';
import {
  listDemoAccounts,
  resendDemoActivation,
  type DemoAccount,
  type DemoAccountList,
  type DemoAccountSort,
} from '../../api/demoAccounts';
import { PromptModal } from '../../components/PromptModal';

type YesNo = '' | 'true' | 'false';

const VERIFIED_OPTIONS: { value: YesNo; label: string }[] = [
  { value: '',      label: 'All' },
  { value: 'true',  label: 'Verified' },
  { value: 'false', label: 'Awaiting verification' },
];

const LOGGED_IN_OPTIONS: { value: YesNo; label: string }[] = [
  { value: '',      label: 'All' },
  { value: 'true',  label: 'Has signed in' },
  { value: 'false', label: 'Never signed in' },
];

const SORT_OPTIONS: { value: DemoAccountSort; label: string }[] = [
  { value: 'newest',     label: 'Newest first' },
  { value: 'oldest',     label: 'Oldest first' },
  { value: 'last_login', label: 'Last sign-in' },
  { value: 'company',    label: 'Company A–Z' },
];

const PAGE_SIZES = [10, 25, 50, 100];

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

export const AdminDemoAccounts = () => {
  const [data, setData] = useState<DemoAccountList | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [verified, setVerified] = useState<YesNo>('');
  const [loggedIn, setLoggedIn] = useState<YesNo>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<DemoAccountSort>('newest');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [resendFor, setResendFor] = useState<DemoAccount | null>(null);

  const load = () => {
    setLoading(true);
    setErr(null);
    listDemoAccounts({
      q: q.trim() || undefined,
      verified: verified || undefined,
      loggedIn: loggedIn || undefined,
      from: from || undefined,
      to: to || undefined,
      sort,
      limit,
      offset,
    })
      .then(setData)
      .catch((e) => { setData(null); setErr((e as Error).message); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [verified, loggedIn, from, to, sort, limit, offset]);

  // Any filter change starts again from the first page.
  const withReset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setOffset(0); };

  const applySearch = () => (offset === 0 ? load() : setOffset(0));

  const clearFilters = () => {
    setQ('');
    setVerified('');
    setLoggedIn('');
    setFrom('');
    setTo('');
    setSort('newest');
    setOffset(0);
  };

  // Errors propagate to PromptModal, which shows them and stays open.
  const resend = async () => {
    if (!resendFor) return;
    setNotice(null);
    const r = await resendDemoActivation(resendFor.id);
    setNotice(r.message);
    load();
  };

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;
  const firstShown = total === 0 ? 0 : offset + 1;
  const lastShown = Math.min(offset + limit, total);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy">Demo Accounts</h1>
          <p className="text-slate-600 text-sm mt-1">
            Companies self-registered on the Cash Loan Management System demo.
            {data && <> Data resets every {data.resetIntervalHours}h · environment <span className="font-mono">{data.environment}</span>.</>}
          </p>
        </div>
        <button className="btn-outline w-full sm:w-auto" onClick={load} disabled={loading}>Refresh</button>
      </div>

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">Accounts</div>
            <div className="text-2xl font-extrabold text-brand-navy mt-1">{data.summary.all}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">Email verified</div>
            <div className="text-2xl font-extrabold text-brand-navy mt-1">{data.summary.verified}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">Awaiting verification</div>
            <div className="text-2xl font-extrabold text-brand-navy mt-1">{data.summary.unverified}</div>
          </div>
        </div>
      )}

      <div className="card p-4 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="field-label">Search</label>
          <input
            className="field-input"
            placeholder="Company / slug / owner email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
          />
        </div>
        <div>
          <label className="field-label">Verification</label>
          <select className="field-input" value={verified} onChange={(e) => withReset(setVerified)(e.target.value as YesNo)}>
            {VERIFIED_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Activity</label>
          <select className="field-input" value={loggedIn} onChange={(e) => withReset(setLoggedIn)(e.target.value as YesNo)}>
            {LOGGED_IN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Signed up from</label>
          <input type="date" className="field-input" value={from} max={to || undefined}
            onChange={(e) => withReset(setFrom)(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Signed up to</label>
          <input type="date" className="field-input" value={to} min={from || undefined}
            onChange={(e) => withReset(setTo)(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Sort by</label>
          <select className="field-input" value={sort} onChange={(e) => withReset(setSort)(e.target.value as DemoAccountSort)}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={applySearch}>Search</button>
          <button className="btn-outline flex-1" onClick={clearFilters}>Clear</button>
        </div>
      </div>

      {notice && <div className="mt-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-3 py-2">{notice}</div>}
      {err && <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}

      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1040px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Company</th>
              <th className="px-5 py-3">Owner email</th>
              <th className="px-5 py-3">Verified</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Signed up</th>
              <th className="px-5 py-3">Last login</th>
              <th className="px-5 py-3">Next reset</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!loading && !err && data?.items.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">No demo accounts match.</td></tr>
            )}
            {!loading && data?.items.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <div className="font-semibold text-brand-navy">{a.companyName}</div>
                  <div className="text-xs font-mono text-slate-500">{a.slug ?? '—'} · {a.userCount} user{a.userCount === 1 ? '' : 's'}</div>
                </td>
                <td className="px-5 py-3 text-slate-700">{a.ownerEmail}</td>
                <td className="px-5 py-3">
                  {a.emailVerified
                    ? <span className="badge-approved" title={fmt(a.emailVerifiedAt)}>Verified</span>
                    : <span className="badge-pending">Pending</span>}
                </td>
                <td className="px-5 py-3">
                  <span className={a.status === 'active' ? 'badge-approved' : 'badge-rejected'}>{a.status}</span>
                </td>
                <td className="px-5 py-3 text-slate-600">{fmt(a.createdAt)}</td>
                <td className="px-5 py-3 text-slate-600">{fmt(a.lastLoginAt)}</td>
                <td className="px-5 py-3 text-slate-600">{a.status === 'active' ? fmt(a.nextResetAt) : '—'}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  {!a.emailVerified && (
                    <button
                      className="text-sm font-semibold text-brand-green-dark hover:underline"
                      onClick={() => setResendFor(a)}
                    >
                      Resend activation link
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span>Showing {firstShown}–{lastShown} of {total}</span>
            <span className="text-slate-300">·</span>
            <label htmlFor="demo-page-size">Per page</label>
            <select
              id="demo-page-size"
              className="border border-slate-200 rounded-md px-2 py-1 bg-white"
              value={limit}
              onChange={(e) => withReset(setLimit)(Number(e.target.value))}
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-outline px-3 py-1.5"
              disabled={loading || offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              ← Prev
            </button>
            <span>Page {page} of {pageCount}</span>
            <button
              className="btn-outline px-3 py-1.5"
              disabled={loading || offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <PromptModal
        open={resendFor !== null}
        title="Resend activation link?"
        description={resendFor
          ? `A new activation link (valid 24 hours) will be emailed to ${resendFor.ownerEmail} for ${resendFor.companyName}. Any earlier link stops working.`
          : undefined}
        confirmLabel="Send link"
        withInput={false}
        onClose={() => setResendFor(null)}
        onSubmit={resend}
      />
    </div>
  );
};
