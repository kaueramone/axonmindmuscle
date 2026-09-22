import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { assertLocale } from "@/lib/i18n/config";
import { affiliateCopy } from "@/lib/affiliates/copy";
import {
  pageNumber,
  referralToken,
  type AffiliateDashboard,
} from "@/lib/affiliates/shared";
import { Card } from "@/components/ui/surface";
import { AffiliateHistory } from "@/components/affiliates/dashboard";
import {
  AffiliatePayment,
  AffiliateToggle,
} from "@/components/affiliates/controls";
import { SITE_URL } from "@/lib/utils";

export const dynamic = "force-dynamic";
export default async function AdminAffiliatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale = assertLocale(rawLocale);
  const { supabase } = await requireAdmin(locale);
  if (!referralToken(id)) notFound();
  const copy = affiliateCopy(locale),
    base = `/${locale}/painel/afiliados`;
  const query = await searchParams;
  const refPage = pageNumber(query.refPage),
    payPage = pageNumber(query.payPage);
  const { data, error } = await supabase.rpc("affiliate_dashboard", {
    p_affiliate: id,
    p_ref_page: refPage,
    p_pay_page: payPage,
  });
  if (error) throw new Error(copy.failed);
  if (!data) notFound();
  const dashboard = data as AffiliateDashboard;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link className="text-accent" href={base}>
        {copy.back}
      </Link>
      <h1 className="text-large">{dashboard.name}</h1>
      <AffiliateToggle id={id} enabled={dashboard.enabled} copy={copy} />
      <Card>
        <AffiliatePayment id={id} available={dashboard.pending} copy={copy} />
      </Card>
      <AffiliateHistory
        data={dashboard}
        copy={copy}
        locale={locale}
        base={`${base}/${id}`}
        refPage={refPage}
        payPage={payPage}
        url={`${SITE_URL}/r/${dashboard.code}?locale=${locale}`}
      />
    </div>
  );
}
