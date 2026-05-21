import { Link } from 'react-router-dom';

interface Tier {
  name: string;
  label: string;
  clients: string;
  monthly: string;
  onboarding: string;
  enhancements: number;
  calls: string;
  highlight?: boolean;
}

const tiers: Tier[] = [
  { name: 'Starter',     label: 'Tier 1', clients: '1 – 500 clients',           monthly: 'N$1,000', onboarding: 'N$2,000', enhancements: 1, calls: '4 / month' },
  { name: 'Growth',      label: 'Tier 2 · Most Popular', clients: '501 – 2,500 clients', monthly: 'N$2,000', onboarding: 'N$3,500', enhancements: 2, calls: '8 / month', highlight: true },
  { name: 'Professional',label: 'Tier 3', clients: '2,501 – 10,000 clients',    monthly: 'N$4,000', onboarding: 'N$5,000', enhancements: 3, calls: '16 / month' },
  { name: 'Enterprise',  label: 'Tier 4', clients: '10,001+ clients',           monthly: 'N$8,000+', onboarding: 'Custom', enhancements: 4, calls: 'Unlimited*' },
];

export const Pricing = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div className="text-center">
      <div className="text-brand-green-dark font-semibold uppercase tracking-wider text-xs">Pricing</div>
      <h1 className="text-4xl font-extrabold text-brand-navy mt-2">Hosting, updates and support — included.</h1>
      <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
        All plans include the full system, secure hosting, NAMFISA-aligned reports, role-based access and an audit trail.
        Pricing is based on active client volume. Fees exclude VAT and are billed monthly in advance.
      </p>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
      {tiers.map((t) => (
        <div
          key={t.name}
          className={`card p-6 flex flex-col ${t.highlight ? 'ring-2 ring-brand-green shadow-cardHover' : ''}`}
        >
          {t.highlight && (
            <div className="text-xs font-bold text-brand-green-dark uppercase tracking-wider mb-1">{t.label}</div>
          )}
          {!t.highlight && (
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t.label}</div>
          )}
          <div className="text-2xl font-extrabold text-brand-navy">{t.name}</div>
          <div className="text-sm text-slate-500 mt-1">{t.clients}</div>

          <div className="mt-5">
            <div className="text-3xl font-extrabold text-brand-navy">{t.monthly}</div>
            <div className="text-xs text-slate-500">per month</div>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-slate-700 flex-1">
            <li>Onboarding: <strong>{t.onboarding}</strong></li>
            <li>{t.enhancements} once-off custom enhancement{t.enhancements > 1 ? 's' : ''}</li>
            <li>{t.calls} free support calls</li>
            <li>Secure hosting included</li>
            <li>NAMFISA-aligned reporting</li>
            <li>Audit trail &amp; role-based access</li>
          </ul>

          <Link
            to="/apply"
            className={`mt-6 text-center ${t.highlight ? 'btn-primary' : 'btn-outline'}`}
          >
            Apply with this tier
          </Link>
        </div>
      ))}
    </div>

    <div className="mt-10 grid md:grid-cols-2 gap-6">
      <div className="card p-6">
        <div className="font-bold text-brand-navy">Optional Hardware</div>
        <p className="text-sm text-slate-700 mt-1">
          <strong>Signature pad</strong> for walk-in clients — N$5,000 once-off. Hardware and basic configuration included.
        </p>
      </div>
      <div className="card p-6">
        <div className="font-bold text-brand-navy">Custom Enhancements</div>
        <p className="text-sm text-slate-700 mt-1">
          Small (N$1,500–3,000) · Medium (N$4,000–8,000) · Large (N$10,000+). Bundles: 2 for N$5,000, 5 for N$10,000.
          Scope agreed in writing before development.
        </p>
      </div>
    </div>

    <p className="text-xs text-slate-500 mt-8 text-center">
      *Fair-use policy applies on Enterprise. NAMFISA-aligned reporting only — system does not replace accounting, tax, or legal services.
    </p>
  </div>
);
