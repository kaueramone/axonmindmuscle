import "server-only";

import Stripe from "stripe";

import { FOUNDERS_CODE, normalizeCode } from "@/lib/stripe/shared";
import type { MarketCode } from "@/lib/supabase/types";

export { FOUNDERS_CODE, normalizeCode };

/**
 * Cliente do Stripe para o servidor. A chave secreta nunca chega ao browser
 * e nunca entra no repositório — vive apenas nas variáveis de ambiente.
 */
let cliente: Stripe | null = null;

export function stripe(): Stripe {
  if (!cliente) {
    const chave = process.env.STRIPE_SECRET_KEY;
    if (!chave) {
      throw new Error(
        "STRIPE_SECRET_KEY em falta. Define-a nas variáveis de ambiente antes de usar o pagamento.",
      );
    }
    cliente = new Stripe(chave, { typescript: true });
  }
  return cliente;
}

/**
 * Verdadeiro quando há configuração suficiente para mostrar planos.
 *
 * Quando falta alguma coisa, regista **os nomes** que faltam — nunca valores.
 * Sem isto, uma variável mal escrita e uma chave sem permissões produzem
 * exatamente a mesma página em branco, e não há como distinguir as duas.
 */
export function billingEnabled(): boolean {
  const obrigatorias = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PRICE_PRO_MONTH_EUR",
    "STRIPE_PRICE_PRO_YEAR_EUR",
    "STRIPE_PRICE_PRO_MONTH_BRL",
    "STRIPE_PRICE_PRO_YEAR_BRL",
  ];
  const emFalta = obrigatorias.filter((nome) => !process.env[nome]);

  if (emFalta.length > 0) {
    console.error("[stripe] variáveis de ambiente em falta:", emFalta.join(", "));
    return false;
  }
  return true;
}

export type BillingInterval = "month" | "year";

/**
 * Os identificadores de preço vivem no ambiente, não no código: são
 * diferentes entre o modo de teste e o de produção, e mudam sempre que o
 * cliente cria um preço novo no Stripe.
 */
export function priceIds(market: MarketCode): Record<BillingInterval, string> {
  return market === "BR"
    ? {
        month: process.env.STRIPE_PRICE_PRO_MONTH_BRL ?? "",
        year: process.env.STRIPE_PRICE_PRO_YEAR_BRL ?? "",
      }
    : {
        month: process.env.STRIPE_PRICE_PRO_MONTH_EUR ?? "",
        year: process.env.STRIPE_PRICE_PRO_YEAR_EUR ?? "",
      };
}

/**
 * O desconto dos fundadores é diferente conforme o período, por isso são dois
 * cupões distintos no Stripe — o código único é nosso, não deles.
 */
export function foundersCouponId(interval: BillingInterval): string {
  return interval === "year"
    ? (process.env.STRIPE_COUPON_FOUNDERS_YEAR ?? "")
    : (process.env.STRIPE_COUPON_FOUNDERS_MONTH ?? "");
}

/** Percentagem de desconto de cada período, lida ao Stripe. */
export async function fetchFoundersDiscounts(): Promise<
  Partial<Record<BillingInterval, number>>
> {
  const entradas = await Promise.allSettled(
    (["month", "year"] as BillingInterval[]).map(async (interval) => {
      const id = foundersCouponId(interval);
      if (!id) return null;
      const cupao = await stripe().coupons.retrieve(id);
      return cupao.valid && cupao.percent_off
        ? ([interval, cupao.percent_off] as const)
        : null;
    }),
  );

  const saida: Partial<Record<BillingInterval, number>> = {};
  for (const e of entradas) {
    if (e.status === "fulfilled" && e.value) saida[e.value[0]] = e.value[1];
  }
  return saida;
}

export type PriceView = {
  id: string;
  interval: BillingInterval;
  amount: number;
  currency: string;
  /** Já formatado no idioma do utilizador. */
  formatted: string;
};

/**
 * Lê os preços ao próprio Stripe em vez de os repetir no código. Assim a
 * página nunca anuncia um valor diferente do que vai ser cobrado — que é o
 * tipo de divergência que só se descobre com um cliente irritado.
 */
export async function fetchPrices(
  market: MarketCode,
  intlLocale: string,
): Promise<PriceView[]> {
  const ids = priceIds(market);
  const pedidos = (Object.entries(ids) as [BillingInterval, string][])
    .filter(([, id]) => id)
    .map(async ([interval, id]) => {
      const preco = await stripe().prices.retrieve(id);
      const amount = (preco.unit_amount ?? 0) / 100;
      return {
        id,
        interval,
        amount,
        currency: preco.currency.toUpperCase(),
        formatted: new Intl.NumberFormat(intlLocale, {
          style: "currency",
          currency: preco.currency.toUpperCase(),
        }).format(amount),
      } satisfies PriceView;
    });

  const resultados = await Promise.allSettled(pedidos);

  for (const r of resultados) {
    if (r.status === "rejected") {
      // A mensagem do Stripe diz sempre porquê: preço inexistente, chave do
      // modo errado, ou permissões a menos numa chave restrita.
      console.error("[stripe] falha a ler preço:", (r.reason as Error)?.message);
    }
  }

  return resultados
    .filter(
      (r): r is PromiseFulfilledResult<PriceView> => r.status === "fulfilled",
    )
    .map((r) => r.value)
    .sort((a, b) => (a.interval === "month" ? -1 : 1) - (b.interval === "month" ? -1 : 1));
}
