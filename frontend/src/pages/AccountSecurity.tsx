import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { TextField } from '../components/Field';
import { PromptModal } from '../components/PromptModal';
import {
  changePassword as changePasswordApi,
  disableTwoFactor as disableTwoFactorApi,
  enableTwoFactor as enableTwoFactorApi,
} from '../api/auth';
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
  const [show2faModal, setShow2faModal] = useState<'enable' | 'disable' | null>(null);

  // Change password form state.
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
    if (next.length < 8) { setPwErr('New password must be at least 8 characters.'); return; }
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

  const submit2faToggle = async (password: string) => {
    if (show2faModal === 'enable') {
      await enableTwoFactorApi(password);
    } else if (show2faModal === 'disable') {
      await disableTwoFactorApi(password);
    }
    await refresh();
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
              Manage two-factor authentication and your password. Signed in as{' '}
              <strong className="text-brand-navy">{user?.email}</strong>.
            </p>
          </div>

          {/* 2FA card */}
          <section className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-bold text-brand-navy">Two-factor authentication</div>
                <p className="text-sm text-slate-600 mt-1 max-w-lg">
                  When enabled, you'll receive a 6-digit code by email each time you sign in. This protects your account if your password is ever exposed.
                </p>
                <div className="mt-3">
                  {user?.two_factor_enabled
                    ? <span className="badge-approved">Enabled</span>
                    : <span className="badge-pending">Disabled</span>}
                </div>
              </div>
              {user?.two_factor_enabled
                ? <button onClick={() => setShow2faModal('disable')} className="btn-outline border-red-300 text-red-700 hover:bg-red-50 shrink-0">Disable</button>
                : <button onClick={() => setShow2faModal('enable')} className="btn-primary shrink-0">Enable</button>
              }
            </div>
          </section>

          {/* Change password */}
          <section className="card p-6">
            <div className="font-bold text-brand-navy">Change password</div>
            <p className="text-sm text-slate-600 mt-1">Pick something at least 8 characters long. You'll stay signed in after the change.</p>
            <form className="mt-5 space-y-4" onSubmit={submitChangePassword}>
              <TextField label="Current password" type="password" required value={current}
                onChange={(e) => setCurrent(e.target.value)} name="current" />
              <TextField label="New password" type="password" required value={next}
                onChange={(e) => setNext(e.target.value)} name="next" />
              <TextField label="Confirm new password" type="password" required value={confirm}
                onChange={(e) => setConfirm(e.target.value)} name="confirm" />
              {pwErr && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{pwErr}</div>}
              {pwOk && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">Password updated.</div>}
              <div className="flex justify-end">
                <button className="btn-primary" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Update password'}</button>
              </div>
            </form>
          </section>
        </div>
      </main>

      <PromptModal
        open={show2faModal !== null}
        title={show2faModal === 'enable' ? 'Enable two-factor authentication' : 'Disable two-factor authentication'}
        description={
          show2faModal === 'enable'
            ? 'Confirm your current password. From your next sign-in we\'ll email you a 6-digit code to enter after your password.'
            : 'Confirm your current password to turn off 2FA. Your account will be less protected.'
        }
        label="Current password"
        placeholder="Your current password"
        required
        confirmLabel={show2faModal === 'enable' ? 'Enable 2FA' : 'Disable 2FA'}
        variant={show2faModal === 'disable' ? 'danger' : 'default'}
        onClose={() => setShow2faModal(null)}
        onSubmit={submit2faToggle}
      />
    </div>
  );
};
