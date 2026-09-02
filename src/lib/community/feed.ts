import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import {
  BUCKET_MURAL,
  PAGINA,
  type MediaView,
  type PostView,
  type WorkoutSummary,
} from "@/lib/community/shared";

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
    // Numa unica linha, e nao partida com `+`: o cliente do Supabase deriva os
    // tipos da string em tempo de compilacao, e uma concatenacao deixa de ser
    // um literal - tudo o que sai da consulta passa a `unknown`.
    .select(
      "id, body, created_at, like_count, reply_count, author_id, workout_session_id, media_kind, media_path, media_preview_path, media_width, media_height, workout_summary",
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
    // A vista pública, e não a tabela: `profiles` só é legível pelo próprio,
    // e é assim que deve ficar — tem peso, nascimento e cliente do Stripe.
    supabase
      .from("perfis_publicos")
      .select("id, display_name, handle, avatar_url, avatar_kind, avatar_seed")
      .in("id", autores),
    supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", ids),
  ]);

  const porAutor = new Map((perfis ?? []).map((p) => [p.id, p]));

  // O URL público é construído aqui e não guardado na base de dados: o
  // domínio do Storage muda se o projeto mudar, e um URL gravado numa linha
  // sobrevive à mudança a apontar para o sítio errado.
  const publico = (caminho: string) =>
    supabase.storage.from(BUCKET_MURAL).getPublicUrl(caminho).data.publicUrl;
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
        avatarKind: p?.avatar_kind ?? "photo",
        avatarSeed: p?.avatar_seed ?? null,
      },
      media:
        l.media_kind && l.media_path && l.media_preview_path
          ? ({
              kind: l.media_kind as MediaView["kind"],
              url: publico(l.media_preview_path),
              fullUrl: publico(l.media_path),
              largura: l.media_width ?? 0,
              altura: l.media_height ?? 0,
            } satisfies MediaView)
          : null,
      gostei: gostados.has(l.id),
      meu: l.author_id === userId,
      doTreino: l.workout_session_id != null || l.workout_summary != null,
      treino: lerResumo(l.workout_summary),
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

/**
 * O JSON da coluna é de confiança — foi escrito pela acção de partilha, no
 * servidor — mas a forma é verificada na mesma: uma linha antiga com outra
 * versão do resumo não pode partir o feed inteiro.
 */
function lerResumo(bruto: unknown): WorkoutSummary | null {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return null;
  const r = bruto as Record<string, unknown>;
  if (r.v !== 1) return null;
  return r as WorkoutSummary;
}

/** Posts de uma pessoa, para a página de perfil. Mesma forma do feed. */
export async function lerPostsDoAutor(
  supabase: Cliente,
  userId: string,
  autorId: string,
  antesDe?: string,
): Promise<PostView[]> {
  let consulta = supabase
    .from("posts")
    .select(
      "id, body, created_at, like_count, reply_count, author_id, workout_session_id, media_kind, media_path, media_preview_path, media_width, media_height, workout_summary",
    )
    .eq("author_id", autorId)
    .is("deleted_at", null)
    .is("hidden_at", null)
    .is("reply_to", null)
    .order("created_at", { ascending: false })
    .limit(PAGINA);
  if (antesDe) consulta = consulta.lt("created_at", antesDe);

  const { data: linhas, error } = await consulta;
  if (error || !linhas || linhas.length === 0) return [];

  const [{ data: perfil }, { data: gostos }] = await Promise.all([
    supabase
      .from("perfis_publicos")
      .select("id, display_name, handle, avatar_url, avatar_kind, avatar_seed")
      .eq("id", autorId)
      .maybeSingle(),
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in(
        "post_id",
        linhas.map((l) => l.id),
      ),
  ]);

  const publico = (caminho: string) =>
    supabase.storage.from(BUCKET_MURAL).getPublicUrl(caminho).data.publicUrl;
  const gostados = new Set((gostos ?? []).map((g) => g.post_id));

  return linhas.map((l) => ({
    id: l.id,
    body: l.body,
    createdAt: l.created_at,
    likeCount: l.like_count,
    replyCount: l.reply_count,
    autor: {
      id: autorId,
      nome: perfil?.display_name?.trim() || (perfil?.handle ? `@${perfil.handle}` : "—"),
      handle: perfil?.handle ?? null,
      avatarUrl: perfil?.avatar_url ?? null,
      avatarKind: perfil?.avatar_kind ?? "photo",
      avatarSeed: perfil?.avatar_seed ?? null,
    },
    media:
      l.media_kind && l.media_path && l.media_preview_path
        ? ({
            kind: l.media_kind as MediaView["kind"],
            url: publico(l.media_preview_path),
            fullUrl: publico(l.media_path),
            largura: l.media_width ?? 0,
            altura: l.media_height ?? 0,
          } satisfies MediaView)
        : null,
    gostei: gostados.has(l.id),
    meu: autorId === userId,
    doTreino: l.workout_session_id != null || l.workout_summary != null,
    treino: lerResumo(l.workout_summary),
  }));
}
