import "server-only";

import { NextResponse } from "next/server";

import type { createClient } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** As acoes que a funcao `consume_rate_limit` conhece. Os tetos vivem la. */
export type AcaoLimitada = "exportar" | "relatorio";

/**
 * Consome uma unidade do limite de pedidos da pessoa e devolve a resposta 429
 * quando o teto foi atingido — ou `null` quando o pedido pode seguir.
 *
 * O contador vive em Postgres e nao em memoria porque cada pedido na Vercel
 * pode cair noutra instancia: um contador em memoria conta ate um e recomeca.
 * Nao ha servico novo nisto — e a base de dados que ja existe.
 *
 * Nem o balde nem o teto vem daqui: a funcao deriva o balde de `auth.uid()` e
 * tem os limites escritos por dentro. Assim, quem chamar o RPC diretamente
 * pelo REST nao consegue escolher o seu proprio teto nem gastar a quota de
 * outra pessoa.
 */
export async function limitarPedidos(
  supabase: Cliente,
  acao: AcaoLimitada,
): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc("consume_rate_limit", { p_acao: acao });

  if (error) {
    // Falhar aberto e deliberado: um erro no contador nao deve tirar a uma
    // pessoa o direito de exportar os seus proprios dados. Fica registado o
    // nome da acao, nunca o identificador de quem a pediu.
    console.error("[limite] contador indisponível", acao, error.message);
    return null;
  }

  const veredito = Array.isArray(data) ? data[0] : data;
  if (!veredito || veredito.permitido) return null;

  const segundos = Math.max(1, Number(veredito.repetir_em) || 60);

  return NextResponse.json(
    { error: "limite", repetir_em: segundos },
    {
      status: 429,
      headers: {
        "retry-after": String(segundos),
        "cache-control": "no-store",
      },
    },
  );
}
