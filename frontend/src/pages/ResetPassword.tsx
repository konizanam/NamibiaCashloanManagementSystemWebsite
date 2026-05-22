import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import { TextField } from '../components/Field';
import type { ApiError } from '../api/client';

export const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const nav = useNavigate();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!token) { setErr('Reset link is invalid.'); return; }
    if (next.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (next !== confirm) { setErr('Passwords don\'t match.'); return; }
    setBusy(true);
    try {
      await resetPassword(token, next);
      setDone(true);
      setTimeout(() => nav('/login', { replace: true }), 2500);
    } catch (e2) {
      setErr((e2 as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      <h1 className="text-3xl font-extrabold text-brand-navy">Set a new password</h1>
      <p className="text-slate-600 mt-2 text-sm">
        Choose a strong password. Min 8 characters. You'll be able to sign in straight away.
      </p>

      {done ? (
        <div className="card p-7 mt-8">
          <div className="font-bold text-brand-navy">Password updated</div>
          <p className="text-sm text-slate-600 mt-2">Redirecting you to sign in…</p>
        </div>
      ) : (
        <form className="card p-7 mt-8 space-y-5" onSubmit={submit}>
          <TextField label="New password" type="password" required autoFocus value={next}
            onChange={(e) => setNext(e.target.value)} name="next" />
          <TextField label="Confirm password" type="password" required value={confirm}
            onChange={(e) => setConfirm(e.target.value)} name="confirm" />
          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Updating…' : 'Set new password'}
          </button>
          <div className="text-sm text-center">
            <Link to="/login" className="text-brand-green-dark font-semibold hover:underline">← Back to sign in</Link>
          </div>
        </form>
      )}
    </div>
  );
};
