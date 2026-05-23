import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { TextField } from '../components/Field';
import { PasswordStrength, isPasswordValid } from '../components/PasswordStrength';
import { changePassword as changePasswordApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import type { ApiError } from '../api/client';
import type { Role } from '../api/types';

const HOMES: Record<Role, string> = {
  admin: '/admin',
  marketing_agent: '/agent',
  microlender: '/portal',
};

export const AccountSecurity = () => {
  const { user, refresh, logout } = useAuth();
  const nav = useNavigate();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);

  const doLogout = () => { logout(); nav('/login'); };

  const submitChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwErr(null); setPwOk(false);
    if (!isPasswordValid(next)) { setPwErr('Password does not meet the policy below.'); return; }
    if (next !== confirm) { setPwErr('Passwords don\'t match.'); return; }
    setPwBusy(true);
    try {
      await changePasswordApi(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      setPwOk(true);
      await refresh();
    } catch (e2) {
      setPwErr((e2 as ApiError).message);
    } finally {
      setPwBusy(false);
    }
  };

  const home = user ? HOMES[user.role] : '/login';

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      <header className="bg-brand-navy text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" aria-label="NCLMS home"><Logo variant="light" className="h-10 w-auto" /></Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to={home} className="text-white/90 hover:text-white">Back to dashboard</Link>
            <button onClick={doLogout} className="text-brand-amber font-semibold hover:underline">Sign out</button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-brand-green-dark font-semibold">Account</div>
            <h1 className="text-3xl font-extrabold text-brand-navy mt-1">Security</h1>
            <p className="text-slate-600 text-sm mt-2">
              Signed in as <strong className="text-brand-navy">{user?.email}</strong>.
            </p>
          </div>

          {/* 2FA info card — always on, no toggle. */}
          <section className="card p-6 border-l-4 border-brand-green bg-green-50/40">
            <div className="flex items-start gap-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15803d"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                   className="mt-0.5 shrink-0">
                <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <div>
                <div className="font-bold text-brand-navy">Two-factor authentication is on</div>
                <p className="text-sm text-slate-700 mt-1">
                  Each time you sign in we email a 6-digit code to{' '}
                  <strong className="text-brand-navy">{user?.email}</strong>. You'll need to enter that code
                  after your password to finish signing in. This protects your NCLMS account even if your
                  password leaks somewhere else.
                </p>
              </div>
            </div>
          </section>

          {/* Change password */}
          <section className="card p-6">
            <div className="font-bold text-brand-navy">Change password</div>
            <p className="text-sm text-slate-600 mt-1">Pick a strong password. The checklist below updates as you type.</p>
            <form className="mt-5 space-y-4" onSubmit={submitChangePassword}>
              <TextField label="Current password" type="password" required autoComplete="current-password"
                value={current} onChange={(e) => setCurrent(e.target.value)} name="current" />
              <div>
                <TextField label="New password" type="password" required autoComplete="new-password"
                  value={next} onChange={(e) => setNext(e.target.value)} name="next" />
                <PasswordStrength password={next} />
              </div>
              <TextField label="Confirm new password" type="password" required autoComplete="new-password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} name="confirm"
                error={confirm.length > 0 && confirm !== next ? 'Passwords don\'t match' : undefined} />
              {pwErr && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{pwErr}</div>}
              {pwOk && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">Password updated.</div>}
              <div className="flex justify-end">
                <button
                  className="btn-primary"
                  disabled={pwBusy || !isPasswordValid(next) || next !== confirm || current.length === 0}
                >
                  {pwBusy ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};
