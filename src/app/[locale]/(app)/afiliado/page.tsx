import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app/app-header";
import { AffiliateHistory } from "@/components/affiliates/dashboard";
import { affiliateCopy } from "@/lib/affiliates/copy";
import { pageNumber, type AffiliateDashboard } from "@/lib/affiliates/shared";
import { getDictionary } from "@/lib/i18n";
import { assertLocale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { route } from "@/lib/routes";
import { SITE_URL } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Área de afiliado",
  robots: { index: false },
};
export default async function AffiliatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = assertLocale((await params).locale);
  const query = await searchParams;
  const refPage = pageNumber(query.refPage),
    payPage = pageNumber(query.payPage);
  const copy = affiliateCopy(locale),
    dict = await getDictionary(locale);
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));
  const { data, error } = await db.rpc("affiliate_dashboard", {
    p_ref_page: refPage,
    p_pay_page: payPage,
  });
  if (error) throw new Error(copy.failed);
  const dashboard = data as AffiliateDashboard | null;
  return (
    <>
      <AppHeader
        title={copy.title}
        locale={locale}
        accountLabel={dict.nav.account}
        themeLabels={{
          light: dict.app.account.appearanceLight,
          dark: dict.app.account.appearanceDark,
        }}
        eyebrow={dict.common.tagline}
      />
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 pt-6">
        <p className="text-fg-muted">
          {dashboard ? copy.intro : copy.notAffiliate}
        </p>
        {dashboard ? (
          <AffiliateHistory
            data={dashboard}
            copy={copy}
            locale={locale}
            base={route(locale, "affiliate")}
            refPage={refPage}
            payPage={payPage}
            url={`${SITE_URL}/r/${dashboard.code}?locale=${locale}`}
          />
        ) : null}
      </div>
    </>
  );
}
