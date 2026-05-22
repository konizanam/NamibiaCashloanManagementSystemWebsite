import { useEffect, useMemo, useState } from 'react';
import { fetchAgentCommissions } from '../../api/agent';
import {
  confirmCommissionPayment,
  disputeCommissionPayment,
  requestCommissionPayment,
} from '../../api/commissions';
import { getToken } from '../../api/client';
import { PromptModal } from '../../components/PromptModal';
import type { Commission, CommissionStatus, CommissionType, Paginated } from '../../api/types';

const fmtNAD = (n: number | string) =>
  new Intl.NumberFormat('en-NA', { style: 'currency', currency: 'NAD' }).format(Number(n));

const STATUS_LABELS: Record<CommissionStatus, string> = {
  pending:                       'Pending',
  payment_requested:             'Payment requested',
  awaiting_agent_confirmation:   'Awaiting your confirmation',
  paid:                          'Paid',
  disputed:                      'Disputed',
  cancelled:                     'Cancelled',
};
const STATUS_CLASSES: Record<CommissionStatus, string> = {
  pending:                       'badge-pending',
  payment_requested:             'badge-info',
  awaiting_agent_confirmation:   'badge-info',
  paid:                          'badge-approved',
  disputed:                      'badge-rejected',
  cancelled:                     'badge-rejected',
};
const TYPE_LABELS: Record<CommissionType, string> = {
  onboarding: 'Onboarding', monthly: 'Monthly', bonus: 'Bonus', adjustment: 'Adjustment',
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

const viewMyProof = async (commissionId: string) => {
  const token = getToken();
  const res = await fetch(`/api/agent/commissions/${commissionId}/proof?inline=1`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const AgentCommissions = () => {
  const [data, setData] = useState<Paginated<Commission> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CommissionStatus | ''>('');
  const [type, setType] = useState<CommissionType | ''>('');
  const [period, setPeriod] = useState<string>('');
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const months = useMemo(monthOptions, []);

  const load = () => {
    setLoading(true);
    fetchAgentCommissions({
      status: status || undefined,
      type:   type   || undefined,
      period_month: period || undefined,
      limit: 100,
    })
      .then(setData)
      .finally(() => setLoading(false));
  };
  useEffect(load, [status, type, period]);

  const summary = useMemo(() => {
    if (!data) return { earned: 0, pending: 0, paid: 0 };
    return data.items.reduce(
      (acc, c) => {
        const a = Number(c.amount);
        if (c.status === 'paid')    { acc.paid += a;    acc.earned += a; }
        if (c.status === 'pending' || c.status === 'payment_requested' || c.status === 'awaiting_agent_confirmation') {
          acc.pending += a; acc.earned += a;
        }
        return acc;
      },
      { earned: 0, pending: 0, paid: 0 },
    );
  }, [data]);

  const doConfirm = async (id: string) => {
    setActionErr(null);
    try { await confirmCommissionPayment(id); load(); }
    catch (e) { setActionErr((e as Error).message); }
  };

  const submitDispute = async (reason: string) => {
    if (!disputeId) return;
    await disputeCommissionPayment(disputeId, reason);
    load();
  };

  const submitRequest = async (note: string) => {
    if (!requestId) return;
    await requestCommissionPayment(requestId, note || undefined);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-navy">Commissions</h1>
      <p className="text-slate-600 text-sm mt-1">All commissions credited to your account. Confirm or dispute payments here, or request payment for a pending commission.</p>

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Filter total — earned</div>
          <div className="text-xl font-extrabold text-brand-navy mt-1">{fmtNAD(summary.earned)}</div>
        </div>
        <div className="card p-4 border-l-4 border-brand-amber">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Outstanding</div>
          <div className="text-xl font-extrabold text-brand-navy mt-1">{fmtNAD(summary.pending)}</div>
        </div>
        <div className="card p-4 border-l-4 border-brand-green">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Paid + confirmed</div>
          <div className="text-xl font-extrabold text-brand-navy mt-1">{fmtNAD(summary.paid)}</div>
        </div>
      </div>

      <div className="card p-4 mt-6 flex flex-wrap gap-3 items-end">
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

      {actionErr && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{actionErr}</div>
      )}

      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Period</th>
              <th className="px-5 py-3">Microlender</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Proof</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">No commissions match the current filters.</td></tr>
            )}
            {!loading && data?.items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-5 py-3 text-slate-700">
                  {new Date(c.period_month).toLocaleString('en-NA', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                </td>
                <td className="px-5 py-3 font-semibold text-brand-navy">{c.microlender_name || '—'}</td>
                <td className="px-5 py-3">{TYPE_LABELS[c.type]}</td>
                <td className="px-5 py-3 text-right font-bold text-brand-navy">{fmtNAD(c.amount)}</td>
                <td className="px-5 py-3">
                  <span className={STATUS_CLASSES[c.status]}>{STATUS_LABELS[c.status]}</span>
                  {c.status === 'awaiting_agent_confirmation' && c.paid_reference && (
                    <div className="text-xs text-slate-500 mt-1">Ref: <span className="font-mono">{c.paid_reference}</span></div>
                  )}
                </td>
                <td className="px-5 py-3">
                  {c.proof_file_name
                    ? <button onClick={() => viewMyProof(c.id)} className="text-xs font-semibold text-brand-navy hover:underline">View</button>
                    : <span className="text-xs text-slate-400">—</span>}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  {c.status === 'pending' && (
                    <button onClick={() => setRequestId(c.id)} className="text-xs font-semibold text-brand-amber hover:underline">
                      Request payment
                    </button>
                  )}
                  {c.status === 'awaiting_agent_confirmation' && (
                    <>
                      <button onClick={() => doConfirm(c.id)} className="text-xs font-semibold text-brand-green-dark hover:underline mr-3">
                        Confirm receipt
                      </button>
                      <button onClick={() => setDisputeId(c.id)} className="text-xs font-semibold text-red-600 hover:underline">
                        Dispute
                      </button>
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

      <PromptModal
        open={disputeId !== null}
        title="Dispute this payment"
        description="Tell Koniza what looks wrong — wrong amount, never received, anything else. Admin will be notified."
        label="Reason"
        placeholder="e.g. Amount is lower than expected, or payment never arrived in my account."
        multiline
        required
        minLength={3}
        confirmLabel="Submit dispute"
        variant="danger"
        onClose={() => setDisputeId(null)}
        onSubmit={submitDispute}
      />

      <PromptModal
        open={requestId !== null}
        title="Request payment"
        description="Asks Koniza to process this commission. You can leave a note with banking details or any context."
        label="Note (optional)"
        placeholder="e.g. Please use the FNB account on file."
        multiline
        confirmLabel="Send request"
        onClose={() => setRequestId(null)}
        onSubmit={submitRequest}
      />
    </div>
  );
};
