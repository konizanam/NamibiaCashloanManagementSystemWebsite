import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';

export const MicrolenderPortal = () => {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const signOut = () => { logout(); nav('/login'); };

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      <header className="bg-brand-navy text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" aria-label="NCLMS home"><Logo variant="light" className="h-10 w-auto" /></Link>
          <button onClick={signOut} className="text-sm font-semibold text-brand-amber hover:underline">
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-xs uppercase tracking-wider text-brand-green-dark font-semibold">Microlender Portal</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand-navy mt-1">
            Welcome{user ? `, ${user.full_name}` : ''}.
          </h1>
          <p className="text-slate-600 mt-3">
            Your NCLMS account is active. The full loan-management portal — clients, loans, repayments,
            contracts, NAMFISA reports — is on the way and will appear here as it lands.
          </p>

          <div className="card p-6 mt-8">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Signed in as</div>
            <div className="mt-1 text-brand-navy font-semibold">{user?.email}</div>
            <div className="text-xs text-slate-500 mt-1">Role: microlender</div>
          </div>

          <div className="card p-6 mt-4 border-l-4 border-brand-amber bg-amber-50/40">
            <div className="font-semibold text-brand-navy">Need help?</div>
            <p className="text-sm text-slate-700 mt-1">
              Onboarding, configuration, or training questions go to your Koniza account manager.
              You can also reach support at{' '}
              <a href="mailto:it@konizanam.com" className="text-brand-green-dark font-semibold underline-offset-2 hover:underline">
                it@konizanam.com
              </a>{' '}
              or +264 81 465 7337.
            </p>
          </div>

          <div className="text-xs text-slate-500 mt-8">
            NAMFISA-aligned reporting only — does not replace accounting, tax, or legal services.
          </div>
        </div>
      </main>
    </div>
  );
};
