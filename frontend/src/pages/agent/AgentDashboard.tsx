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
            <span className="text-slate-500 text-xs">Commission: {agent ? Number(agent.commission_rate).toFixed(2) : '0.00'}%</span>
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
        <ul className="mt-2 text-sm text-slate-700 space-y-1.5 leading-relaxed">
          <li>• When a microlender you referred is <strong>approved</strong>, you earn an onboarding commission: your rate × that tier's onboarding fee.</li>
          <li>• Each month, an admin generates monthly commissions: your rate × each active microlender's monthly fee.</li>
          <li>• You can monitor everything from <Link to="/agent/commissions" className="text-brand-green-dark font-semibold underline-offset-2 hover:underline">Commissions →</Link></li>
        </ul>
      </div>
    </div>
  );
};
