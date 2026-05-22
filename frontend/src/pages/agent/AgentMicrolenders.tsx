import { useEffect, useState } from 'react';
import { fetchAgentMicrolenders } from '../../api/agent';
import type { ReferredMicrolender } from '../../api/types';

const TIER_LABEL: Record<string, string> = {
  tier1: 'Tier 1 — Starter',
  tier2: 'Tier 2 — Growth',
  tier3: 'Tier 3 — Professional',
  tier4: 'Tier 4 — Enterprise',
};

export const AgentMicrolenders = () => {
  const [items, setItems] = useState<ReferredMicrolender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentMicrolenders()
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-navy">Referred Microlenders</h1>
      <p className="text-slate-600 text-sm mt-1">Approved tenants who signed up with your referral code.</p>

      <div className="card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Tier</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Activated</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                No approved microlenders yet. Approved applications submitted with your code will appear here.
              </td></tr>
            )}
            {!loading && items.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-semibold text-brand-navy">{m.business_name}</td>
                <td className="px-5 py-3 text-slate-600">{m.city ?? '—'}, {m.country}</td>
                <td className="px-5 py-3 text-slate-600">{m.email}</td>
                <td className="px-5 py-3 text-slate-700">{TIER_LABEL[m.tier] ?? m.tier}</td>
                <td className="px-5 py-3">
                  {m.status === 'active'
                    ? <span className="badge-approved">Active</span>
                    : <span className="badge-rejected">{m.status}</span>}
                </td>
                <td className="px-5 py-3 text-slate-600">{new Date(m.activated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
