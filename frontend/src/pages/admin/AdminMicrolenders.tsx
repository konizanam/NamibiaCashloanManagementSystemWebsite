import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createAdminMicrolender,
  listAdminMicrolenders,
  type CreateAdminMicrolenderInput,
} from '../../api/adminMicrolenders';
import { CityAutocomplete } from '../../components/CityAutocomplete';
import type { AdminMicrolenderList, Paginated, Tier, UserStatus } from '../../api/types';

const TIER_LABEL: Record<Tier, string> = {
  tier1: 'Tier 1 — Starter',
  tier2: 'Tier 2 — Growth',
  tier3: 'Tier 3 — Professional',
  tier4: 'Tier 4 — Enterprise',
};

const STATUS_CLASSES: Record<UserStatus, string> = {
  active:    'badge-approved',
  suspended: 'badge-rejected',
  pending:   'badge-pending',
};

const STATUS_OPTIONS: { value: UserStatus | ''; label: string }[] = [
  { value: '',          label: 'All statuses' },
  { value: 'active',    label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending',   label: 'Pending' },
];

const TIER_OPTIONS: { value: Tier | ''; label: string }[] = [
  { value: '',      label: 'All tiers' },
  { value: 'tier1', label: 'Tier 1' },
  { value: 'tier2', label: 'Tier 2' },
  { value: 'tier3', label: 'Tier 3' },
  { value: 'tier4', label: 'Tier 4' },
];

export const AdminMicrolenders = () => {
  const [data, setData] = useState<Paginated<AdminMicrolenderList> | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [tier, setTier] = useState<Tier | ''>('');
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    listAdminMicrolenders({
      q: q.trim() || undefined,
      status: status || undefined,
      tier:   tier   || undefined,
      limit: 100,
    })
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, tier]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy">Microlenders</h1>
          <p className="text-slate-600 text-sm mt-1">Manage tenant microlenders — edit details, change tier, suspend or reactivate.</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}>+ New microlender</button>
      </div>

      <div className="card p-4 mt-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="field-label">Search</label>
          <input
            className="field-input"
            placeholder="Business name / NAMFISA Reg / email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
          />
        </div>
        <div>
          <label className="field-label">Status</label>
          <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value as UserStatus | '')}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Tier</label>
          <select className="field-input" value={tier} onChange={(e) => setTier(e.target.value as Tier | '')}>
            {TIER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button className="btn-outline" onClick={load}>Apply</button>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">NAMFISA Reg</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Tier</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Referred by</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">No microlenders match.</td></tr>
            )}
            {!loading && data?.items.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <div className="font-semibold text-brand-navy">{m.business_name}</div>
                  <div className="text-xs text-slate-500">{m.city ?? '—'}, {m.country}</div>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-slate-700">{m.namfisa_reg_no ?? '—'}</td>
                <td className="px-5 py-3 text-slate-700">{m.email}</td>
                <td className="px-5 py-3 text-slate-700">{TIER_LABEL[m.tier]}</td>
                <td className="px-5 py-3"><span className={STATUS_CLASSES[m.user_status]}>{m.user_status}</span></td>
                <td className="px-5 py-3 text-slate-600">
                  {m.agent_name
                    ? <><div>{m.agent_name}</div><div className="text-xs font-mono text-slate-500">{m.agent_referral_code}</div></>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link to={`/admin/microlenders/${m.id}`} className="text-brand-green-dark font-semibold hover:underline">
                    Manage →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {data && <div className="text-xs text-slate-500 mt-3">{data.items.length} of {data.total} shown.</div>}

      {showCreate && (
        <CreateMicrolenderModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
};

const CreateMicrolenderModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const [form, setForm] = useState<CreateAdminMicrolenderInput>({
    business_name: '',
    namfisa_reg_no: '',
    business_type: '',
    physical_address: '',
    city: '',
    country: 'Namibia',
    phone: '',
    business_email: '',
    full_name: '',
    password: '',
    tier: 'tier1',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setField = <K extends keyof CreateAdminMicrolenderInput>(k: K, v: CreateAdminMicrolenderInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await createAdminMicrolender(form);
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    form.business_name.trim() &&
    form.namfisa_reg_no.trim() &&
    form.business_type.trim() &&
    form.city.trim() &&
    form.business_email.includes('@') &&
    form.full_name.trim() &&
    (form.password?.length ?? 0) >= 8;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-brand-navy text-lg">New microlender</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Skips the application flow. Creates a user account (with must-change-password) and the microlender record in one step.</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Business name *</label>
            <input className="field-input" value={form.business_name} onChange={(e) => setField('business_name', e.target.value)} />
          </div>
          <div>
            <label className="field-label">NAMFISA Reg No *</label>
            <input className="field-input" value={form.namfisa_reg_no} onChange={(e) => setField('namfisa_reg_no', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Business type *</label>
            <select className="field-input" value={form.business_type} onChange={(e) => setField('business_type', e.target.value)}>
              <option value="">Select…</option>
              <option value="Sole Proprietor">Sole Proprietor</option>
              <option value="Close Corporation">Close Corporation (CC)</option>
              <option value="Private Company">Private Company (Pty) Ltd</option>
              <option value="Partnership">Partnership</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <CityAutocomplete required value={form.city} onChange={(v) => setField('city', v)} />
          <div className="sm:col-span-2">
            <label className="field-label">Physical address</label>
            <textarea className="field-input" rows={2} value={form.physical_address ?? ''} onChange={(e) => setField('physical_address', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Country</label>
            <input className="field-input" value={form.country ?? 'Namibia'} onChange={(e) => setField('country', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Phone</label>
            <input className="field-input" value={form.phone ?? ''} onChange={(e) => setField('phone', e.target.value)} />
          </div>

          <div className="sm:col-span-2 border-t border-slate-100 pt-3">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Sign-in account</div>
          </div>
          <div>
            <label className="field-label">Principal officer name *</label>
            <input className="field-input" value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Login email *</label>
            <input type="email" className="field-input" value={form.business_email} onChange={(e) => setField('business_email', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Temporary password * (min 8)</label>
            <input type="text" className="field-input" value={form.password} onChange={(e) => setField('password', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Tier</label>
            <select className="field-input" value={form.tier ?? 'tier1'} onChange={(e) => setField('tier', e.target.value as Tier)}>
              {(['tier1', 'tier2', 'tier3', 'tier4'] as Tier[]).map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
            </select>
          </div>
        </div>

        {err && <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy || !canSubmit}>
            {busy ? 'Creating…' : 'Create microlender'}
          </button>
        </div>
      </div>
    </div>
  );
};
