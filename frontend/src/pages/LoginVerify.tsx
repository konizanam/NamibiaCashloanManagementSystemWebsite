import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { resendTwoFactor, verifyTwoFactor } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { TextField } from '../components/Field';
import type { ApiError } from '../api/client';
import type { Role } from '../api/types';

const HOMES: Record<Role, string> = {
  admin: '/admin',
  marketing_agent: '/agent',
  microlender: '/portal',
};

interface State {
  challenge_token: string;
  email_masked: string;
}

export const LoginVerify = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, setSession } = useAuth();

  const state = loc.state as State | null;
  const challengeToken = state?.challenge_token ?? '';

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [maskedEmail, setMaskedEmail] = useState(state?.email_masked ?? '');

  const [justResent, setJustResent] = useState(false);
  useEffect(() => {
    if (!resentAt) return;
    setJustResent(true);
    const t = setTimeout(() => setJustResent(false), 3000);
    return () => clearTimeout(t);
  }, [resentAt]);

  if (user) return <Navigate to={HOMES[user.role]} replace />;
  if (!challengeToken) return <Navigate to="/login" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!/^\d{6}$/.test(code)) {
      setErr('Code must be 6 digits.');
      return;
    }
    setBusy(true);
    try {
      const result = await verifyTwoFactor(challengeToken, code);
      setSession(result.token, result.user);
      nav(HOMES[result.user.role], { replace: true });
    } catch (e2) {
      setErr((e2 as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setErr(null);
    try {
      const r = await resendTwoFactor(challengeToken);
      setMaskedEmail(r.email_masked);
      setResentAt(Date.now());
    } catch (e) {
      setErr((e as ApiError).message);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      <h1 className="text-3xl font-extrabold text-brand-navy">Two-factor verification</h1>
      <p className="text-slate-600 mt-2 text-sm">
        We sent a 6-digit code to <strong className="text-brand-navy">{maskedEmail}</strong>. Enter it below to finish signing in.
      </p>

      <form className="card p-7 mt-8 space-y-5" onSubmit={submit}>
        <TextField
          label="Verification code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          name="code"
          help="Codes expire in 10 minutes."
        />
        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}
        {justResent && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">New code sent.</div>}

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Verifying…' : 'Verify and sign in'}
        </button>

        <div className="text-sm text-center text-slate-600">
          Didn't get the code?{' '}
          <button type="button" onClick={resend} className="text-brand-green-dark font-semibold hover:underline">
            Resend
          </button>
          {' '}or{' '}
          <button type="button" onClick={() => nav('/login', { replace: true })} className="text-brand-green-dark font-semibold hover:underline">
            Start over
          </button>
        </div>
      </form>
    </div>
  );
};
