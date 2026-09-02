"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/**
 * Consentimento explícito para o questionário de prontidão.
 *
 * O questionário guarda dados de saúde (batimento em repouso, sono, dores),
 * e a base legal é o consentimento explícito. As duas operações passam por
 * funções da base de dados que também protegem a coluna contra escrita
 * direta; aqui só se chama e se devolve o resultado. Retirar apaga o
 * histórico de prontidão inteiro na mesma transação — não existe "desligar e
 * ficar com os dados".
 */

export type ConsentResult =
  | { ok: true; consentAt: string | null; deleted?: number }
  | { ok: false };

export async function grantReadinessConsentAction(): Promise<ConsentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data, error } = await supabase.rpc("aceitar_consentimento_prontidao");
  if (error || !data) return { ok: false };

  revalidatePath("/", "layout");
  return { ok: true, consentAt: data };
}

export async function withdrawReadinessConsentAction(): Promise<ConsentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data, error } = await supabase.rpc("retirar_consentimento_prontidao");
  if (error) return { ok: false };

  revalidatePath("/", "layout");
  return { ok: true, consentAt: null, deleted: Number(data ?? 0) };
}
