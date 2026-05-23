import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

interface TierCard {
  name: string;
  label: string;
  clients: string;
  monthly: string;
  onboarding: string;
  enhancements: number;
  calls: string;
  extraCallRate: string;
  perks: string[];
  highlight?: boolean;
}

const tiers: TierCard[] = [
  {
    name: 'Starter',
    label: 'Tier 1',
    clients: '1 – 500 clients',
    monthly: 'N$1,000',
    onboarding: 'N$2,000',
    enhancements: 1,
    calls: '4 free support calls / month',
    extraCallRate: 'N$150 per additional support call',
    perks: ['Full system access from day one'],
  },
  {
    name: 'Growth',
    label: 'Tier 2 · Most Popular',
    clients: '501 – 2,500 clients',
    monthly: 'N$2,000',
    onboarding: 'N$3,500',
    enhancements: 2,
    calls: '8 free support calls / month',
    extraCallRate: 'N$100 per additional support call',
    perks: ['Everything in Tier 1, plus extra capacity for a growing book'],
    highlight: true,
  },
  {
    name: 'Professional',
    label: 'Tier 3',
    clients: '2,501 – 10,000 clients',
    monthly: 'N$4,000',
    onboarding: 'N$5,000',
    enhancements: 3,
    calls: '16 free support calls / month',
    extraCallRate: 'N$50 per additional support call',
    perks: ['Everything in Tier 2, sized for a multi-branch operation'],
  },
  {
    name: 'Enterprise',
    label: 'Tier 4',
    clients: '10,001+ clients',
    monthly: 'N$8,000+',
    onboarding: 'Custom',
    enhancements: 4,
    calls: 'Unlimited support calls*',
    extraCallRate: 'Fair-use policy applies',
    perks: ['Custom onboarding fee and bespoke configuration'],
  },
];

const INCLUDED_IN_EVERY_PLAN: { title: string; body: string }[] = [
  { title: 'Secure cloud hosting',          body: 'Hosted, monitored, and updated by Koniza — no servers to run yourself.' },
  { title: 'NAMFISA-aligned reporting',     body: 'Loan-related compliance reports you can hand to the regulator.' },
  { title: 'Full audit trail',              body: 'Every system action is logged, attributable, and exportable.' },
  { title: 'Email notifications',           body: 'Loan approvals, repayment reminders, contract notifications.' },
  { title: 'Role-based access',             body: 'Permission levels per role, secure access by function.' },
  { title: 'Contracts & e-signatures',      body: 'Auto-generated loan contracts and online signing (signature pad optional).' },
  { title: 'System maintenance & updates',  body: 'Releases, patches, and improvements applied on your behalf.' },
];

const ONBOARDING_INCLUDES: string[] = [
  'System setup and deployment',
  'Client, loan, and interest configuration',
  'Role-based user setup',
  'Contract template configuration',
  'Email notification setup',
  'Initial staff training',
];

const ENHANCEMENT_EXAMPLES: string[] = [
  'Additional loan or client fields',
  'Minor workflow or approval changes',
  'Simple loan-related reports or filters',
  'Adjustments to repayment or interest rules',
  'Minor layout or screen changes',
];

const ENHANCEMENT_EXCLUSIONS: string[] = [
  'New system modules',
  'Third-party integrations (banks, SMS, payment gateways, accounting systems)',
  'Major redesigns or rewrites',
  'Ongoing or recurring changes',
  'Regulatory, legal, or accounting advice',
];

export const Pricing = () => {
  usePageMeta({
    title: 'Pricing',
    description: 'Tiered NCLMS pricing for Namibian microlenders. From N$1,000 per month (Tier 1) to enterprise. All plans include hosting, NAMFISA reporting, audit trail, email notifications and updates.',
    canonicalPath: '/pricing',
  });
  return (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    {/* Header */}
    <div className="text-center">
      <div className="text-brand-green-dark font-semibold uppercase tracking-wider text-xs">Pricing</div>
      <h1 className="text-4xl font-extrabold text-brand-navy mt-2">Hosting, updates and support — included.</h1>
      <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
        All plans include the full system, secure hosting, NAMFISA-aligned reports, role-based access and an audit trail.
        Pricing is based on active client volume. Fees exclude VAT and are billed monthly in advance.
      </p>
    </div>

    {/* Tier cards */}
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
      {tiers.map((t) => (
        <div
          key={t.name}
          className={`card p-6 flex flex-col ${t.highlight ? 'ring-2 ring-brand-green shadow-cardHover' : ''}`}
        >
          <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${t.highlight ? 'text-brand-green-dark' : 'text-slate-500'}`}>
            {t.label}
          </div>
          <div className="text-2xl font-extrabold text-brand-navy">{t.name}</div>
          <div className="text-sm text-slate-500 mt-1">{t.clients}</div>

          <div className="mt-5">
            <div className="text-3xl font-extrabold text-brand-navy">{t.monthly}</div>
            <div className="text-xs text-slate-500">per month</div>
          </div>

          <div className="mt-4 pb-4 border-b border-slate-100">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Onboarding (once-off)</div>
            <div className="text-lg font-bold text-brand-navy mt-0.5">{t.onboarding}</div>
          </div>

          <ul className="mt-4 space-y-2 text-sm text-slate-700 flex-1">
            {t.perks.map((p) => (
              <li key={p} className="text-slate-700">{p}</li>
            ))}
            <li>
              <span className="font-semibold text-brand-navy">{t.enhancements}</span> once-off custom enhancement{t.enhancements > 1 ? 's' : ''}
            </li>
            <li>{t.calls}</li>
            <li className="text-xs text-slate-500">{t.extraCallRate}</li>
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

    {/* What every plan includes */}
    <section className="mt-16">
      <div className="text-center">
        <div className="text-brand-green-dark font-semibold uppercase tracking-wider text-xs">Included in every plan</div>
        <h2 className="text-2xl font-extrabold text-brand-navy mt-2">No matter which tier you choose</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {INCLUDED_IN_EVERY_PLAN.map((f) => (
          <div key={f.title} className="card p-5">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803d"
                   strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12.5l5 5L20 6" />
              </svg>
              <div className="font-bold text-brand-navy">{f.title}</div>
            </div>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Onboarding includes */}
    <section className="mt-16 card p-8 bg-gradient-to-br from-slate-50 to-green-50/60">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="text-brand-green-dark font-semibold uppercase tracking-wider text-xs">What onboarding includes</div>
          <h2 className="text-2xl font-extrabold text-brand-navy mt-2">A one-time setup, done with you.</h2>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            The once-off onboarding fee covers everything below — so you start on day one with a configured system, trained staff, and your own contract templates in place.
          </p>
        </div>
        <ul className="grid sm:grid-cols-2 gap-3 text-sm text-slate-700">
          {ONBOARDING_INCLUDES.map((o) => (
            <li key={o} className="flex items-start gap-2">
              <span className="text-brand-green-dark font-bold mt-0.5">✓</span>
              <span>{o}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>

    {/* Optional add-on + custom enhancements */}
    <div className="grid md:grid-cols-2 gap-6 mt-12">
      <div className="card p-6">
        <div className="text-xs font-bold uppercase tracking-wider text-brand-amber mb-1">Optional hardware</div>
        <div className="font-bold text-brand-navy text-lg">Signature pad for walk-in clients</div>
        <p className="text-sm text-slate-700 mt-2">
          Capture digital signatures in-branch on a hardware pad, fully integrated with NCLMS loan contracts. Improves record-keeping and audit readiness.
        </p>
        <div className="mt-4 inline-flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-brand-navy">N$5,000</span>
          <span className="text-xs text-slate-500 font-medium">once-off · hardware + basic configuration included</span>
        </div>
      </div>

      <div className="card p-6">
        <div className="text-xs font-bold uppercase tracking-wider text-brand-green-dark mb-1">Custom enhancements</div>
        <div className="font-bold text-brand-navy text-lg">Extra changes outside your tier's allowance</div>
        <p className="text-sm text-slate-700 mt-2">
          Need more than the enhancements your tier includes? Pay-as-you-go pricing:
        </p>
        <ul className="mt-3 text-sm text-slate-700 space-y-1.5">
          <li>• <strong>Small:</strong> N$1,500 – N$3,000</li>
          <li>• <strong>Medium:</strong> N$4,000 – N$8,000</li>
          <li>• <strong>Large:</strong> N$10,000+</li>
          <li>• <strong>Bundle of 2 enhancements:</strong> N$5,000</li>
          <li>• <strong>Bundle of 5 enhancements:</strong> N$10,000</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3">Each enhancement is once-off, with scope agreed in writing before development.</p>
      </div>
    </div>

    {/* Enhancement examples / exclusions */}
    <section className="grid md:grid-cols-2 gap-6 mt-6">
      <div className="card p-6 border-l-4 border-brand-green">
        <div className="font-bold text-brand-navy">An enhancement might be</div>
        <ul className="mt-2 text-sm text-slate-700 space-y-1.5">
          {ENHANCEMENT_EXAMPLES.map((e) => <li key={e}>✓ {e}</li>)}
        </ul>
      </div>
      <div className="card p-6 border-l-4 border-red-300">
        <div className="font-bold text-brand-navy">Enhancements don't cover</div>
        <ul className="mt-2 text-sm text-slate-700 space-y-1.5">
          {ENHANCEMENT_EXCLUSIONS.map((e) => <li key={e}>✗ {e}</li>)}
        </ul>
        <p className="text-xs text-slate-500 mt-3">Requests outside this scope are quoted separately.</p>
      </div>
    </section>

    {/* Billing / compliance footer */}
    <section className="mt-12 grid md:grid-cols-3 gap-4">
      <div className="card p-5">
        <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Billing</div>
        <ul className="mt-2 text-sm text-slate-700 space-y-1">
          <li>• Monthly, in advance</li>
          <li>• Priced on active client volume</li>
          <li>• Fees exclude VAT unless stated</li>
        </ul>
      </div>
      <div className="card p-5">
        <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Support</div>
        <ul className="mt-2 text-sm text-slate-700 space-y-1">
          <li>• Technical assistance + system guidance</li>
          <li>• Free calls allocated by tier</li>
          <li>• Extra calls billed at tier rate</li>
        </ul>
      </div>
      <div className="card p-5">
        <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Compliance</div>
        <ul className="mt-2 text-sm text-slate-700 space-y-1">
          <li>• NAMFISA-aligned reporting only</li>
          <li>• Not a replacement for accounting / legal</li>
          <li>• Compliance stays with the lender</li>
        </ul>
      </div>
    </section>

    <p className="text-xs text-slate-500 mt-8 text-center">
      *Fair-use policy applies on Enterprise. All pricing in N$ and excludes VAT.
    </p>
  </div>
  );
};
