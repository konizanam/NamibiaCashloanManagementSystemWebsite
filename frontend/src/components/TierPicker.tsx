import type { Tier } from '../api/types';

interface TierCard {
  value: Tier;
  name: string;
  label: string;
  clients: string;
  monthly: string;
  onboarding: string;
  enhancements: number;
  calls: string;
  highlight?: boolean;
}

export const TIERS: TierCard[] = [
  { value: 'tier1', name: 'Starter',      label: 'Tier 1',                clients: '1 – 500 clients',           monthly: 'N$1,000',  onboarding: 'N$2,000', enhancements: 1, calls: '4 / month' },
  { value: 'tier2', name: 'Growth',       label: 'Tier 2 · Most Popular', clients: '501 – 2,500 clients',       monthly: 'N$2,000',  onboarding: 'N$3,500', enhancements: 2, calls: '8 / month', highlight: true },
  { value: 'tier3', name: 'Professional', label: 'Tier 3',                clients: '2,501 – 10,000 clients',    monthly: 'N$4,000',  onboarding: 'N$5,000', enhancements: 3, calls: '16 / month' },
  { value: 'tier4', name: 'Enterprise',   label: 'Tier 4',                clients: '10,001+ clients',           monthly: 'N$8,000+', onboarding: 'Custom',  enhancements: 4, calls: 'Unlimited*' },
];

interface Props {
  value: Tier | null;
  onChange: (t: Tier) => void;
}

export const TierPicker = ({ value, onChange }: Props) => (
  <div>
    <p className="text-sm text-slate-600 mb-4">
      All plans include the full system, secure hosting, NAMFISA-aligned reports, role-based access, and an audit trail. Pricing is based on active client volume and excludes VAT. You can change tiers later — just talk to your account manager.
    </p>
    <div className="grid sm:grid-cols-2 gap-4">
      {TIERS.map((t) => {
        const selected = value === t.value;
        return (
          <button
            type="button"
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`text-left card p-5 flex flex-col transition-all
              ${selected
                ? 'ring-2 ring-brand-green border-brand-green shadow-cardHover'
                : 'hover:border-brand-green'}
              ${t.highlight && !selected ? 'ring-1 ring-brand-green/40' : ''}
            `}
            aria-pressed={selected}
          >
            <div className={`text-xs font-semibold uppercase tracking-wider ${t.highlight ? 'text-brand-green-dark' : 'text-slate-500'}`}>
              {t.label}
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-xl font-extrabold text-brand-navy">{t.name}</div>
              {selected && (
                <span className="badge-approved">Selected</span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{t.clients}</div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-brand-navy">{t.monthly}</div>
              <div className="text-xs text-slate-500">per month · onboarding {t.onboarding}</div>
            </div>
            <ul className="mt-3 text-xs text-slate-700 space-y-1 flex-1">
              <li>{t.enhancements} once-off custom enhancement{t.enhancements > 1 ? 's' : ''}</li>
              <li>{t.calls} free support calls</li>
              <li>NAMFISA reports · Audit trail · Role-based access</li>
              <li>Secure hosting included</li>
            </ul>
          </button>
        );
      })}
    </div>
    <p className="text-[11px] text-slate-500 mt-4">*Fair-use policy applies on Enterprise. Pricing excludes VAT.</p>
  </div>
);
