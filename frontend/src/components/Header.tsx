import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/',         label: 'Home' },
  { to: '/about',    label: 'About' },
  { to: '/features', label: 'Features' },
  { to: '/pricing',  label: 'Pricing' },
  { to: '/apply',    label: 'Apply' },
  { to: '/contact',  label: 'Contact' },
];

const DEMO_URL = 'https://demo.konizafs.com';

const DemoButton = ({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) => (
  <a
    href={DEMO_URL}
    target="_blank"
    rel="noopener noreferrer"
    onClick={onClick}
    className={
      compact
        ? 'flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-bold bg-brand-amber text-brand-navy hover:bg-yellow-400 shadow-card'
        : 'ml-2 px-4 py-2 rounded-lg text-sm font-bold bg-brand-amber text-brand-navy hover:bg-yellow-400 shadow-card flex items-center gap-1.5 ring-2 ring-brand-amber/40 ring-offset-2 ring-offset-transparent transition-all'
    }
  >
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
    </span>
    Live Demo
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  </a>
);

export const Header = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  // Close drawer on navigation.
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // Lock body scroll while mobile drawer open.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = open ? 'hidden' : original;
    return () => { document.body.style.overflow = original; };
  }, [open]);

  return (
    <header className="bg-brand-gradient sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 md:h-24 flex items-center gap-4">
        <Link to="/" className="shrink-0 flex items-center" aria-label="NCLMS home">
          <Logo variant="light" className="h-12 md:h-16 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 ml-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-white text-brand-green-dark shadow-card'
                    : 'text-white/90 hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <DemoButton />
          {user ? (
            <NavLink
              to={user.role === 'admin' ? '/admin' : user.role === 'marketing_agent' ? '/agent' : '/'}
              className={({ isActive }) =>
                `ml-1 px-3 py-2 rounded-lg text-sm font-semibold ${
                  isActive ? 'bg-white text-brand-green-dark' : 'text-white/90 hover:bg-white/10'
                }`
              }
            >
              {user.role === 'admin' ? 'Admin' : user.role === 'marketing_agent' ? 'Agent' : 'Account'}
            </NavLink>
          ) : (
            <NavLink
              to="/login"
              className="ml-1 px-3 py-2 rounded-lg text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              Sign in
            </NavLink>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden ml-auto inline-flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden absolute left-0 right-0 top-full bg-brand-navy text-white shadow-xl transition-all overflow-hidden ${
          open ? 'max-h-[80vh]' : 'max-h-0'
        }`}
      >
        <nav className="px-4 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-3 rounded-lg text-sm font-semibold ${
                  isActive ? 'bg-brand-green text-white' : 'text-white/90 hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {user ? (
            <NavLink
              to={user.role === 'admin' ? '/admin' : user.role === 'marketing_agent' ? '/agent' : '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-3 rounded-lg text-sm font-semibold ${
                  isActive ? 'bg-brand-green text-white' : 'text-white/90 hover:bg-white/10'
                }`
              }
            >
              {user.role === 'admin' ? 'Admin Dashboard' : user.role === 'marketing_agent' ? 'Agent Dashboard' : 'My account'}
            </NavLink>
          ) : (
            <NavLink
              to="/login"
              onClick={() => setOpen(false)}
              className="block px-3 py-3 rounded-lg text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              Sign in
            </NavLink>
          )}
          <div className="pt-3 mt-2 border-t border-white/10">
            <DemoButton compact onClick={() => setOpen(false)} />
          </div>
        </nav>
      </div>
    </header>
  );
};
