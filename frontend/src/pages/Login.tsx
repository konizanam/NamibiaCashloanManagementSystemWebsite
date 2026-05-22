import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TextField } from '../components/Field';
import type { ApiError } from '../api/client';
import type { Role } from '../api/types';

const HOMES: Record<Role, string> = {
  admin: '/admin',
  marketing_agent: '/agent',
  microlender: '/portal',
};

export const Login = () => {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (user) return <Navigate to={HOMES[user.role]} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const result = await login(email, password);
      if ('requires_2fa' in result) {
        nav('/login/verify', {
          replace: true,
          state: {
            challenge_token: result.challenge_token,
            email_masked: result.email_masked,
          },
        });
        return;
      }
      const from = (loc.state as { from?: string } | null)?.from;
      nav(from && from.startsWith(HOMES[result.role]) ? from : HOMES[result.role], { replace: true });
    } catch (e2) {
      setErr((e2 as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      <h1 className="text-3xl font-extrabold text-brand-navy">Sign in</h1>
      <p className="text-slate-600 mt-2 text-sm">
        Sign in with your NCLMS account. You'll be taken to the right place — admin, marketing agent, or microlender — based on your role.
      </p>

      <form className="card p-7 mt-8 space-y-5" onSubmit={submit}>
        <TextField label="Email" type="email" required autoFocus value={email}
          onChange={(e) => setEmail(e.target.value)} name="email" />
        <TextField label="Password" type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)} name="password" />
        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="text-sm text-center">
          <Link to="/forgot-password" className="text-brand-green-dark font-semibold hover:underline">
            Forgot your password?
          </Link>
        </div>
      </form>
    </div>
  );
};
