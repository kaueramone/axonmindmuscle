import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import { PAGINA, type PostView } from "@/lib/community/shared";

export * from "@/lib/community/shared";

type Cliente = SupabaseClient<Database>;


/**
 * Lê uma página do feed.
 *
 * Três consultas em vez de um join encaixado: o cliente do Supabase deduz os
 * joins a partir das relações declaradas nos tipos, e essa dedução parte-se
 * em silêncio sempre que alguém renomeia uma chave estrangeira. Três leituras
 * por chave primária custam menos do que um bug que só aparece em produção.
 */
export async function lerFeed(
  supabase: Cliente,
  userId: string,
  antesDe?: string,
): Promise<PostView[]> {
  let consulta = supabase
    .from("posts")
    .select(
      "id, body, created_at, like_count, reply_count, author_id, workout_session_id",
    )
    .is("deleted_at", null)
    .is("hidden_at", null)
    // Fase 1: só o que está no topo do fio. As respostas já são gravadas com
    // reply_to, mas ainda não há ecrã que as mostre.
    .is("reply_to", null)
    .order("created_at", { ascending: false })
    .limit(PAGINA);

  if (antesDe) consulta = consulta.lt("created_at", antesDe);

  const { data: linhas, error } = await consulta;
  if (error) {
    console.error("[comunidade] falha a ler o feed:", error.message);
    return [];
  }
  if (!linhas || linhas.length === 0) return [];

  const autores = [...new Set(linhas.map((l) => l.author_id))];
  const ids = linhas.map((l) => l.id);

  const [{ data: perfis }, { data: gostos }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, handle, avatar_url")
      .in("id", autores),
    supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", ids),
  ]);

  const porAutor = new Map((perfis ?? []).map((p) => [p.id, p]));
  const gostados = new Set((gostos ?? []).map((g) => g.post_id));

  return linhas.map((l) => {
    const p = porAutor.get(l.author_id);
    return {
      id: l.id,
      body: l.body,
      createdAt: l.created_at,
      likeCount: l.like_count,
      replyCount: l.reply_count,
      autor: {
        id: l.author_id,
        // Quem nunca preencheu o nome aparece pelo @, que existe sempre.
        nome: p?.display_name?.trim() || (p?.handle ? `@${p.handle}` : "—"),
        handle: p?.handle ?? null,
        avatarUrl: p?.avatar_url ?? null,
      },
      gostei: gostados.has(l.id),
      meu: l.author_id === userId,
      doTreino: l.workout_session_id != null,
    } satisfies PostView;
  });
}

/** Quantas pessoas estiveram na aplicação nos últimos cinco minutos. */
export async function lerOnline(supabase: Cliente): Promise<number> {
  const { data, error } = await supabase.rpc("comunidade_online");
  if (error) {
    console.error("[comunidade] falha a contar online:", error.message);
    return 0;
  }
  return data ?? 0;
}
