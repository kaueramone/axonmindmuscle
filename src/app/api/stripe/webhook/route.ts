import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums } from "@/lib/supabase/types";

/**
 * Webhook do Stripe.
 *
 * É esta rota — e só esta — que muda o plano de alguém. O redirect de
 * sucesso do checkout não serve: o utilizador pode fechar o separador
 * depois de pagar e nunca lá chegar.
 *
 * Três invariantes:
 *  1. O corpo é lido em cru. Qualquer parse antes da verificação invalida
 *     a assinatura.
 *  2. Cada evento é processado uma vez. O Stripe reenvia por desenho.
 *  3. Respondemos 200 a tudo o que percebemos, mesmo que ignoremos. Um erro
 *     devolvido faz o Stripe reenviar em backoff durante dias.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENTOS_DE_SUBSCRICAO = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

function toStatus(s: string): Enums<"subscription_status"> {
  const conhecidos: Enums<"subscription_status">[] = [
    "trialing", "active", "past_due", "canceled",
    "incomplete", "incomplete_expired", "unpaid", "paused",
  ];
  return conhecidos.includes(s as Enums<"subscription_status">)
    ? (s as Enums<"subscription_status">)
    : "incomplete";
}

function segundosParaIso(v: number | null | undefined): string | null {
  return v ? new Date(v * 1000).toISOString() : null;
}

export async function POST(request: NextRequest) {
  const assinatura = request.headers.get("stripe-signature");
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;

  if (!assinatura || !segredo) {
    return NextResponse.json({ error: "assinatura em falta" }, { status: 400 });
  }

  const corpo = await request.text();

  let evento: Stripe.Event;
  try {
    evento = stripe().webhooks.constructEvent(corpo, assinatura, segredo);
  } catch {
    // Assinatura inválida: não é o Stripe, ou o segredo está errado.
    return NextResponse.json({ error: "assinatura inválida" }, { status: 400 });
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (erro) {
    // Configuração em falta. 500 sem rastilho: o Stripe volta a tentar.
    console.error("[stripe] cliente de administração indisponível", erro);
    return NextResponse.json({ error: "configuração incompleta" }, { status: 500 });
  }

  // Idempotência: a chave primária faz o trabalho. Se já lá estava, este
  // evento é uma repetição e não voltamos a processá-lo.
  const { error: erroEvento } = await supabase
    .from("stripe_events")
    .insert({ id: evento.id, type: evento.type });

  if (erroEvento) {
    if (erroEvento.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Não conseguimos garantir o processamento único: melhor o Stripe
    // reenviar do que arriscar processar duas vezes sem registo.
    return NextResponse.json({ error: "registo do evento falhou" }, { status: 500 });
  }

  try {
    if (EVENTOS_DE_SUBSCRICAO.has(evento.type)) {
      const sub = evento.data.object as Stripe.Subscription;
      const item = sub.items.data[0];

      // O utilizador vem dos metadados que pusemos no checkout; se faltarem,
      // procuramos pelo identificador de cliente já guardado no perfil.
      let userId: string | null = sub.metadata?.user_id ?? null;
      if (!userId) {
        const { data: perfil } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", String(sub.customer))
          .maybeSingle();
        userId = perfil?.id ?? null;
      }

      if (!userId) {
        // Sem dono não há nada a escrever. Respondemos 200 na mesma: reenviar
        // não vai fazer aparecer um utilizador.
        return NextResponse.json({ received: true, ignored: "sem utilizador" });
      }

      const dono: string = userId;

      const periodo =
        segundosParaIso(item?.current_period_end) ??
        segundosParaIso(
          (sub as unknown as { current_period_end?: number }).current_period_end,
        );

      // O código dos fundadores gasta-se aqui, quando a subscrição existe
      // mesmo — e não quando o checkout abre, senão bastava abandonar o
      // pagamento para o queimar.
      const codigoFundadores = sub.metadata?.founders_code;
      if (evento.type === "customer.subscription.created" && codigoFundadores) {
        await supabase.from("coupon_redemptions").upsert(
          {
            user_id: dono,
            code: codigoFundadores,
            subscription_id: sub.id,
            coupon_id: sub.discounts?.[0]
              ? String(
                  typeof sub.discounts[0] === "string"
                    ? sub.discounts[0]
                    : (sub.discounts[0] as { coupon?: { id?: string } }).coupon?.id,
                )
              : null,
          },
          { onConflict: "user_id,code", ignoreDuplicates: true },
        );
      }

      await supabase.from("subscriptions").upsert(
        {
          id: sub.id,
          user_id: dono,
          customer_id: String(sub.customer),
          status:
            evento.type === "customer.subscription.deleted"
              ? "canceled"
              : toStatus(sub.status),
          price_id: item?.price?.id ?? null,
          currency: item?.price?.currency ?? null,
          interval: item?.price?.recurring?.interval ?? null,
          cancel_at_period_end: Boolean(sub.cancel_at_period_end),
          current_period_end: periodo,
          trial_end: segundosParaIso(sub.trial_end),
        },
        { onConflict: "id" },
      );
    }

    if (evento.type === "checkout.session.completed") {
      const sessao = evento.data.object as Stripe.Checkout.Session;
      const userId = sessao.metadata?.user_id;

      // Guardamos o cliente no perfil para que a próxima compra reaproveite
      // o mesmo registo no Stripe em vez de criar um duplicado.
      if (userId && sessao.customer) {
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: String(sessao.customer) })
          .eq("id", userId);
      }
    }
  } catch (erro) {
    // O evento já está registado, portanto uma repetição do Stripe seria
    // ignorada. Apagamo-lo para que o reenvio volte a ser processado.
    await supabase.from("stripe_events").delete().eq("id", evento.id);
    console.error("[stripe] falha a processar", evento.type, erro);
    return NextResponse.json({ error: "processamento falhou" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
