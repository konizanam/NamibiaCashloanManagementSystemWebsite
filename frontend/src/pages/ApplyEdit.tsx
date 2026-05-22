import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TextField, TextAreaField, SelectField } from '../components/Field';
import { FileDrop } from '../components/FileDrop';
import { CityAutocomplete } from '../components/CityAutocomplete';
import { TierPicker } from '../components/TierPicker';
import { loadResubmit, postResubmit, type LoadResubmitResponse } from '../api/resubmit';
import type { ApiError } from '../api/client';
import type { Application, Tier } from '../api/types';

const DOC_LABEL: Record<string, string> = {
  founding_statement:      'Founding statement',
  namfisa_certificate:     'NAMFISA certificate',
  namfisa_approval_letter: 'NAMFISA approval letter',
  principal_officer_id:    'Principal officer ID',
  business_registration:   'Business registration',
  member_id:               'Member / director ID',
  other:                   'Other document',
};

type FormState = Partial<Application> & { preferred_tier: Tier | null };

interface FileState {
  founding_statement: File[];
  namfisa_certificate: File[];
  namfisa_approval_letter: File[];
  principal_officer_id: File[];
  business_registration: File[];
}

const initialFiles: FileState = {
  founding_statement: [],
  namfisa_certificate: [],
  namfisa_approval_letter: [],
  principal_officer_id: [],
  business_registration: [],
};

export const ApplyEdit = () => {
  const { token } = useParams<{ token: string }>();
  const nav = useNavigate();

  const [data, setData] = useState<LoadResubmitResponse | null>(null);
  const [form, setForm] = useState<FormState>({ preferred_tier: null });
  const [files, setFiles] = useState<FileState>(initialFiles);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadResubmit(token)
      .then((r) => {
        setData(r);
        setForm({
          business_name: r.application.business_name,
          namfisa_reg_no: r.application.namfisa_reg_no ?? '',
          business_type: r.application.business_type ?? '',
          physical_address: r.application.physical_address ?? '',
          city: r.application.city ?? '',
          country: r.application.country,
          business_phone: r.application.business_phone ?? '',
          business_email: r.application.business_email,
          principal_officer_name: r.application.principal_officer_name,
          principal_officer_id_number: r.application.principal_officer_id_number,
          principal_officer_phone: r.application.principal_officer_phone,
          principal_officer_email: r.application.principal_officer_email,
          preferred_tier: (r.application.preferred_tier ?? null) as Tier | null,
        });
      })
      .catch((e) => setLoadErr((e as ApiError).message))
      .finally(() => setLoading(false));
  }, [token]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!token) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const fd = new FormData();
      // Always send the editable text fields (server treats missing as "no change").
      const send = (k: string, v: unknown) => {
        if (v === undefined || v === null) return;
        const s = String(v).trim();
        if (s.length === 0) return;
        fd.append(k, s);
      };
      send('business_name', form.business_name);
      send('namfisa_reg_no', form.namfisa_reg_no);
      send('business_type', form.business_type);
      send('physical_address', form.physical_address);
      send('city', form.city);
      send('country', form.country);
      send('business_phone', form.business_phone);
      send('business_email', form.business_email);
      send('principal_officer_name', form.principal_officer_name);
      send('principal_officer_id_number', form.principal_officer_id_number);
      send('principal_officer_phone', form.principal_officer_phone);
      send('principal_officer_email', form.principal_officer_email);
      if (form.preferred_tier) fd.append('preferred_tier', form.preferred_tier);

      if (files.founding_statement[0])      fd.append('founding_statement',      files.founding_statement[0]);
      if (files.namfisa_certificate[0])     fd.append('namfisa_certificate',     files.namfisa_certificate[0]);
      if (files.namfisa_approval_letter[0]) fd.append('namfisa_approval_letter', files.namfisa_approval_letter[0]);
      if (files.principal_officer_id[0])    fd.append('principal_officer_id',    files.principal_officer_id[0]);
      files.business_registration.forEach((f) => fd.append('business_registration', f));

      await postResubmit(token, fd);
      setDone(true);
      setTimeout(() => nav('/apply/success', { state: { id: data?.application.id } }), 1500);
    } catch (e) {
      setSubmitErr((e as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto p-10 text-slate-500 text-sm">Loading your application…</div>;

  if (loadErr) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold text-brand-navy">Can't open this link</h1>
        <p className="text-slate-600 mt-2">{loadErr}</p>
        <p className="text-sm text-slate-500 mt-2">
          Resubmit links are valid for 3 days and only work while an application is awaiting more information. If yours has expired or already been resubmitted, reply to the last email from us and we'll issue a new one.
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-brand-green-dark font-semibold uppercase tracking-wider text-xs">Update your application</div>
      <h1 className="text-3xl md:text-4xl font-extrabold text-brand-navy mt-1">{data.application.business_name}</h1>
      <p className="text-slate-600 mt-2">
        Make the changes our team has asked for and submit again. Your details are pre-filled — edit only what needs to change. Any new documents you attach are <strong>added</strong> to the file set (they don't replace what we already have).
      </p>

      {data.recent_messages.length > 0 && (
        <div className="card p-5 mt-6 border-l-4 border-brand-amber bg-amber-50/40">
          <div className="font-bold text-brand-navy">Notes from our team</div>
          <ul className="mt-2 space-y-3">
            {data.recent_messages.map((m) => (
              <li key={m.id} className="text-sm">
                {m.subject && <div className="font-semibold text-brand-navy">{m.subject}</div>}
                <div className="text-slate-700 whitespace-pre-wrap">{m.body}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {m.author_name ?? 'NCLMS'} · {new Date(m.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="card p-6 md:p-8 mt-6 space-y-5">
        <div className="text-sm font-bold text-brand-navy">Business details</div>
        <div className="grid md:grid-cols-2 gap-5">
          <TextField label="Business name" value={form.business_name ?? ''}
            onChange={(e) => setField('business_name', e.target.value)} name="business_name" />
          <TextField label="NAMFISA Reg No" value={form.namfisa_reg_no ?? ''}
            onChange={(e) => setField('namfisa_reg_no', e.target.value)} name="namfisa_reg_no" />
          <SelectField label="Business type" value={form.business_type ?? ''}
            onChange={(e) => setField('business_type', e.target.value)} name="business_type"
            options={[
              { value: '', label: 'Select…' },
              { value: 'Sole Proprietor', label: 'Sole Proprietor' },
              { value: 'Close Corporation', label: 'Close Corporation (CC)' },
              { value: 'Private Company', label: 'Private Company (Pty) Ltd' },
              { value: 'Partnership', label: 'Partnership' },
              { value: 'Other', label: 'Other' },
            ]} />
          <CityAutocomplete value={form.city ?? ''} onChange={(v) => setField('city', v)} />
          <div className="md:col-span-2">
            <TextAreaField label="Physical address" value={form.physical_address ?? ''}
              onChange={(e) => setField('physical_address', e.target.value)} name="physical_address" />
          </div>
          <TextField label="Country" value={form.country ?? 'Namibia'}
            onChange={(e) => setField('country', e.target.value)} name="country" />
          <TextField label="Business Number" value={form.business_phone ?? ''}
            onChange={(e) => setField('business_phone', e.target.value)} name="business_phone" />
          <div className="md:col-span-2">
            <TextField label="Business email" type="email" value={form.business_email ?? ''}
              onChange={(e) => setField('business_email', e.target.value)} name="business_email" />
          </div>
        </div>
      </section>

      <section className="card p-6 md:p-8 mt-6 space-y-5">
        <div className="text-sm font-bold text-brand-navy">Principal officer</div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <TextField label="Full name" value={form.principal_officer_name ?? ''}
              onChange={(e) => setField('principal_officer_name', e.target.value)} name="principal_officer_name" />
          </div>
          <TextField label="ID number" value={form.principal_officer_id_number ?? ''}
            onChange={(e) => setField('principal_officer_id_number', e.target.value)} name="principal_officer_id_number" />
          <TextField label="Phone" value={form.principal_officer_phone ?? ''}
            onChange={(e) => setField('principal_officer_phone', e.target.value)} name="principal_officer_phone" />
          <div className="md:col-span-2">
            <TextField label="Email" type="email" value={form.principal_officer_email ?? ''}
              onChange={(e) => setField('principal_officer_email', e.target.value)} name="principal_officer_email" />
          </div>
        </div>
      </section>

      <section className="card p-6 md:p-8 mt-6">
        <div className="text-sm font-bold text-brand-navy">Plan</div>
        <div className="mt-3">
          <TierPicker value={form.preferred_tier} onChange={(t) => setField('preferred_tier', t)} />
        </div>
      </section>

      <section className="card p-6 md:p-8 mt-6 space-y-5">
        <div className="text-sm font-bold text-brand-navy">Documents</div>
        {data.documents.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">On file</div>
            <ul className="text-sm space-y-1">
              {data.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded">
                  <span>{DOC_LABEL[d.document_type] ?? d.document_type}: {d.file_name}</span>
                  <span className="text-xs text-slate-500">{d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="text-xs text-slate-500">
          Only attach files you want to add. Anything you don't upload below stays as-is.
        </div>

        <FileDrop label="New founding statement (optional)"
          files={files.founding_statement}
          onFiles={(f) => setFiles((s) => ({ ...s, founding_statement: f }))} />
        <FileDrop label="New NAMFISA certificate (optional)"
          files={files.namfisa_certificate}
          onFiles={(f) => setFiles((s) => ({ ...s, namfisa_certificate: f }))} />
        <FileDrop label="New NAMFISA approval letter (optional)"
          files={files.namfisa_approval_letter}
          onFiles={(f) => setFiles((s) => ({ ...s, namfisa_approval_letter: f }))} />
        <FileDrop label="New principal officer ID (optional)"
          files={files.principal_officer_id}
          onFiles={(f) => setFiles((s) => ({ ...s, principal_officer_id: f }))} />
        <FileDrop label="Additional business registration documents" multiple
          files={files.business_registration}
          onFiles={(f) => setFiles((s) => ({ ...s, business_registration: f }))} />
      </section>

      {submitErr && (
        <div className="mt-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{submitErr}</div>
      )}
      {done && (
        <div className="mt-5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          Resubmitted. Redirecting…
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button className="btn-primary" disabled={submitting || done} onClick={submit}>
          {submitting ? 'Submitting…' : 'Resubmit Application'}
        </button>
      </div>
    </div>
  );
};
