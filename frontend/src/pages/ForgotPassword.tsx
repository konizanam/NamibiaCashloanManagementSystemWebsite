import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import { TextField } from '../components/Field';
import type { ApiError } from '../api/client';

const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const head = name.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
};

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (e2) {
      setErr((e2 as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      <h1 className="text-3xl font-extrabold text-brand-navy">Forgot your password?</h1>
      <p className="text-slate-600 mt-2 text-sm">
        Enter the email you sign in with. If we recognise it, we'll send you a link to set a new password.
      </p>

      {sent ? (
        <div className="card p-7 mt-8">
          <div className="font-bold text-brand-navy">Check your inbox</div>
          <p className="text-sm text-slate-600 mt-2">
            If <strong>{maskEmail(email)}</strong> matches an NCLMS account, you'll receive a reset email within a minute. The link is good for one hour.
          </p>
          <div className="mt-4 text-sm">
            <Link to="/login" className="text-brand-green-dark font-semibold hover:underline">← Back to sign in</Link>
          </div>
        </div>
      ) : (
        <form className="card p-7 mt-8 space-y-5" onSubmit={submit}>
          <TextField label="Email" type="email" required autoFocus value={email}
            onChange={(e) => setEmail(e.target.value)} name="email" />
          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <div className="text-sm text-center">
            <Link to="/login" className="text-brand-green-dark font-semibold hover:underline">← Back to sign in</Link>
          </div>
        </form>
      )}
    </div>
  );
};
