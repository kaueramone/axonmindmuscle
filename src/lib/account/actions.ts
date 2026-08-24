"use server";

import { revalidatePath } from "next/cache";

import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export type AccountResult = { ok: boolean; error?: string };

/**
 * Pedido para apagar a conta, com três meses de prazo.
 *
 * O prazo não é hesitação: é para que a pessoa possa exportar o histórico
 * depois de decidir sair, e possa voltar atrás se se arrepender. Quem carrega
 * neste botão em cima de uma discussão no ginásio não devia perder quatro anos
 * de treino nesse segundo.
 */
export async function requestAccountDeletionAction(): Promise<AccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sessao" };

  // Cancelar a subscrição primeiro. Uma conta marcada para apagar que continua
  // a ser cobrada é a pior combinação possível: a pessoa já se despediu do
  // produto e o cartão continua a pagá-lo.
  const { data: subscricao } = await supabase
    .from("subscriptions")
    .select("id, cancel_at_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscricao && !subscricao.cancel_at_period_end) {
    try {
      await stripe().subscriptions.update(subscricao.id, {
        cancel_at_period_end: true,
      });
    } catch (erro) {
      // Não marcamos a conta se o pagamento não pôde ser travado: seria
      // prometer uma saída e deixar a cobrança de pé.
      console.error("[conta] falha a cancelar subscrição", erro);
      return { ok: false, error: "subscricao" };
    }
  }

  const { error } = await supabase.rpc("request_account_deletion");
  if (error) {
    console.error("[conta] falha a marcar eliminação", error.message);
    return { ok: false, error: "generico" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Recuo. A subscrição não é reposta — quem quiser voltar a assinar passa
 * outra vez pelos planos, e é bom que passe: o preço pode ter mudado.
 */
export async function cancelAccountDeletionAction(): Promise<AccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sessao" };

  const { error } = await supabase.rpc("cancel_account_deletion");
  if (error) {
    console.error("[conta] falha a anular eliminação", error.message);
    return { ok: false, error: "generico" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
