import type { AffiliateList } from "./shared";

/** Sum every RPC page, not just the 25 affiliates visible on screen. */
export async function affiliateOverview(
  readPage: (page: number) => Promise<AffiliateList>,
  selectedPage: number,
) {
  const first = await readPage(0);
  const totals = { affiliates: first.total, active: 0, signups: 0, sales: 0, pending: 0, paid: 0 };
  let selected: AffiliateList = { total: first.total, items: [] };
  function add(list: AffiliateList, page: number) {
    if (page === selectedPage) selected = list;
    for (const item of list.items) {
      totals.active += item.enabled ? 1 : 0;
      totals.signups += item.signups;
      totals.sales += item.sales;
      totals.pending += item.pending;
      totals.paid += item.paid;
    }
  }
  add(first, 0);
  const pages = Math.ceil(first.total / 25);
  // Bound concurrent requests while using the already-deployed, admin-only RPC.
  for (let start = 1; start < pages; start += 5) {
    const indexes = Array.from({ length: Math.min(5, pages - start) }, (_, i) => start + i);
    const results = await Promise.all(indexes.map(readPage));
    results.forEach((list, i) => add(list, indexes[i]));
  }
  return { totals, list: selected };
}
