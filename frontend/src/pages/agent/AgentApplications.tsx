import { useEffect, useState } from 'react';
import { fetchAgentApplications } from '../../api/agent';
import type { ReferredApplication } from '../../api/types';
import { StatusBadge } from '../../components/StatusBadge';

export const AgentApplications = () => {
  const [items, setItems] = useState<ReferredApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentApplications()
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-navy">Applications</h1>
      <p className="text-slate-600 text-sm mt-1">All applications submitted using your referral code, including pending and rejected.</p>

      <div className="card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Submitted</th>
              <th className="px-5 py-3">Reviewed</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No referred applications yet.</td></tr>
            )}
            {!loading && items.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-semibold text-brand-navy">{a.business_name}</td>
                <td className="px-5 py-3 text-slate-600">{a.city ?? '—'}, {a.country}</td>
                <td className="px-5 py-3 text-slate-600">{new Date(a.submitted_at).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-slate-600">{a.reviewed_at ? new Date(a.reviewed_at).toLocaleDateString() : '—'}</td>
                <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
