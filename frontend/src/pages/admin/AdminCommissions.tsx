import { useEffect, useMemo, useState } from 'react';
import { adminListCommissions, cancelCommission, generateMonthly, markPaid } from '../../api/commissions';
import type { Commission, CommissionStatus, CommissionType, Paginated } from '../../api/types';

const fmtNAD = (n: number | string) =>
  new Intl.NumberFormat('en-NA', { style: 'currency', currency: 'NAD' }).format(Number(n));

const STATUS_CLASSES: Record<CommissionStatus, string> = {
  pending: 'badge-pending', paid: 'badge-approved', cancelled: 'badge-rejected',
};
const STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: 'Pending', paid: 'Paid', cancelled: 'Cancelled',
};
const TYPE_LABELS: Record<CommissionType, string> = {
  onboarding: 'Onboarding', monthly: 'Monthly', bonus: 'Bonus', adjustment: 'Adjustment',
};

const firstOfMonth = (d = new Date()): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

const monthOptions = (): { value: string; label: string }[] => {
  const out: { value: string; label: string }[] = [{ value: '', label: 'All months' }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    out.push({
      value: `${y}-${m}-01`,
      label: d.toLocaleString('en-NA', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    });
  }
  return out;
};

export const AdminCommissions = () => {
  const [data, setData] = useState<Paginated<Commission> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CommissionStatus | ''>('');
  const [type, setType] = useState<CommissionType | ''>('');
  const [period, setPeriod] = useState<string>('');
  const [genBusy, setGenBusy] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [genMonth, setGenMonth] = useState(firstOfMonth());

  const months = useMemo(monthOptions, []);

  const load = () => {
    setLoading(true);
    adminListCommissions({
      status: status || undefined,
      type: type || undefined,
      period_month: period || undefined,
      limit: 100,
    })
      .then(setData)
      .finally(() => setLoading(false));
  };
  useEffect(load, [status, type, period]);

  const runGenerate = async () => {
    setGenBusy(true);
    setGenErr(null);
    setGenResult(null);
    try {
      const r = await generateMonthly(genMonth);
      setGenResult(`Generated ${r.created} new commissions, ${r.skipped} skipped.`);
      load();
    } catch (e) {
      setGenErr((e as Error).message);
    } finally {
      setGenBusy(false);
    }
  };

  const doMarkPaid = async (id: string) => {
    const reference = window.prompt('Payment reference (optional)') ?? undefined;
    await markPaid(id, reference || undefined);
    load();
  };
  const doCancel = async (id: string) => {
    const reason = window.prompt('Cancel reason (optional)') ?? undefined;
    await cancelCommission(id, reason || undefined);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-navy">Commissions</h1>
      <p className="text-slate-600 text-sm mt-1">Manage marketing-agent commissions across all referred microlenders.</p>

      <div className="card p-5 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <label className="field-label">Period for monthly run</label>
            <select className="field-input" value={genMonth} onChange={(e) => setGenMonth(e.target.value)}>
              {months.filter((m) => m.value).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={runGenerate} disabled={genBusy}>
            {genBusy ? 'Generating…' : 'Generate monthly commissions'}
          </button>
          {genResult && <div className="text-sm text-brand-green-dark">{genResult}</div>}
          {genErr && <div className="text-sm text-red-700">{genErr}</div>}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Creates one monthly commission row per active referred microlender for the selected period. Existing rows for the same period are skipped.
        </div>
      </div>

      <div className="card p-4 mt-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="field-label">Status</label>
          <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value as CommissionStatus | '')}>
            <option value="">All</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Type</label>
          <select className="field-input" value={type} onChange={(e) => setType(e.target.value as CommissionType | '')}>
            <option value="">All</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Month</label>
          <select className="field-input" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Period</th>
              <th className="px-5 py-3">Agent</th>
              <th className="px-5 py-3">Microlender</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Tier</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">No commissions match the current filters.</td></tr>
            )}
            {!loading && data?.items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-5 py-3 text-slate-700">
                  {new Date(c.period_month).toLocaleString('en-NA', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                </td>
                <td className="px-5 py-3 font-semibold text-brand-navy">{c.agent_name ?? '—'}</td>
                <td className="px-5 py-3 text-slate-700">{c.microlender_name ?? '—'}</td>
                <td className="px-5 py-3">{TYPE_LABELS[c.type]}</td>
                <td className="px-5 py-3 text-slate-600">{c.tier ? c.tier.replace('tier', 'Tier ') : '—'}</td>
                <td className="px-5 py-3 text-right font-bold">{fmtNAD(c.amount)}</td>
                <td className="px-5 py-3"><span className={STATUS_CLASSES[c.status]}>{STATUS_LABELS[c.status]}</span></td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  {c.status === 'pending' && (
                    <>
                      <button onClick={() => doMarkPaid(c.id)} className="text-xs font-semibold text-brand-green-dark hover:underline mr-3">Mark paid</button>
                      <button onClick={() => doCancel(c.id)} className="text-xs font-semibold text-red-600 hover:underline">Cancel</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {data && <div className="text-xs text-slate-500 mt-3">{data.items.length} of {data.total} shown.</div>}
    </div>
  );
};
