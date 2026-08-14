import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/types";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Tem de ser criado por pedido — nunca guardar numa variável de módulo.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Chamado a partir de um Server Component: a atualização de sessão
            // é feita pelo middleware, por isso o erro pode ser ignorado.
          }
        },
      },
    },
  );
}
