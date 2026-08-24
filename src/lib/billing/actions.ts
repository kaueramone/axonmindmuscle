"use server";

import { redirect } from "next/navigation";

import { assertLocale, marketByLocale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import {
  FOUNDERS_CODE,
  foundersCouponId,
  normalizeCode,
  priceIds,
  stripe,
  type BillingInterval,
} from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/utils";

/**
 * Abre o checkout do Stripe para o plano PRO.
 *
 * A moeda vem do mercado do perfil, não de uma escolha na página: quem tem
 * conta portuguesa paga em euros e quem tem conta brasileira paga em reais.
 * O cupão fica sempre disponível — é o Stripe que decide se está válido.
 */
export async function startCheckoutAction(formData: FormData): Promise<void> {
  const locale = assertLocale(String(formData.get("locale") ?? ""));
  const interval = (String(formData.get("interval") ?? "month") === "year"
    ? "year"
    : "month") as BillingInterval;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  const codigo = normalizeCode(String(formData.get("coupon") ?? ""));

  const [{ data: perfil }, { data: jaUsou }] = await Promise.all([
    supabase
      .from("profiles")
      .select("market, stripe_customer_id, display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("coupon_redemptions")
      .select("code")
      .eq("user_id", user.id)
      .eq("code", FOUNDERS_CODE)
      .maybeSingle(),
  ]);

  const market = perfil?.market ?? marketByLocale[locale].market;
  const price = priceIds(market)[interval];
  if (!price) redirect(`${route(locale, "plans")}?erro=config`);

  // O código dos fundadores vale uma vez por pessoa, e o desconto muda com o
  // período. Se já foi gasto, o pedido segue sem ele em vez de falhar.
  const cupao = foundersCouponId(interval);
  const aplicarFundadores = codigo === FOUNDERS_CODE && !jaUsou && Boolean(cupao);

  if (codigo && codigo !== FOUNDERS_CODE) {
    redirect(`${route(locale, "plans")}?erro=cupao`);
  }
  if (codigo === FOUNDERS_CODE && jaUsou) {
    redirect(`${route(locale, "plans")}?erro=cupao-usado`);
  }

  const sessao = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],

    // Reaproveitar o cliente evita registos duplicados no Stripe e mantém o
    // histórico de faturação da pessoa num só sítio.
    ...(perfil?.stripe_customer_id
      ? { customer: perfil.stripe_customer_id }
      : { customer_email: user.email ?? undefined }),

    client_reference_id: user.id,
    // Os metadados chegam ao webhook nos dois objetos — sessão e subscrição.
    metadata: { user_id: user.id },
    subscription_data: {
      metadata: {
        user_id: user.id,
        ...(aplicarFundadores ? { founders_code: FOUNDERS_CODE } : {}),
      },
    },

    // Os dois são mutuamente exclusivos no Stripe: ou aplicamos o desconto
    // nós, ou deixamos a caixa de código do checkout tratar disso.
    ...(aplicarFundadores
      ? { discounts: [{ coupon: cupao }] }
      : { allow_promotion_codes: true }),
    locale: locale === "pt-br" ? "pt-BR" : "pt",
    billing_address_collection: "auto",
    automatic_tax: { enabled: false },

    success_url: `${SITE_URL}${route(locale, "plans")}?estado=sucesso`,
    cancel_url: `${SITE_URL}${route(locale, "plans")}?estado=cancelado`,
  });

  if (sessao.url) redirect(sessao.url);
  redirect(`${route(locale, "plans")}?erro=checkout`);
}

/** Portal do Stripe: cancelar, trocar de plano, ver faturas. */
export async function openBillingPortalAction(formData: FormData): Promise<void> {
  const locale = assertLocale(String(formData.get("locale") ?? ""));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  const { data: perfil } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil?.stripe_customer_id) redirect(route(locale, "plans"));

  const sessao = await stripe().billingPortal.sessions.create({
    customer: perfil.stripe_customer_id,
    return_url: `${SITE_URL}${route(locale, "account")}`,
    locale: locale === "pt-br" ? "pt-BR" : "pt",
  });

  redirect(sessao.url);
}
