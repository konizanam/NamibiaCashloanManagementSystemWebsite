import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAgentDashboard } from '../../api/agent';
import type { AgentDashboardStats, AgentProfile } from '../../api/types';

const fmtNAD = (n: number) =>
  new Intl.NumberFormat('en-NA', { style: 'currency', currency: 'NAD', maximumFractionDigits: 2 }).format(n);

const StatCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) => (
  <div className={`card p-5 border-t-4 ${color}`}>
    <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
    <div className="text-2xl font-extrabold text-brand-navy mt-2 break-words">{value}</div>
    {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
  </div>
);

export const AgentDashboard = () => {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [stats, setStats] = useState<AgentDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentDashboard()
      .then((r) => { setAgent(r.agent); setStats(r.stats); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-brand-green-dark font-semibold">Welcome back</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy mt-1">{agent?.full_name || '…'}</h1>
        </div>
        <div className="text-sm">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Your referral code</div>
          <div className="mt-1 inline-flex items-center gap-2">
            <code className="font-mono font-bold text-lg bg-slate-100 px-3 py-1 rounded-md">{agent?.referral_code ?? '—'}</code>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatCard label="Pending payout" color="border-brand-amber"
                  value={loading ? '…' : fmtNAD(stats!.total_pending)}
                  sub="Earned but not yet paid out" />
        <StatCard label="Paid all-time" color="border-brand-green"
                  value={loading ? '…' : fmtNAD(stats!.total_paid_all_time)}
                  sub="Sum of all paid commissions" />
        <StatCard label="This month earned" color="border-brand-navy"
                  value={loading ? '…' : fmtNAD(stats!.this_month_earned)}
                  sub="Posted to your account this month" />
        <StatCard label="Projected next month" color="border-blue-400"
                  value={loading ? '…' : fmtNAD(stats!.projected_next_month)}
                  sub="Based on active referrals × commission rate" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <StatCard label="Active microlenders" color="border-brand-green"
                  value={loading ? '…' : String(stats!.total_active_microlenders)}
                  sub="Approved tenants you referred" />
        <StatCard label="Total applications referred" color="border-brand-navy"
                  value={loading ? '…' : String(stats!.total_referred_applications)}
                  sub="Includes pending, approved, rejected" />
      </div>

      <div className="card mt-8 p-6">
        <div className="font-bold text-brand-navy">How commissions are calculated</div>
        <p className="text-sm text-slate-600 mt-1">Per the Marketing &amp; Client Acquisition Commission Agreement:</p>
        <ul className="mt-3 text-sm text-slate-700 space-y-1.5 leading-relaxed">
          <li>• <strong>Onboarding:</strong> 15% of the client's onboarding fee — once-off, payable when their fee is received.</li>
          <li>• <strong>Subscription, Year 1 &amp; Year 2:</strong> 25% of monthly subscription fees received.</li>
          <li>• <strong>Subscription, Year 3:</strong> 15% of monthly subscription fees received.</li>
          <li>• <strong>After month 36:</strong> commission period ends — no further commission accrues, regardless of any renewals.</li>
          <li>• Commission is calculated monthly and paid only on fees that have actually cleared into Koniza's bank account. No commission on unpaid, refunded, written-off, or cancelled fees.</li>
        </ul>
        <p className="text-sm text-slate-600 mt-3">
          Track every entry from <Link to="/agent/commissions" className="text-brand-green-dark font-semibold underline-offset-2 hover:underline">Commissions →</Link> and see all your referred companies under <Link to="/agent/applications" className="text-brand-green-dark font-semibold underline-offset-2 hover:underline">All Sign-ups →</Link>
        </p>
      </div>
    </div>
  );
};
