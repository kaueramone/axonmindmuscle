import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { assertLocale } from "@/lib/i18n/config";
import { affiliateCopy } from "@/lib/affiliates/copy";
import { pageNumber, type AffiliateList } from "@/lib/affiliates/shared";
import { Card } from "@/components/ui/surface";
import { AffiliateStats, Pagination } from "@/components/affiliates/dashboard";
import { affiliateOverview } from "@/lib/affiliates/overview";

export const dynamic = "force-dynamic";
export default async function AdminAffiliatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = assertLocale((await params).locale);
  const { supabase } = await requireAdmin(locale);
  const copy = affiliateCopy(locale),
    base = `/${locale}/painel/afiliados`;
  const page = pageNumber((await searchParams).page);
  const { totals, list } = await affiliateOverview(async (pageNumber) => {
    const { data, error } = await supabase.rpc("admin_affiliates", { p_page: pageNumber });
    if (error || !data) throw new Error(copy.failed);
    return data as AffiliateList;
  }, page);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-large">{copy.adminTitle}</h1>
      <p className="text-fg-muted">{copy.adminIntro}</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [copy.totalAffiliates, totals.affiliates],
          [copy.signups, totals.signups],
          [copy.sales, totals.sales],
          [copy.pendingCommissions, totals.pending],
        ].map(([label, value]) => <Card key={label}>
          <p className="text-footnote text-fg-muted">{label}</p>
          <p className="text-large text-fg">{value}</p>
        </Card>)}
      </div>
      <p className="text-footnote text-fg-muted">{copy.activeAffiliates}: {totals.active} · {copy.paidCommissions}: {totals.paid}</p>
      <Link className="text-accent" href={`/${locale}/painel/utilizadores`}>{copy.manageUsers}</Link>
      <h2 className="text-headline">{copy.byAffiliate}</h2>
      {list.items.length === 0 ? (
        <p>{copy.empty}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.items.map((a) => (
            <Card key={a.id} className="flex flex-col gap-4">
              <div>
                <h2 className="text-headline">{a.name}</h2>
                <p className="break-all text-footnote text-fg-muted">
                  {a.email}
                </p>
                <p className="text-caption text-fg-muted">
                  {a.enabled ? copy.enabled : copy.disabled}
                </p>
              </div>
              <AffiliateStats data={a} copy={copy} />
              <Link className="text-accent" href={`${base}/${a.id}`}>
                {copy.details}
              </Link>
            </Card>
          ))}
        </div>
      )}
      <Pagination base={base} page={page} total={list.total} copy={copy} />
    </div>
  );
}
