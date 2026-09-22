export const REFERRAL_COOKIE = "axon-referral";
export const REFERRAL_TTL = 60 * 60 * 24 * 30;
export function referralToken(value: string | undefined): string | undefined {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
    ? value
    : undefined;
}
export function pageNumber(value: string | string[] | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 100000 ? n : 0;
}
export type AffiliateSummary = {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  signups: number;
  sales: number;
  pending: number;
  paid: number;
};
export type AffiliateDashboard = AffiliateSummary & {
  referrals: {
    id: string;
    created_at: string;
    converted_at: string | null;
    paid: boolean;
  }[];
  payoutCount: number;
  payouts: { id: string; quantity: number; created_at: string }[];
};
export type AffiliateList = {
  total: number;
  items: (AffiliateSummary & { email: string | null })[];
};
