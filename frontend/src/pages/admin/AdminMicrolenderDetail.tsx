import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getAdminMicrolender,
  updateAdminMicrolender,
  type UpdateAdminMicrolenderInput,
} from '../../api/adminMicrolenders';
import { CityAutocomplete } from '../../components/CityAutocomplete';
import type { AdminMicrolenderDetail as AdminMicrolenderDetailRow, Tier, UserStatus } from '../../api/types';

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

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
    <div className="text-sm text-brand-navy mt-0.5">{value || <span className="text-slate-400">—</span>}</div>
  </div>
);

export const AdminMicrolenderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [ml, setMl] = useState<AdminMicrolenderDetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateAdminMicrolenderInput>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    getAdminMicrolender(id)
      .then((m) => {
        setMl(m);
        setForm({
          business_name: m.business_name,
          namfisa_reg_no: m.namfisa_reg_no ?? '',
          business_type: m.business_type ?? '',
          physical_address: m.physical_address,
          city: m.city ?? '',
          country: m.country,
          phone: m.phone,
          tier: m.tier,
          user_status: (m.user_status === 'pending' ? 'active' : m.user_status) as 'active' | 'suspended',
          full_name: m.full_name,
          email: m.email,
        });
      })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const setField = <K extends keyof UpdateAdminMicrolenderInput>(k: K, v: UpdateAdminMicrolenderInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!id) return;
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      const m = await updateAdminMicrolender(id, form);
      setMl(m);
      setEditing(false);
      setOkMsg('Saved.');
      setTimeout(() => setOkMsg(null), 2500);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (!ml) return <div className="text-red-700">{err ?? 'Microlender not found.'}</div>;

  return (
    <div>
      <button onClick={() => nav(-1)} className="text-sm text-slate-500 hover:text-brand-navy">← Back</button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mt-2 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy break-words">{ml.business_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-slate-600">
            <span className={STATUS_CLASSES[ml.user_status]}>{ml.user_status}</span>
            <span>{TIER_LABEL[ml.tier]}</span>
            <span>Activated {new Date(ml.activated_at).toLocaleDateString()}</span>
          </div>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => setEditing(true)}>Edit</button>
            {ml.user_status === 'active' && (
              <button
                className="btn-outline border-red-300 text-red-700 hover:bg-red-50"
                onClick={async () => {
                  if (!window.confirm(`Suspend ${ml.business_name}?`)) return;
                  await updateAdminMicrolender(ml.id, { user_status: 'suspended' });
                  load();
                }}
              >
                Suspend
              </button>
            )}
            {ml.user_status === 'suspended' && (
              <button
                className="btn-primary"
                onClick={async () => {
                  await updateAdminMicrolender(ml.id, { user_status: 'active' });
                  load();
                }}
              >
                Reactivate
              </button>
            )}
          </div>
        )}
      </div>

      {okMsg && <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{okMsg}</div>}
      {err && <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}

      {!editing ? (
        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <div className="card p-6">
            <div className="font-bold text-brand-navy">Business</div>
            <div className="grid sm:grid-cols-2 gap-5 mt-4">
              <Row label="NAMFISA Reg No" value={ml.namfisa_reg_no} />
              <Row label="Business type"   value={ml.business_type} />
              <Row label="City"            value={ml.city} />
              <Row label="Country"         value={ml.country} />
              <Row label="Phone"           value={ml.phone} />
              <Row label="Tier"            value={TIER_LABEL[ml.tier]} />
              <div className="sm:col-span-2">
                <Row label="Physical address" value={ml.physical_address} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="font-bold text-brand-navy">Sign-in account</div>
            <div className="grid sm:grid-cols-2 gap-5 mt-4">
              <Row label="Principal officer" value={ml.full_name} />
              <Row label="Login email" value={ml.email} />
              <Row label="Status" value={<span className={STATUS_CLASSES[ml.user_status]}>{ml.user_status}</span>} />
            </div>

            {ml.agent_name && (
              <>
                <div className="font-bold text-brand-navy mt-6">Referred by</div>
                <div className="grid sm:grid-cols-2 gap-5 mt-4">
                  <Row label="Agent" value={ml.agent_name} />
                  <Row label="Referral code" value={ml.agent_referral_code ? <span className="font-mono">{ml.agent_referral_code}</span> : null} />
                  <Row label="Email" value={ml.agent_email} />
                  <Row label="Phone" value={ml.agent_phone} />
                </div>
              </>
            )}

            {ml.application_id && (
              <div className="mt-6 text-sm">
                <Link to={`/admin/applications/${ml.application_id}`} className="text-brand-green-dark font-semibold hover:underline">
                  View original application →
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-6 md:p-8 mt-8 space-y-5">
          <div className="font-bold text-brand-navy">Edit microlender</div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Business name</label>
              <input className="field-input" value={form.business_name ?? ''} onChange={(e) => setField('business_name', e.target.value)} />
            </div>
            <div>
              <label className="field-label">NAMFISA Reg No</label>
              <input className="field-input" value={form.namfisa_reg_no ?? ''} onChange={(e) => setField('namfisa_reg_no', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Business type</label>
              <input className="field-input" value={form.business_type ?? ''} onChange={(e) => setField('business_type', e.target.value)} />
            </div>
            <CityAutocomplete value={form.city ?? ''} onChange={(v) => setField('city', v)} />
            <div>
              <label className="field-label">Country</label>
              <input className="field-input" value={form.country ?? ''} onChange={(e) => setField('country', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input className="field-input" value={form.phone ?? ''} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Physical address</label>
              <textarea className="field-input" rows={2} value={form.physical_address ?? ''} onChange={(e) => setField('physical_address', e.target.value)} />
            </div>

            <div className="sm:col-span-2 border-t border-slate-100 pt-3">
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Account</div>
            </div>
            <div>
              <label className="field-label">Principal officer name</label>
              <input className="field-input" value={form.full_name ?? ''} onChange={(e) => setField('full_name', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Login email</label>
              <input type="email" className="field-input" value={form.email ?? ''} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Tier</label>
              <select className="field-input" value={form.tier ?? ml.tier} onChange={(e) => setField('tier', e.target.value as Tier)}>
                {(['tier1', 'tier2', 'tier3', 'tier4'] as Tier[]).map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Status</label>
              <select className="field-input" value={form.user_status ?? 'active'} onChange={(e) => setField('user_status', e.target.value as 'active' | 'suspended')}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => { setEditing(false); load(); }} disabled={busy}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      )}
    </div>
  );
};
