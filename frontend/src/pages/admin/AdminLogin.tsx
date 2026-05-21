import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TextField } from '../../components/Field';
import type { ApiError } from '../../api/client';

export const AdminLogin = () => {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const u = await login(email, password);
      if (u.role !== 'admin') {
        setErr('This account is not an admin.');
        return;
      }
      nav('/admin');
    } catch (e2) {
      setErr((e2 as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-extrabold text-brand-navy">Admin sign in</h1>
      <p className="text-slate-600 mt-2 text-sm">Sign in with your Koniza admin credentials.</p>

      <form className="card p-7 mt-8 space-y-5" onSubmit={submit}>
        <TextField label="Email" type="email" required autoFocus value={email}
          onChange={(e) => setEmail(e.target.value)} name="email" />
        <TextField label="Password" type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)} name="password" />
        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};
