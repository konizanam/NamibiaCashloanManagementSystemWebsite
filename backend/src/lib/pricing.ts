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

export const commissionFromBase = (rate: number, base: number): number =>
  Math.round((rate / 100) * base * 100) / 100;
