import { useEffect, useState } from 'react';
import { listDemoAccounts, type DemoAccountList } from '../../api/demoAccounts';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

export const AdminDemoAccounts = () => {
  const [data, setData] = useState<DemoAccountList | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const load = () => {
    setLoading(true);
    setErr(null);
    listDemoAccounts({ q: q.trim() || undefined })
      .then(setData)
      .catch((e) => { setData(null); setErr((e as Error).message); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const verified = data?.items.filter((a) => a.emailVerified).length ?? 0;

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
            <div className="text-2xl font-extrabold text-brand-navy mt-1">{data.total}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">Email verified</div>
            <div className="text-2xl font-extrabold text-brand-navy mt-1">{verified}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">Awaiting verification</div>
            <div className="text-2xl font-extrabold text-brand-navy mt-1">{data.total - verified}</div>
          </div>
        </div>
      )}

      <div className="card p-4 mt-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="field-label">Search</label>
          <input
            className="field-input"
            placeholder="Company / slug / owner email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
          />
        </div>
        <button className="btn-outline" onClick={load}>Search</button>
      </div>

      {err && <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}

      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Company</th>
              <th className="px-5 py-3">Owner email</th>
              <th className="px-5 py-3">Verified</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Signed up</th>
              <th className="px-5 py-3">Last login</th>
              <th className="px-5 py-3">Next reset</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!loading && !err && data?.items.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">No demo accounts match.</td></tr>
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
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
