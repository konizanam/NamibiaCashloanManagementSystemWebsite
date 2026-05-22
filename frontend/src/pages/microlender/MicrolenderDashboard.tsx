import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMicrolenderDashboard, type MicrolenderProfile, type MicrolenderMessage } from '../../api/microlender';

const TIER_LABEL: Record<string, string> = {
  tier1: 'Tier 1 — Starter',
  tier2: 'Tier 2 — Growth',
  tier3: 'Tier 3 — Professional',
  tier4: 'Tier 4 — Enterprise',
};

const TIER_PRICE: Record<string, string> = {
  tier1: 'N$1,000 / month',
  tier2: 'N$2,000 / month',
  tier3: 'N$4,000 / month',
  tier4: 'N$8,000+ / month',
};

export const MicrolenderDashboard = () => {
  const [profile, setProfile] = useState<MicrolenderProfile | null>(null);
  const [messages, setMessages] = useState<MicrolenderMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMicrolenderDashboard()
      .then((r) => { setProfile(r.profile); setMessages(r.recent_messages); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (!profile) return <div className="text-red-700">Could not load microlender profile.</div>;

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-brand-green-dark font-semibold">Welcome</div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy mt-1">{profile.business_name}</h1>
      <p className="text-slate-600 mt-1 text-sm">Account active since {new Date(profile.activated_at).toLocaleDateString()}.</p>

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <div className="card p-5 border-t-4 border-brand-green">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Plan</div>
          <div className="text-lg font-extrabold text-brand-navy mt-2">{TIER_LABEL[profile.tier]}</div>
          <div className="text-xs text-slate-500 mt-1">{TIER_PRICE[profile.tier]} (ex VAT)</div>
        </div>
        <div className="card p-5 border-t-4 border-brand-navy">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">NAMFISA Reg No</div>
          <div className="text-lg font-extrabold text-brand-navy mt-2 break-all">{profile.namfisa_reg_no ?? '—'}</div>
        </div>
        <div className="card p-5 border-t-4 border-brand-amber">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Location</div>
          <div className="text-lg font-extrabold text-brand-navy mt-2">{profile.city ?? '—'}</div>
          <div className="text-xs text-slate-500 mt-1">{profile.country}</div>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <div className="font-bold text-brand-navy">Loan management portal</div>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          The full loan-management portal — client onboarding, loan creation, repayments, contracts, signatures, NAMFISA reports — is on the way and will appear here as it lands. You'll receive an email whenever a new module goes live.
        </p>
      </div>

      <div className="card p-6 mt-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="font-bold text-brand-navy">Notes from Koniza</div>
            <div className="text-xs text-slate-500 mt-0.5">Messages and updates we've sent about your account.</div>
          </div>
          <div className="text-xs text-slate-500">{messages.length} {messages.length === 1 ? 'entry' : 'entries'}</div>
        </div>
        <ul className="mt-4 space-y-3">
          {messages.length === 0 && <li className="text-sm text-slate-500 italic">No messages yet.</li>}
          {messages.map((m) => (
            <li key={m.id} className="border-l-4 border-brand-green pl-4 py-2 bg-slate-50 rounded-r">
              <div className="text-xs text-slate-500">{m.author_name ?? 'NCLMS'} · {new Date(m.created_at).toLocaleString()}</div>
              {m.subject && <div className="font-semibold text-brand-navy text-sm mt-1">{m.subject}</div>}
              <div className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{m.body}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-6 mt-6 border-l-4 border-brand-amber bg-amber-50/40">
        <div className="font-bold text-brand-navy">Need help?</div>
        <p className="text-sm text-slate-700 mt-1">
          Onboarding, configuration, or training questions go to your Koniza account manager. You can also reach support at{' '}
          <a href="mailto:it@konizanam.com" className="text-brand-green-dark font-semibold underline-offset-2 hover:underline">it@konizanam.com</a>{' '}
          or +264 81 465 7337.
        </p>
        {profile.agent_name && (
          <p className="text-sm text-slate-600 mt-2">
            Referred by: <strong className="text-brand-navy">{profile.agent_name}</strong>
            {profile.agent_email && <> · <a href={`mailto:${profile.agent_email}`} className="text-brand-green-dark">{profile.agent_email}</a></>}
          </p>
        )}
        <div className="mt-3 text-xs text-slate-500">
          <Link to="/portal/profile" className="text-brand-green-dark font-semibold underline-offset-2 hover:underline">View full business profile →</Link>
        </div>
      </div>
    </div>
  );
};
