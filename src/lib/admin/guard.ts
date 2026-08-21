import { redirect } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/utils";

/**
 * Porta de entrada do painel. Devolve o cliente e o utilizador apenas quando
 * o perfil tem papel de administrador; caso contrário devolve o visitante ao
 * sítio de onde veio. A verificação é feita no servidor em cada pedido — o
 * RLS da base de dados é a segunda linha, não a primeira.
 */
export async function requireAdmin(locale: Locale) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Absoluto de propósito: no subdomínio painel. um caminho relativo
  // manteria o visitante do lado errado do domínio.
  if (!user) redirect(`${SITE_URL}${route(locale, "signIn")}`);

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.role !== "admin") redirect(`${SITE_URL}${route(locale, "today")}`);

  return { supabase, user, perfil };
}
