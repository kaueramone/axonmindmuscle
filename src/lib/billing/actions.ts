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

  // No Brasil, Pix. Mas o Pix só serve subscrições através do Pix Automático,
  // e este só é oferecido no checkout se enviarmos as condições do mandato —
  // sem isto, o brasileiro vê apenas cartão.
  const pix = market === "BR" ? await mandatoPix(price, interval) : null;

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
    ...(pix ? { payment_method_options: { pix: { mandate_options: pix } } } : {}),
    locale: locale === "pt-br" ? "pt-BR" : "pt",
    billing_address_collection: "auto",
    automatic_tax: { enabled: false },

    success_url: `${SITE_URL}${route(locale, "plans")}?estado=sucesso`,
    cancel_url: `${SITE_URL}${route(locale, "plans")}?estado=cancelado`,
  });

  if (sessao.url) redirect(sessao.url);
  redirect(`${route(locale, "plans")}?erro=checkout`);
}

/**
 * Condições do mandato de Pix Automático.
 *
 * O valor autorizado é o **preço cheio** e não o da primeira cobrança. Com o
 * FUNDADORES a valer uma vez só, o primeiro pagamento é mais baixo do que
 * todos os seguintes: um mandato autorizado pelo valor com desconto faria
 * falhar todas as renovações — e falhar do lado do banco, em silêncio.
 *
 * Vai com folga por cima disso, porque o mandato é um teto e não um valor: um
 * aumento de preço mais tarde teria de trazer a pessoa de volta ao banco para
 * reautorizar. A folga é o que evita esse regresso.
 */
async function mandatoPix(
  priceId: string,
  interval: BillingInterval,
): Promise<{
  amount: number;
  amount_type: "maximum";
  amount_includes_iof: "always";
  payment_schedule: "monthly" | "yearly";
  reference: string;
} | null> {
  try {
    const preco = await stripe().prices.retrieve(priceId);
    const cheio = preco.unit_amount;
    if (!cheio) return null;

    // Teto arredondado à dezena de reais acima, para o app do banco mostrar um
    // número redondo em vez de um valor que parece calculado à pressa.
    const comFolga = Math.ceil((cheio * 1.25) / 1000) * 1000;

    return {
      amount: comFolga,
      amount_type: "maximum",
      // A empresa absorve o IOF: o cliente vê no banco exatamente o valor que
      // a página anuncia, e os 3,5% saem da liquidação.
      amount_includes_iof: "always",
      payment_schedule: interval === "year" ? "yearly" : "monthly",
      reference: "AXON Mind-Muscle",
    };
  } catch (erro) {
    // Sem as condições do mandato o Pix não aparece, mas o cartão continua a
    // funcionar. Falhar o checkout inteiro por causa disto seria pior.
    console.error("[stripe] mandato Pix indisponível:", (erro as Error)?.message);
    return null;
  }
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
