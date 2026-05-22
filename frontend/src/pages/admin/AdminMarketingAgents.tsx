import { useEffect, useState } from 'react';
import { createAgent, listAgents, updateAgent } from '../../api/marketingAgents';
import type { MarketingAgent } from '../../api/types';
import { TextField, TextAreaField } from '../../components/Field';

export const AdminMarketingAgents = () => {
  const [agents, setAgents] = useState<MarketingAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', notes: '' });

  const load = () => {
    setLoading(true);
    listAgents()
      .then((r) => setAgents(r.items))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await createAgent({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        notes: form.notes || undefined,
      });
      setShowCreate(false);
      setForm({ full_name: '', email: '', phone: '', password: '', notes: '' });
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (a: MarketingAgent) => {
    await updateAgent(a.id, { is_active: !a.is_active });
    load();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy">Marketing Agents</h1>
          <p className="text-slate-600 text-sm mt-1">Koniza referrers and their unique referral codes.</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}>+ New agent</button>
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Referral code</th>
              <th className="px-5 py-3">Active</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!loading && agents.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No marketing agents yet.</td></tr>
            )}
            {!loading && agents.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-semibold text-brand-navy">{a.full_name}</td>
                <td className="px-5 py-3 text-slate-600">{a.email}</td>
                <td className="px-5 py-3"><span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{a.referral_code}</span></td>
                <td className="px-5 py-3">
                  {a.is_active
                    ? <span className="badge-approved">Active</span>
                    : <span className="badge-rejected">Inactive</span>}
                </td>
                <td className="px-5 py-3 text-right">
                  <button className="text-sm font-semibold text-brand-green-dark hover:underline" onClick={() => toggleActive(a)}>
                    {a.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-brand-navy text-lg">New marketing agent</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <TextField label="Full name" required value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} name="full_name" />
              </div>
              <TextField label="Email" required type="email" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} name="email" />
              <TextField label="Phone" value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} name="phone" />
              <div className="sm:col-span-2">
                <TextField label="Temporary password" required type="text" value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  help="Min 8 characters. Agent should change on first sign-in." name="password" />
              </div>
              <div className="sm:col-span-2">
                <TextAreaField label="Notes" value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} name="notes" />
              </div>
              <div className="sm:col-span-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                Commissions follow the standard Marketing &amp; Client Acquisition Agreement: 15% of onboarding fees,
                25% of subscription fees in Year 1 &amp; 2, and 15% in Year 3. After month 36 no further commission accrues.
              </div>
            </div>
            {err && <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setShowCreate(false)} disabled={busy}>Cancel</button>
              <button className="btn-primary" disabled={busy || !form.full_name || !form.email || form.password.length < 8} onClick={submit}>
                {busy ? 'Creating…' : 'Create agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
