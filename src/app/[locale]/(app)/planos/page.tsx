import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { PlanCards } from "@/components/app/plan-cards";
import { Alert, Card } from "@/components/ui/surface";
import { getDictionary } from "@/lib/i18n";
import { assertLocale, marketByLocale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import {
  billingEnabled,
  fetchFoundersDiscounts,
  fetchPrices,
  type BillingInterval,
  type PriceView,
} from "@/lib/stripe/server";
import { FOUNDERS_CODE } from "@/lib/stripe/shared";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Planos", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ estado?: string; erro?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const { estado, erro } = await searchParams;
  const dict = await getDictionary(locale);
  const copy = dict.app.plans;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  const [{ data: perfil }, { data: subscricao }, { data: cupaoUsado }] =
    await Promise.all([
    supabase.from("profiles").select("plan, market").eq("id", user.id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status, current_period_end, cancel_at_period_end, interval")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("coupon_redemptions")
      .select("code")
      .eq("user_id", user.id)
      .eq("code", FOUNDERS_CODE)
      .maybeSingle(),
  ]);

  const market = perfil?.market ?? marketByLocale[locale].market;

  // Os preços vêm do Stripe, não daqui: a página nunca deve anunciar um valor
  // diferente do que vai ser cobrado.
  let precos: PriceView[] = [];
  let descontos: Partial<Record<BillingInterval, number>> = {};
  if (billingEnabled()) {
    try {
      [precos, descontos] = await Promise.all([
        fetchPrices(market, marketByLocale[locale].intl),
        fetchFoundersDiscounts(),
      ]);
    } catch (erro) {
      console.error("[stripe] planos indisponíveis:", (erro as Error)?.message);
      precos = [];
    }
  }

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
        {estado === "sucesso" ? (
          <Alert tone="success">
            <span>
              <strong className="font-semibold">{copy.success}</strong>{" "}
              {copy.successHint}
            </span>
          </Alert>
        ) : null}
        {estado === "cancelado" ? <Alert tone="info">{copy.canceled}</Alert> : null}
        {erro === "config" ? <Alert tone="danger">{copy.errorConfig}</Alert> : null}
        {erro === "checkout" ? <Alert tone="danger">{copy.errorCheckout}</Alert> : null}
        {erro === "cupao" ? <Alert tone="danger">{copy.errorCoupon}</Alert> : null}
        {erro === "cupao-usado" ? (
          <Alert tone="info">{copy.errorCouponUsed}</Alert>
        ) : null}

        <p className="text-callout leading-relaxed text-fg-muted">{copy.subtitle}</p>

        {precos.length === 0 ? (
          <Card>
            <p className="text-callout text-fg-muted">{copy.unavailable}</p>
          </Card>
        ) : (
          <PlanCards
            locale={locale}
            copy={copy}
            precos={precos}
            plano={perfil?.plan ?? "free"}
            subscricao={subscricao ?? null}
            descontos={descontos}
            cupaoGasto={Boolean(cupaoUsado)}
            intlLocale={marketByLocale[locale].intl}
          />
        )}
      </div>
    </>
  );
}
