import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listApplications } from '../../api/applications';
import type { Application, ApplicationStatus, Paginated } from '../../api/types';
import { StatusBadge } from '../../components/StatusBadge';

const STATUSES: { value: ApplicationStatus | ''; label: string }[] = [
  { value: '',              label: 'All' },
  { value: 'pending',       label: 'Pending' },
  { value: 'approved',      label: 'Approved' },
  { value: 'rejected',      label: 'Rejected' },
  { value: 'requires_info', label: 'Info Required' },
];

export const AdminApplications = () => {
  const [data, setData] = useState<Paginated<Application> | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listApplications({ status: filter || undefined, limit: 50 })
      .then(setData)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-brand-navy">Applications</h1>
          <Link to="/apply" target="_blank" rel="noopener noreferrer" className="btn-primary w-full sm:w-auto text-center">
            + New application
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`shrink-0 px-3 py-1.5 rounded-md text-sm font-semibold ${
                filter === s.value ? 'bg-brand-navy text-white' : 'bg-white border border-slate-200 text-slate-700 hover:border-brand-green'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3">Referral</th>
              <th className="px-5 py-3">Submitted</th>
              <th className="px-5 py-3">Docs</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">Loading…</td></tr>
            )}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">No applications matched.</td></tr>
            )}
            {!loading && data?.items.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <div className="font-semibold text-brand-navy">{a.business_name}</div>
                  <div className="text-xs text-slate-500">{a.city ?? '—'}, {a.country}</div>
                </td>
                <td className="px-5 py-3">
                  <div>{a.principal_officer_name}</div>
                  <div className="text-xs text-slate-500">{a.business_email}</div>
                </td>
                <td className="px-5 py-3">
                  {a.referral_code_used ? (
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{a.referral_code_used}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-600">{new Date(a.submitted_at).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-slate-600">{a.document_count ?? '—'}</td>
                <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                <td className="px-5 py-3 text-right">
                  <Link to={`/admin/applications/${a.id}`} className="text-brand-green-dark font-semibold hover:underline">
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {data && <div className="text-xs text-slate-500 mt-3">{data.items.length} of {data.total} shown.</div>}
    </div>
  );
};
