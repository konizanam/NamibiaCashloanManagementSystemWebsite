import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, TextAreaField, SelectField } from '../components/Field';
import { FileDrop } from '../components/FileDrop';
import { CityAutocomplete } from '../components/CityAutocomplete';
import { TierPicker } from '../components/TierPicker';
import { submitApplication, validateReferral } from '../api/applications';
import type { ApiError } from '../api/client';
import type { Tier } from '../api/types';

interface FormState {
  business_name: string;
  namfisa_reg_no: string;
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
  preferred_tier: Tier | null;
  referral_code: string;
}

const initialForm: FormState = {
  business_name: '',
  namfisa_reg_no: '',
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
  preferred_tier: null,
  referral_code: '',
};

interface FileState {
  founding_statement: File[];
  namfisa_document: File[];        // one combined file for cert OR approval letter
  namfisa_kind: 'certificate' | 'approval_letter';
  principal_officer_id: File[];
  business_registration: File[];
}

const initialFiles: FileState = {
  founding_statement: [],
  namfisa_document: [],
  namfisa_kind: 'certificate',
  principal_officer_id: [],
  business_registration: [],
};

const STEPS = ['Business', 'Officer', 'Plan', 'Documents'] as const;

export const Apply = () => {
  const nav = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [files, setFiles] = useState<FileState>(initialFiles);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
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
      if (!form.preferred_tier) throw new Error('Please select a plan.');
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
      });

      if (files.founding_statement[0])    fd.append('founding_statement',    files.founding_statement[0]);
      if (files.principal_officer_id[0])  fd.append('principal_officer_id',  files.principal_officer_id[0]);
      if (files.namfisa_document[0]) {
        const field = files.namfisa_kind === 'certificate' ? 'namfisa_certificate' : 'namfisa_approval_letter';
        fd.append(field, files.namfisa_document[0]);
      }
      files.business_registration.forEach((f) => fd.append('business_registration', f));

      const res = await submitApplication(fd);
      nav('/apply/success', { state: { id: res.id } });
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  };

  const canStep1 =
    form.business_name.trim() &&
    form.namfisa_reg_no.trim() &&
    form.city.trim() &&
    form.country.trim() &&
    form.business_phone.trim() &&
    form.business_email.includes('@');

  const canStep2 =
    form.principal_officer_name.trim() &&
    form.principal_officer_id_number.trim() &&
    form.principal_officer_phone.trim() &&
    form.principal_officer_email.includes('@');

  const canStep3 = !!form.preferred_tier;

  const canSubmit =
    files.founding_statement.length > 0 &&
    files.namfisa_document.length > 0 &&
    files.principal_officer_id.length > 0 &&
    files.business_registration.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-brand-green-dark font-semibold uppercase tracking-wider text-xs">Apply Online</div>
      <h1 className="text-3xl md:text-4xl font-extrabold text-brand-navy mt-1">Onboard your microlending business.</h1>
      <p className="text-slate-600 mt-2">
        Submit your details, choose a plan, and upload your supporting documents. Our team reviews each application and responds by email.
      </p>

      <ol className="flex items-center gap-2 sm:gap-3 mt-8 mb-6 text-xs font-semibold overflow-x-auto pb-1">
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4;
          return (
            <li key={label} className="flex items-center gap-2 sm:gap-3 shrink-0">
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
              <span className={`${step === n ? 'text-brand-navy' : 'text-slate-500'}`}>{label}</span>
              {n < 4 && <span className="w-4 sm:w-8 h-px bg-slate-300" />}
            </li>
          );
        })}
      </ol>

      <div className="card p-6 md:p-8">
        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-5">
            <TextField label="Business name" required value={form.business_name}
              onChange={(e) => setField('business_name', e.target.value)} name="business_name" />

            <TextField label="NAMFISA Reg No" required value={form.namfisa_reg_no}
              onChange={(e) => setField('namfisa_reg_no', e.target.value)} name="namfisa_reg_no"
              help="Your registration number issued by NAMFISA." />

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

            <CityAutocomplete required value={form.city} onChange={(v) => setField('city', v)} />

            <div className="md:col-span-2">
              <TextAreaField label="Physical address" value={form.physical_address}
                onChange={(e) => setField('physical_address', e.target.value)} name="physical_address" />
            </div>

            <TextField label="Country" required value={form.country}
              onChange={(e) => setField('country', e.target.value)} name="country" />

            <TextField label="Business Number" required value={form.business_phone}
              onChange={(e) => setField('business_phone', e.target.value)} name="business_phone"
              help="Primary business contact number." />

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
          <div>
            <div className="text-brand-green-dark font-semibold uppercase tracking-wider text-xs">Choose your plan</div>
            <h2 className="text-2xl font-extrabold text-brand-navy mt-1 mb-4">Which package fits your business?</h2>
            <TierPicker value={form.preferred_tier} onChange={(t) => setField('preferred_tier', t)} />
            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(2)}>← Back</button>
              <button className="btn-primary" disabled={!canStep3} onClick={() => setStep(4)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <FileDrop label="Founding statement" required
              files={files.founding_statement}
              onFiles={(f) => setFiles((s) => ({ ...s, founding_statement: f }))} />

            <div>
              <div className="field-label">NAMFISA approval letter or certificate <span className="text-red-500">*</span></div>
              <div className="flex gap-3 mb-2 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="namfisa_kind" checked={files.namfisa_kind === 'certificate'}
                    onChange={() => setFiles((s) => ({ ...s, namfisa_kind: 'certificate' }))} />
                  Certificate
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="namfisa_kind" checked={files.namfisa_kind === 'approval_letter'}
                    onChange={() => setFiles((s) => ({ ...s, namfisa_kind: 'approval_letter' }))} />
                  Approval letter
                </label>
              </div>
              <FileDrop label=""
                help="Upload your NAMFISA certificate OR your approval letter — either one is fine."
                files={files.namfisa_document}
                onFiles={(f) => setFiles((s) => ({ ...s, namfisa_document: f }))} />
            </div>

            <FileDrop label="Principal officer ID" required
              files={files.principal_officer_id}
              onFiles={(f) => setFiles((s) => ({ ...s, principal_officer_id: f }))} />

            <FileDrop label="Business Registration Documents (Close Corp or Company)" required multiple
              help="Upload your CC1 / founding statement / CoR forms or company registration documents."
              files={files.business_registration}
              onFiles={(f) => setFiles((s) => ({ ...s, business_registration: f }))} />

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
            )}

            <div className="flex justify-between">
              <button className="btn-outline" onClick={() => setStep(3)} disabled={submitting}>← Back</button>
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
