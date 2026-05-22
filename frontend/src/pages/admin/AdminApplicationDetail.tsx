import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { approveApplication, getApplication, rejectApplication } from '../../api/applications';
import { listApplicationMessages, postApplicationMessage } from '../../api/messages';
import type { Application, ApplicationDocument, ApplicationMessage } from '../../api/types';
import { StatusBadge } from '../../components/StatusBadge';
import { getToken } from '../../api/client';

const docLabel: Record<string, string> = {
  founding_statement:      'Founding statement',
  namfisa_certificate:     'NAMFISA certificate',
  namfisa_approval_letter: 'NAMFISA approval letter',
  principal_officer_id:    'Principal officer ID',
  business_registration:   'Business registration (CC / Company)',
  member_id:               'Member / director ID',
  other:                   'Other document',
};

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

export const AdminApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [docs, setDocs] = useState<ApplicationDocument[]>([]);
  const [messages, setMessages] = useState<ApplicationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [reason, setReason] = useState('');
  const [tier, setTier] = useState<'tier1' | 'tier2' | 'tier3' | 'tier4'>('tier1');
  const [notes, setNotes] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Message composer state
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgSendEmail, setMsgSendEmail] = useState(true);
  const [msgIsInfoRequest, setMsgIsInfoRequest] = useState(false);
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgErr, setMsgErr] = useState<string | null>(null);

  const loadMessages = (appId: string) => {
    listApplicationMessages(appId).then((r) => setMessages(r.items)).catch(() => undefined);
  };

  const load = () => {
    if (!id) return;
    setLoading(true);
    getApplication(id)
      .then((r) => {
        setApp(r.application);
        setDocs(r.documents);
        if (r.application.preferred_tier) setTier(r.application.preferred_tier);
        loadMessages(id);
      })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const sendMessage = async () => {
    if (!id || !msgBody.trim()) return;
    setMsgBusy(true);
    setMsgErr(null);
    try {
      await postApplicationMessage(id, {
        subject: msgSubject.trim() || undefined,
        body: msgBody.trim(),
        send_email: msgSendEmail,
        is_info_request: msgIsInfoRequest,
      });
      setMsgSubject(''); setMsgBody(''); setMsgIsInfoRequest(false);
      loadMessages(id);
      if (msgIsInfoRequest) load(); // refresh status badge
    } catch (e) {
      setMsgErr((e as Error).message);
    } finally {
      setMsgBusy(false);
    }
  };

  const doApprove = async () => {
    if (!id) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await approveApplication(id, { tier, notes: notes || undefined });
      setTempPassword(res.temporary_password);
      setShowApprove(false);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    if (!id) return;
    setBusy(true);
    setErr(null);
    try {
      await rejectApplication(id, reason);
      setShowReject(false);
      setReason('');
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const downloadDoc = async (doc: ApplicationDocument) => {
    if (!id) return;
    const token = getToken();
    const res = await fetch(`/api/applications/${id}/documents/${doc.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (!app) return <div className="text-red-600">{err ?? 'Not found'}</div>;

  return (
    <div>
      <button onClick={() => nav(-1)} className="text-sm text-slate-500 hover:text-brand-navy">← Back</button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mt-2 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy break-words">{app.business_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-slate-600">
            <StatusBadge status={app.status} />
            <span>Submitted {new Date(app.submitted_at).toLocaleString()}</span>
          </div>
        </div>
        {app.status === 'pending' && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="btn-outline border-red-300 text-red-700 hover:bg-red-50 flex-1 sm:flex-none" onClick={() => setShowReject(true)}>
              Reject
            </button>
            <button className="btn-primary flex-1 sm:flex-none" onClick={() => setShowApprove(true)}>
              Approve
            </button>
          </div>
        )}
      </div>

      {tempPassword && (
        <div className="mt-5 card border-l-4 border-brand-green p-5 bg-green-50/60">
          <div className="font-bold text-brand-navy">Approved — temporary password issued</div>
          <p className="text-sm text-slate-700 mt-1">
            Share this with the microlender so they can sign in and change it. It will not be shown again.
          </p>
          <div className="mt-2 font-mono text-base bg-white border border-slate-200 rounded px-3 py-2 inline-block">
            {tempPassword}
          </div>
        </div>
      )}

      {err && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        <div className="card p-6 lg:col-span-2">
          <div className="font-bold text-brand-navy">Business details</div>
          <div className="grid sm:grid-cols-2 gap-5 mt-4">
            <Row label="NAMFISA Reg No" value={app.namfisa_reg_no} />
            <Row label="Business type"   value={app.business_type} />
            <Row label="City"            value={app.city} />
            <Row label="Country"         value={app.country} />
            <Row label="Business number" value={app.business_phone} />
            <Row label="Business email"  value={app.business_email} />
            <Row label="Selected plan"
                 value={app.preferred_tier ? TIER_LABEL[app.preferred_tier] ?? app.preferred_tier : null} />
            <div className="sm:col-span-2">
              <Row label="Physical address" value={app.physical_address} />
            </div>
          </div>

          <div className="font-bold text-brand-navy mt-8">Principal officer</div>
          <div className="grid sm:grid-cols-2 gap-5 mt-4">
            <Row label="Name"      value={app.principal_officer_name} />
            <Row label="ID number" value={app.principal_officer_id_number} />
            <Row label="Phone"     value={app.principal_officer_phone} />
            <Row label="Email"     value={app.principal_officer_email} />
          </div>

          <div className="font-bold text-brand-navy mt-8">Referral</div>
          <div className="grid sm:grid-cols-2 gap-5 mt-4">
            <Row label="Code provided"
                 value={app.referral_code_used ? <span className="font-mono">{app.referral_code_used}</span> : null} />
            <Row label="Resolved agent"
                 value={app.referred_by_agent_id ? <span className="font-mono text-xs">{app.referred_by_agent_id}</span> : 'Not resolved'} />
          </div>

          {(app.rejection_reason || app.review_notes) && (
            <>
              <div className="font-bold text-brand-navy mt-8">Review notes</div>
              <div className="mt-3 space-y-3">
                {app.rejection_reason && (
                  <div className="text-sm bg-red-50 border border-red-200 rounded p-3">
                    <div className="font-semibold text-red-700">Rejection reason</div>
                    <div className="text-slate-700">{app.rejection_reason}</div>
                  </div>
                )}
                {app.review_notes && (
                  <div className="text-sm bg-green-50 border border-green-200 rounded p-3">
                    <div className="font-semibold text-green-700">Notes</div>
                    <div className="text-slate-700">{app.review_notes}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="card p-6">
          <div className="font-bold text-brand-navy">Documents ({docs.length})</div>
          <ul className="mt-3 space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 last:border-b-0">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    {docLabel[d.document_type] ?? d.document_type}
                  </div>
                  <div className="text-sm text-brand-navy">{d.file_name}</div>
                  <div className="text-xs text-slate-500">
                    {d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : ''}
                  </div>
                </div>
                <button
                  onClick={() => downloadDoc(d)}
                  className="text-xs font-semibold text-brand-green-dark hover:underline whitespace-nowrap"
                >
                  Download
                </button>
              </li>
            ))}
            {docs.length === 0 && <li className="text-sm text-slate-500">No documents uploaded.</li>}
          </ul>
        </div>
      </div>

      {showApprove && (
        <Modal onClose={() => setShowApprove(false)} title="Approve application">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Approving creates an active microlender account from the application's business email. A temporary
              password will be shown once and must be shared with the applicant securely.
            </p>
            <div>
              <label className="field-label">Starting tier</label>
              <select className="field-input" value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}>
                <option value="tier1">Tier 1 — Starter (1–500 clients)</option>
                <option value="tier2">Tier 2 — Growth (501–2,500)</option>
                <option value="tier3">Tier 3 — Professional (2,501–10,000)</option>
                <option value="tier4">Tier 4 — Enterprise (10,001+)</option>
              </select>
            </div>
            <div>
              <label className="field-label">Internal notes</label>
              <textarea className="field-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setShowApprove(false)} disabled={busy}>Cancel</button>
              <button className="btn-primary" disabled={busy} onClick={doApprove}>
                {busy ? 'Approving…' : 'Approve & create account'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showReject && (
        <Modal onClose={() => setShowReject(false)} title="Reject application">
          <div className="space-y-4">
            <div>
              <label className="field-label">Reason (shared with applicant)</label>
              <textarea
                className="field-input"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly explain why the application is being rejected."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setShowReject(false)} disabled={busy}>Cancel</button>
              <button
                className="btn-dark bg-red-600 hover:bg-red-700"
                disabled={busy || reason.trim().length < 3}
                onClick={doReject}
              >
                {busy ? 'Rejecting…' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Messages thread */}
      <div className="card mt-8 p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="font-bold text-brand-navy">Communication with applicant</div>
            <div className="text-xs text-slate-500 mt-0.5">Notes and emails sent to {app.business_email}{app.principal_officer_email !== app.business_email ? ` and ${app.principal_officer_email}` : ''}.</div>
          </div>
          <div className="text-xs text-slate-500">{messages.length} {messages.length === 1 ? 'entry' : 'entries'}</div>
        </div>

        <ul className="mt-5 space-y-3">
          {messages.length === 0 && (
            <li className="text-sm text-slate-500 italic">No messages yet.</li>
          )}
          {messages.map((m) => (
            <li key={m.id} className="border-l-4 border-brand-green pl-4 py-2 bg-slate-50 rounded-r">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-brand-navy">{m.author_name ?? 'NCLMS'}</span>
                  &nbsp;·&nbsp; {new Date(m.created_at).toLocaleString()}
                  {m.email_sent && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-brand-green-dark font-semibold">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 6l8 7 8-7M4 6v12h16V6" />
                      </svg>
                      Emailed
                    </span>
                  )}
                </div>
              </div>
              {m.subject && <div className="font-semibold text-brand-navy text-sm mt-1">{m.subject}</div>}
              <div className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{m.body}</div>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="font-semibold text-brand-navy mb-3">Send a note</div>
          <div className="space-y-3">
            <input
              type="text"
              className="field-input"
              placeholder="Subject (optional, used as email subject)"
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
            />
            <textarea
              className="field-input"
              rows={4}
              placeholder="Write your message to the applicant. They'll receive this by email (if enabled), and it'll be saved here as part of the application's audit trail."
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={msgSendEmail} onChange={(e) => setMsgSendEmail(e.target.checked)} />
                Send by email
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={msgIsInfoRequest} onChange={(e) => setMsgIsInfoRequest(e.target.checked)} />
                Mark as "more information required"
              </label>
            </div>
            {msgErr && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{msgErr}</div>}
            <div className="flex justify-end">
              <button
                className="btn-primary"
                disabled={msgBusy || msgBody.trim().length === 0}
                onClick={sendMessage}
              >
                {msgBusy ? 'Sending…' : msgIsInfoRequest ? 'Send & request info' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Link to="/admin/applications" className="mt-10 inline-block text-sm text-slate-500 hover:text-brand-navy">
        ← All applications
      </Link>
    </div>
  );
};

const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-brand-navy text-lg">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
      </div>
      {children}
    </div>
  </div>
);
