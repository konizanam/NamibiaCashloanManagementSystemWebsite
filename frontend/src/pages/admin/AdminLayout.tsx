import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/Logo';

const SIDE = [
  { to: '/admin',                  label: 'Dashboard',        end: true },
  { to: '/admin/applications',     label: 'Applications' },
  { to: '/admin/marketing-agents', label: 'Marketing Agents' },
  { to: '/admin/commissions',      label: 'Commissions' },
];

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  // Close drawer on navigation.
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // Lock scroll when drawer open on mobile.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = open ? 'hidden' : original;
    return () => { document.body.style.overflow = original; };
  }, [open]);

  const doLogout = () => {
    logout();
    nav('/admin/login');
  };

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <Link to="/" aria-label="NCLMS home">
          <Logo variant="light" className="h-12 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="md:hidden text-white/70 hover:text-white p-1"
          aria-label="Close menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {SIDE.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.end}
            className={({ isActive }) =>
              `block px-3 py-2.5 rounded-md text-sm font-semibold ${
                isActive ? 'bg-brand-green text-white' : 'text-white/80 hover:bg-white/10'
              }`
            }
          >
            {s.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10 text-sm">
        <div className="text-white/60 text-xs">Signed in as</div>
        <div className="font-semibold truncate">{user?.full_name}</div>
        <div className="text-white/60 text-xs truncate">{user?.email}</div>
        <button onClick={doLogout} className="mt-3 text-xs text-brand-amber hover:underline">
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-brand-bg">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-16 bg-brand-navy text-white flex items-center justify-between px-4 shadow-md">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          aria-label="Open menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link to="/" aria-label="NCLMS home">
          <Logo variant="light" className="h-10 w-auto" />
        </Link>
        <button onClick={doLogout} className="text-xs text-brand-amber font-semibold">Sign out</button>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-brand-navy text-white flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-brand-navy text-white flex flex-col shadow-2xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      <main className="flex-1 overflow-x-hidden pt-16 md:pt-0">
        <div className="p-4 sm:p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
