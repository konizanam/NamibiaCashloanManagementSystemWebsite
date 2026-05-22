import { useEffect, useState } from 'react';
import { fetchMicrolenderProfile, type MicrolenderProfile as Profile } from '../../api/microlender';

const TIER_LABEL: Record<string, string> = {
  tier1: 'Tier 1 — Starter',
  tier2: 'Tier 2 — Growth',
  tier3: 'Tier 3 — Professional',
  tier4: 'Tier 4 — Enterprise',
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
    <div className="text-sm text-brand-navy mt-0.5">{value || <span className="text-slate-400">—</span>}</div>
  </div>
);

export const MicrolenderProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMicrolenderProfile()
      .then((r) => setProfile(r.profile))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (!profile) return <div className="text-red-700">Could not load profile.</div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-navy">Business profile</h1>
      <p className="text-slate-600 text-sm mt-1">The details on file with Koniza. Reach out if any of this needs changing.</p>

      <div className="card p-6 mt-6">
        <div className="font-bold text-brand-navy">Business</div>
        <div className="grid sm:grid-cols-2 gap-5 mt-4">
          <Row label="Business name"     value={profile.business_name} />
          <Row label="NAMFISA Reg No"    value={profile.namfisa_reg_no} />
          <Row label="Business type"     value={profile.business_type} />
          <Row label="City"              value={profile.city} />
          <Row label="Country"           value={profile.country} />
          <Row label="Phone"             value={profile.phone} />
          <Row label="Login email"       value={profile.email} />
          <Row label="Tier"              value={TIER_LABEL[profile.tier] ?? profile.tier} />
          <div className="sm:col-span-2">
            <Row label="Physical address" value={profile.physical_address} />
          </div>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <div className="font-bold text-brand-navy">Principal officer</div>
        <div className="grid sm:grid-cols-2 gap-5 mt-4">
          <Row label="Name"  value={profile.full_name} />
          <Row label="Email" value={profile.email} />
        </div>
      </div>

      {profile.agent_name && (
        <div className="card p-6 mt-6">
          <div className="font-bold text-brand-navy">Referred by</div>
          <div className="grid sm:grid-cols-2 gap-5 mt-4">
            <Row label="Marketing agent" value={profile.agent_name} />
            <Row label="Email"           value={profile.agent_email} />
            <Row label="Phone"           value={profile.agent_phone} />
          </div>
        </div>
      )}

      <div className="card p-6 mt-6 border-l-4 border-brand-green bg-green-50/40 text-sm text-slate-700">
        Account activated on <strong>{new Date(profile.activated_at).toLocaleString()}</strong>.
      </div>
    </div>
  );
};
