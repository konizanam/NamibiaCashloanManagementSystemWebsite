export type Tier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

interface TierFees {
  monthly: number;
  onboarding: number;
  label: string;
}

export const TIER_FEES: Record<Tier, TierFees> = {
  tier1: { monthly: 1000, onboarding: 2000, label: 'Tier 1 — Starter' },
  tier2: { monthly: 2000, onboarding: 3500, label: 'Tier 2 — Growth' },
  tier3: { monthly: 4000, onboarding: 5000, label: 'Tier 3 — Professional' },
  tier4: { monthly: 8000, onboarding: 0,    label: 'Tier 4 — Enterprise' },
};

export const tierMonthly = (t: Tier): number => TIER_FEES[t].monthly;
export const tierOnboarding = (t: Tier): number => TIER_FEES[t].onboarding;

// ---------------------------------------------------------------------------
// Marketing & Client Acquisition Commission Agreement — standard rates
//   * 15% of Onboarding Fees (once-off)
//   * 25% of Subscription Fees in Year 1 and Year 2
//   * 15% of Subscription Fees in Year 3
//   * 0%  after month 36 ("Commission Period")
// ---------------------------------------------------------------------------
export const ONBOARDING_COMMISSION_RATE = 15; // percent
export const MONTHLY_COMMISSION_RATES = {
  year1_2: 25,
  year3:   15,
} as const;
export const COMMISSION_PERIOD_MONTHS = 36;

/** Whole-months between two month-start dates (UTC), period - activation. */
export function monthsBetween(activatedAt: Date, periodMonth: Date): number {
  return (
    (periodMonth.getUTCFullYear() - activatedAt.getUTCFullYear()) * 12 +
    (periodMonth.getUTCMonth() - activatedAt.getUTCMonth())
  );
}

/**
 * Returns the monthly commission rate (percent) for a given period relative to
 * the microlender's subscription start. 0 means no commission is owed.
 */
export function monthlyCommissionRate(activatedAt: Date, periodMonth: Date): number {
  const m = monthsBetween(activatedAt, periodMonth);
  if (m < 0) return 0;
  if (m < 24) return MONTHLY_COMMISSION_RATES.year1_2;
  if (m < COMMISSION_PERIOD_MONTHS) return MONTHLY_COMMISSION_RATES.year3;
  return 0;
}

export const commissionFromBase = (rate: number, base: number): number =>
  Math.round((rate / 100) * base * 100) / 100;
