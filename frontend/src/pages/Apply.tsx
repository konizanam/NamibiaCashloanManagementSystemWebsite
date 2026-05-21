import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, TextAreaField, SelectField } from '../components/Field';
import { FileDrop } from '../components/FileDrop';
import { submitApplication, validateReferral } from '../api/applications';
import type { ApiError } from '../api/client';

interface FormState {
  business_name: string;
  registration_number: string;
  business_type: string;
  physical_address: string;
  city: string;
  country: string;
  business_phone: string;
  business_email: string;
  principal_officer_name: string;
  principal_officer_id_number: string;
  principal_officer_phone: string;
  principal_officer_email: string;
  referral_code: string;
}

const initialForm: FormState = {
  business_name: '',
  registration_number: '',
  business_type: '',
  physical_address: '',
  city: '',
  country: 'Namibia',
  business_phone: '',
  business_email: '',
  principal_officer_name: '',
  principal_officer_id_number: '',
  principal_officer_phone: '',
  principal_officer_email: '',
  referral_code: '',
};

interface FileState {
  founding_statement: File[];
  namfisa_certificate: File[];
  namfisa_approval_letter: File[];
  principal_officer_id: File[];
  member_ids: File[];
}

const initialFiles: FileState = {
  founding_statement: [],
  namfisa_certificate: [],
  namfisa_approval_letter: [],
  principal_officer_id: [],
  member_ids: [],
};

export const Apply = () => {
  const nav = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [files, setFiles] = useState<FileState>(initialFiles);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referralCheck, setReferralCheck] = useState<{ valid: boolean; agentName?: string } | null>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    const code = form.referral_code.trim();
    if (!code) {
      setReferralCheck(null);
      return;
    }
    const t = setTimeout(() => {
      validateReferral(code)
        .then(setReferralCheck)
        .catch(() => setReferralCheck({ valid: false }));
    }, 400);
    return () => clearTimeout(t);
  }, [form.referral_code]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
      if (files.founding_statement[0])         fd.append('founding_statement', files.founding_statement[0]);
      if (files.namfisa_certificate[0])         fd.append('namfisa_certificate', files.namfisa_certificate[0]);
      if (files.namfisa_approval_letter[0])     fd.append('namfisa_approval_letter', files.namfisa_approval_letter[0]);
      if (files.principal_officer_id[0])        fd.append('principal_officer_id', files.principal_officer_id[0]);
      files.member_ids.forEach((f) => fd.append('member_ids', f));

      const res = await submitApplication(fd);
      nav('/apply/success', { state: { id: res.id } });
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  };

  const canStep1 =
    form.business_name && form.business_email && form.country &&
    form.business_email.includes('@');
  const canStep2 =
    form.principal_officer_name &&
    form.principal_officer_id_number &&
    form.principal_officer_phone &&
    form.principal_officer_email.includes('@');
  const hasNamfisa = files.namfisa_certificate.length > 0 || files.namfisa_approval_letter.length > 0;
  const canSubmit =
    files.founding_statement.length > 0 &&
    files.principal_officer_id.length > 0 &&
    hasNamfisa;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-brand-green-dark font-semibold uppercase tracking-wider text-xs">Apply Online</div>
      <h1 className="text-3xl md:text-4xl font-extrabold text-brand-navy mt-1">Onboard your microlending business.</h1>
      <p className="text-slate-600 mt-2">
        Submit your details and required documents. Our team reviews each application and responds by email.
      </p>

      <ol className="flex items-center gap-2 sm:gap-3 mt-8 mb-6 text-xs font-semibold">
        {[1, 2, 3].map((n) => (
          <li key={n} className="flex items-center gap-2 sm:gap-3">
            <span
              className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${
                step === n
                  ? 'bg-brand-green text-white'
                  : step > n
                  ? 'bg-brand-green-dark text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {n}
            </span>
            <span className={`hidden sm:inline ${step === n ? 'text-brand-navy' : 'text-slate-500'}`}>
              {n === 1 ? 'Business' : n === 2 ? 'Principal Officer' : 'Documents'}
            </span>
            <span className={`sm:hidden ${step === n ? 'text-brand-navy' : 'text-slate-500'}`}>
              {n === 1 ? 'Business' : n === 2 ? 'Officer' : 'Docs'}
            </span>
            {n < 3 && <span className="w-4 sm:w-8 h-px bg-slate-300" />}
          </li>
        ))}
      </ol>

      <div className="card p-6 md:p-8">
        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-5">
            <TextField label="Business name" required value={form.business_name}
              onChange={(e) => setField('business_name', e.target.value)} name="business_name" />
            <TextField label="Registration number" value={form.registration_number}
              onChange={(e) => setField('registration_number', e.target.value)} name="registration_number" />
            <SelectField label="Business type" value={form.business_type}
              onChange={(e) => setField('business_type', e.target.value)} name="business_type"
              options={[
                { value: '', label: 'Select…' },
                { value: 'Sole Proprietor', label: 'Sole Proprietor' },
                { value: 'Close Corporation', label: 'Close Corporation (CC)' },
                { value: 'Private Company', label: 'Private Company (Pty) Ltd' },
                { value: 'Partnership', label: 'Partnership' },
                { value: 'Other', label: 'Other' },
              ]} />
            <TextField label="City" value={form.city}
              onChange={(e) => setField('city', e.target.value)} name="city" />
            <div className="md:col-span-2">
              <TextAreaField label="Physical address" value={form.physical_address}
                onChange={(e) => setField('physical_address', e.target.value)} name="physical_address" />
            </div>
            <TextField label="Country" required value={form.country}
              onChange={(e) => setField('country', e.target.value)} name="country" />
            <TextField label="Business phone" value={form.business_phone}
              onChange={(e) => setField('business_phone', e.target.value)} name="business_phone" />
            <div className="md:col-span-2">
              <TextField label="Business email" required type="email" value={form.business_email}
                onChange={(e) => setField('business_email', e.target.value)}
                help="Used as the login email once approved." name="business_email" />
            </div>
            <div className="md:col-span-2">
              <TextField label="Marketing agent referral code" value={form.referral_code}
                onChange={(e) => setField('referral_code', e.target.value.toUpperCase())}
                help={
                  form.referral_code && referralCheck
                    ? referralCheck.valid
                      ? `Verified — referred by ${referralCheck.agentName}.`
                      : 'Referral code not recognised. You can still submit without one.'
                    : 'Optional — enter the code from your Koniza marketing agent.'
                }
                name="referral_code"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button className="btn-primary" disabled={!canStep1} onClick={() => setStep(2)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <TextField label="Principal officer full name" required value={form.principal_officer_name}
                onChange={(e) => setField('principal_officer_name', e.target.value)}
                name="principal_officer_name" />
            </div>
            <TextField label="ID number" required value={form.principal_officer_id_number}
              onChange={(e) => setField('principal_officer_id_number', e.target.value)}
              name="principal_officer_id_number" />
            <TextField label="Phone" required value={form.principal_officer_phone}
              onChange={(e) => setField('principal_officer_phone', e.target.value)}
              name="principal_officer_phone" />
            <div className="md:col-span-2">
              <TextField label="Email" required type="email" value={form.principal_officer_email}
                onChange={(e) => setField('principal_officer_email', e.target.value)}
                name="principal_officer_email" />
            </div>
            <div className="md:col-span-2 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary" disabled={!canStep2} onClick={() => setStep(3)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <FileDrop label="Founding statement" required
              files={files.founding_statement}
              onFiles={(f) => setFiles((s) => ({ ...s, founding_statement: f }))} />
            <FileDrop label="NAMFISA certificate"
              help="Upload your NAMFISA certificate, OR the approval letter below."
              files={files.namfisa_certificate}
              onFiles={(f) => setFiles((s) => ({ ...s, namfisa_certificate: f }))} />
            <FileDrop label="NAMFISA approval letter"
              help="If you don't yet have a certificate, upload the approval letter."
              files={files.namfisa_approval_letter}
              onFiles={(f) => setFiles((s) => ({ ...s, namfisa_approval_letter: f }))} />
            <FileDrop label="Principal officer ID" required
              files={files.principal_officer_id}
              onFiles={(f) => setFiles((s) => ({ ...s, principal_officer_id: f }))} />
            <FileDrop label="Member / director IDs" multiple
              help="Upload IDs for additional members or directors (optional)."
              files={files.member_ids}
              onFiles={(f) => setFiles((s) => ({ ...s, member_ids: f }))} />

            {!hasNamfisa && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Please provide either a NAMFISA certificate or an approval letter.
              </div>
            )}
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
            )}

            <div className="flex justify-between">
              <button className="btn-outline" onClick={() => setStep(2)} disabled={submitting}>← Back</button>
              <button className="btn-primary" disabled={!canSubmit || submitting} onClick={submit}>
                {submitting ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
