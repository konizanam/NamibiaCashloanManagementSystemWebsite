import { useEffect, useMemo, useState } from 'react';
import {
  adminListCommissions,
  cancelCommission,
  generateMonthly,
  markPaidWithProof,
} from '../../api/commissions';
import { getToken } from '../../api/client';
import { listAgents } from '../../api/marketingAgents';
import { PromptModal } from '../../components/PromptModal';
import { AgentAutocomplete } from '../../components/AgentAutocomplete';
import type { Commission, CommissionStatus, CommissionType, MarketingAgent, Paginated } from '../../api/types';

const fmtNAD = (n: number | string) =>
  new Intl.NumberFormat('en-NA', { style: 'currency', currency: 'NAD' }).format(Number(n));

const STATUS_LABELS: Record<CommissionStatus, string> = {
  pending:                       'Pending',
  payment_requested:             'Payment requested',
  awaiting_agent_confirmation:   'Awaiting confirmation',
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

const viewProof = async (commissionId: string) => {
  const token = getToken();
  const res = await fetch(`/api/admin/commissions/${commissionId}/proof?inline=1`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

interface MarkPaidModalProps {
  commission: Commission;
  onClose: () => void;
  onDone: () => void;
}

const MarkPaidModal = ({ commission, onClose, onDone }: MarkPaidModalProps) => {
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await markPaidWithProof(commission.id, reference || undefined, file ?? undefined);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-brand-navy text-lg">Mark commission as paid</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Status will move to <strong>Awaiting confirmation</strong>. The agent gets an email asking them to confirm receipt — and to view the proof you attach.
        </p>
        <div className="space-y-4">
          <div>
            <label className="field-label">Payment reference</label>
            <input className="field-input" placeholder="e.g. PAY-2026-007"
                   value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Proof of payment (PDF / image)</label>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
                   className="block w-full text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-md file:bg-brand-navy file:text-white"
                   onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <div className="field-help">Optional but strongly recommended.</div>
          </div>
          <div className="text-xs text-slate-500">Amount: <strong className="text-brand-navy">{fmtNAD(commission.amount)}</strong></div>
          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Mark paid'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminCommissions = () => {
  const [data, setData] = useState<Paginated<Commission> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CommissionStatus | ''>('');
  const [type, setType] = useState<CommissionType | ''>('');
  const [period, setPeriod] = useState<string>('');
  const [agentId, setAgentId] = useState<string>('');
  const [agents, setAgents] = useState<MarketingAgent[]>([]);
  const [genBusy, setGenBusy] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [genMonth, setGenMonth] = useState(firstOfMonth());
  const [payTarget, setPayTarget] = useState<Commission | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const months = useMemo(monthOptions, []);

  const load = () => {
    setLoading(true);
    adminListCommissions({
      status: status || undefined,
      type: type || undefined,
      period_month: period || undefined,
      agent_id: agentId || undefined,
      limit: 100,
    })
      .then(setData)
      .finally(() => setLoading(false));
  };
  useEffect(load, [status, type, period, agentId]);

  // Agents list for the filter dropdown.
  useEffect(() => {
    listAgents().then((r) => setAgents(r.items)).catch(() => undefined);
  }, []);

  const runGenerate = async () => {
    setGenBusy(true);
    setGenErr(null);
    setGenResult(null);
    try {
      const r = await generateMonthly(genMonth);
      setGenResult(`Generated ${r.created} new, ${r.skipped} skipped, ${r.expired} past commission period.`);
      load();
    } catch (e) {
      setGenErr((e as Error).message);
    } finally {
      setGenBusy(false);
    }
  };

  const submitCancel = async (reason: string) => {
    if (!cancelId) return;
    await cancelCommission(cancelId, reason || undefined);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-navy">Commissions</h1>
      <p className="text-slate-600 text-sm mt-1">Manage marketing-agent commissions, mark them paid with proof, then await agent confirmation.</p>

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
          Creates one monthly commission row per active referred microlender for the selected period. Existing rows for the same period are skipped. Microlenders past their 36-month commission window are reported as "past commission period".
        </div>
      </div>

      <div className="card p-4 mt-4 flex flex-wrap gap-3 items-end">
        <AgentAutocomplete agents={agents} value={agentId} onChange={setAgentId} />
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
        {(agentId || status || type || period) && (
          <button
            className="btn-outline"
            onClick={() => { setAgentId(''); setStatus(''); setType(''); setPeriod(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Period</th>
              <th className="px-5 py-3">Agent</th>
              <th className="px-5 py-3">Microlender</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Proof</th>
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
                <td className="px-5 py-3 text-right font-bold">{fmtNAD(c.amount)}</td>
                <td className="px-5 py-3">
                  <span className={STATUS_CLASSES[c.status]}>{STATUS_LABELS[c.status]}</span>
                  {c.status === 'disputed' && c.dispute_reason && (
                    <div className="text-xs text-red-600 mt-1 max-w-[260px]">"{c.dispute_reason}"</div>
                  )}
                  {c.status === 'payment_requested' && (
                    <div className="text-xs text-blue-700 mt-1">Agent requested payment</div>
                  )}
                </td>
                <td className="px-5 py-3">
                  {c.proof_file_name
                    ? <button onClick={() => viewProof(c.id)} className="text-xs font-semibold text-brand-navy hover:underline">View</button>
                    : <span className="text-xs text-slate-400">—</span>}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  {(c.status === 'pending' || c.status === 'payment_requested' || c.status === 'disputed') && (
                    <>
                      <button onClick={() => setPayTarget(c)} className="text-xs font-semibold text-brand-green-dark hover:underline mr-3">Mark paid</button>
                      <button onClick={() => setCancelId(c.id)} className="text-xs font-semibold text-red-600 hover:underline">Cancel</button>
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

      {payTarget && (
        <MarkPaidModal
          commission={payTarget}
          onClose={() => setPayTarget(null)}
          onDone={() => { setPayTarget(null); load(); }}
        />
      )}

      <PromptModal
        open={cancelId !== null}
        title="Cancel commission"
        description="The commission is moved to Cancelled. You can record an internal note explaining why."
        label="Reason (optional)"
        placeholder="e.g. Microlender cancelled subscription"
        multiline
        confirmLabel="Cancel commission"
        variant="danger"
        onClose={() => setCancelId(null)}
        onSubmit={submitCancel}
      />
    </div>
  );
};
