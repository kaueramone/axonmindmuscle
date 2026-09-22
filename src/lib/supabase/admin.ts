import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * Cliente com a chave de service role — passa ao lado do RLS.
 *
 * Usado no webhook Stripe e nas operações de atribuição de afiliados sem
 * sessão. As mutações de administração usam RPCs com a sessão do admin.
 * Nunca importar a partir de código que corra no browser.
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
