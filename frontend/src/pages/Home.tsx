import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

const Feature = ({ title, body, color }: { title: string; body: string; color: string }) => (
  <div className={`card-hover p-6 border-t-4 ${color}`}>
    <div className="font-bold text-lg text-brand-navy">{title}</div>
    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{body}</p>
  </div>
);

export const Home = () => {
  usePageMeta({
    title: 'Cash loan management for Namibian microlenders',
    description: 'NAMFISA-ready loan management software. Manage clients, loans, repayments and compliance in one secure cloud platform — from N$1,000/month, hosting included.',
    canonicalPath: '/',
  });
  return (
    <>
      {/* Hero */}
      <section className="relative bg-brand-gradient text-white overflow-hidden">
        <div className="absolute inset-0 bg-hero-grid [background-size:24px_24px] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wider uppercase mb-5">
            Smart · Secure · NAMFISA-Ready
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            The cash loan system built for Namibian microlenders
          </h1>
          <p className="mt-5 text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
            Manage clients, loans, repayments, contracts and compliance — end-to-end, with secure hosting included.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/apply" className="bg-white text-brand-green-dark px-6 py-3 rounded-lg font-semibold shadow-card hover:bg-slate-50">
              Apply Online
            </Link>
            <Link to="/pricing" className="bg-brand-amber text-brand-navy px-6 py-3 rounded-lg font-semibold shadow-card hover:bg-yellow-500">
              View Pricing
            </Link>
            <Link to="/features" className="btn-ghost">
              Explore Features
            </Link>
          </div>
        </div>
      </section>

      {/* Stat tiles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10 grid md:grid-cols-3 gap-6">
        <Feature color="border-brand-green" title="End-to-End Lending"
                 body="Client onboarding, loan creation, repayment scheduling, contracts and reports — all in one place." />
        <Feature color="border-brand-navy" title="NAMFISA-Aligned"
                 body="Loan-related compliance reports and a full audit trail, ready when the regulator asks." />
        <Feature color="border-brand-amber" title="Hosted by Koniza"
                 body="Secure cloud hosting, updates, and support included from N$1,000 per month." />
      </section>

      {/* Mission */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-green-50 p-6 md:p-8 grid md:grid-cols-2 gap-8 md:gap-10 items-center">
          <div>
            <div className="text-brand-green-dark font-semibold uppercase tracking-wider text-xs">Why NCLMS</div>
            <h2 className="text-3xl font-extrabold mt-2 text-brand-navy">Move from manual chaos to digital control.</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">
              Many lending businesses still rely on spreadsheets and paper. NCLMS replaces that with a single platform —
              accurate, auditable, and accessible from anywhere.
            </p>
          </div>
          <div>
            <div className="text-brand-navy font-semibold uppercase tracking-wider text-xs">What you get</div>
            <ul className="mt-3 space-y-2 text-slate-700">
              <li>✓ Save time and reduce paperwork</li>
              <li>✓ Minimise human errors in interest and arrears</li>
              <li>✓ Improve client trust and professionalism</li>
              <li>✓ Be audit-ready and NAMFISA-aligned</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3">
        <div className="rounded-2xl overflow-hidden shadow-cardHover ring-1 ring-slate-200 bg-white">
          <img
            src="/nclms-website-picture.png"
            alt="NCLMS admin dashboard preview"
            className="block w-full h-auto"
            loading="lazy"
          />
        </div>
      </section>

      {/* Apply CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="rounded-2xl bg-brand-navy text-white p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold">Ready to onboard your microlending business?</h2>
            <p className="text-white/80 mt-2 max-w-xl">
              Submit your business details and supporting documents online. We review every application and respond by email.
            </p>
          </div>
          <Link to="/apply" className="btn-primary text-base px-7 py-3.5">
            Start Application →
          </Link>
        </div>
      </section>
    </>
  );
};
