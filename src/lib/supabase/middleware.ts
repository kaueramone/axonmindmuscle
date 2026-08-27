import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/types";

/**
 * Atualiza a sessão do Supabase e devolve o utilizador autenticado.
 * A resposta devolvida transporta os cookies renovados e tem de ser a
 * resposta final (ou ter os cookies copiados para ela).
 */
export async function updateSession(
  request: NextRequest,
  /**
   * Cabeçalhos a acrescentar ao pedido antes de ele chegar ao renderizador.
   * É por aqui que entram o `nonce` e a política de conteúdo: o Next lê o
   * `content-security-policy` do pedido para carimbar os seus próprios
   * scripts com o mesmo `nonce`.
   */
  extra?: Record<string, string>,
) {
  /**
   * Reconstruído a cada chamada, e não guardado numa variável: o Supabase
   * escreve os cookies renovados em `request.cookies` e só uma cópia feita
   * depois disso os leva consigo. Uma cópia tirada no início entregava ao
   * renderizador a sessão antiga.
   */
  const init = () => {
    const headers = new Headers(request.headers);
    for (const [nome, valor] of Object.entries(extra ?? {})) {
      headers.set(nome, valor);
    }
    return { request: { headers } };
  };

  let response = NextResponse.next(init());

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next(init());
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
