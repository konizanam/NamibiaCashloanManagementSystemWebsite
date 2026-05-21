import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listApplications } from '../../api/applications';
import type { Application, ApplicationStatus } from '../../api/types';
import { StatusBadge } from '../../components/StatusBadge';

interface Stat { label: string; value: number; color: string }

export const AdminDashboard = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [recent, setRecent] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listApplications({ status: 'pending', limit: 100 }),
      listApplications({ status: 'approved', limit: 100 }),
      listApplications({ status: 'rejected', limit: 100 }),
      listApplications({ limit: 5 }),
    ])
      .then(([pending, approved, rejected, all]) => {
        setStats([
          { label: 'Pending review',     value: pending.total,  color: 'border-brand-amber' },
          { label: 'Approved tenants',   value: approved.total, color: 'border-brand-green' },
          { label: 'Rejected',           value: rejected.total, color: 'border-red-400' },
          { label: 'Total applications', value: all.total,      color: 'border-brand-navy' },
        ]);
        setRecent(all.items);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-navy">Admin Dashboard</h1>
      <p className="text-slate-600 text-sm mt-1">Monitor applications and tenant onboarding at a glance.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {stats.map((s) => (
          <div key={s.label} className={`card p-5 border-t-4 ${s.color}`}>
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{s.label}</div>
            <div className="text-3xl font-extrabold text-brand-navy mt-2">
              {loading ? '…' : s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-8">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-brand-navy">Recent applications</div>
          <Link to="/admin/applications" className="text-sm text-brand-green-dark hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">Submitted</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {recent.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-5 py-3 font-semibold text-brand-navy">{a.business_name}</td>
                <td className="px-5 py-3 text-slate-600">{new Date(a.submitted_at).toLocaleString()}</td>
                <td className="px-5 py-3"><StatusBadge status={a.status as ApplicationStatus} /></td>
                <td className="px-5 py-3 text-right">
                  <Link to={`/admin/applications/${a.id}`} className="text-brand-green-dark hover:underline">Review</Link>
                </td>
              </tr>
            ))}
            {!loading && recent.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No applications yet.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
