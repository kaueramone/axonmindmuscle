import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * Cliente com a chave de service role — passa ao lado do RLS.
 *
 * Existe por uma razão só: o webhook do Stripe chega sem sessão de
 * utilizador e tem de escrever na tabela de subscrições. Não o importes em
 * mais lado nenhum, e nunca a partir de código que corra no browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chave) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY em falta. O webhook do Stripe não consegue escrever sem ela.",
    );
  }

  return createClient<Database>(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
