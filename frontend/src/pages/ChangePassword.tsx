import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { TextField } from '../components/Field';
import { changePassword } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import type { ApiError } from '../api/client';
import type { Role } from '../api/types';

const HOMES: Record<Role, string> = {
  admin: '/admin',
  marketing_agent: '/agent',
  microlender: '/portal',
};

export const ChangePassword = () => {
  const { user, refresh, logout } = useAuth();
  const nav = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (next.length < 8) { setErr('New password must be at least 8 characters.'); return; }
    if (next !== confirm) { setErr('New password and confirmation don\'t match.'); return; }
    setBusy(true);
    try {
      await changePassword(current, next);
      await refresh();
      nav(user ? HOMES[user.role] : '/login', { replace: true });
    } catch (e2) {
      setErr((e2 as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const doLogout = () => { logout(); nav('/login'); };

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      <header className="bg-brand-navy text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo variant="light" className="h-10 w-auto" />
          <button onClick={doLogout} className="text-sm font-semibold text-brand-amber hover:underline">Sign out</button>
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center">
        <div className="w-full max-w-md px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-xs uppercase tracking-wider text-brand-green-dark font-semibold">First-time sign-in</div>
          <h1 className="text-3xl font-extrabold text-brand-navy mt-1">Set your password</h1>
          <p className="text-slate-600 mt-2 text-sm">
            For security, please replace your temporary password with one only you know. Min 8 characters.
          </p>

          <form className="card p-6 mt-6 space-y-5" onSubmit={submit}>
            <TextField label="Current (temporary) password" type="password" required autoFocus
              value={current} onChange={(e) => setCurrent(e.target.value)} name="current" />
            <TextField label="New password" type="password" required
              value={next} onChange={(e) => setNext(e.target.value)} name="next" />
            <TextField label="Confirm new password" type="password" required
              value={confirm} onChange={(e) => setConfirm(e.target.value)} name="confirm" />
            {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Updating…' : 'Set new password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
