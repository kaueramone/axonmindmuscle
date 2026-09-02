import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import {
  BUCKET_MURAL,
  PAGINA,
  type AutorView,
  type MediaView,
  type NotificacaoView,
  type PostView,
  type WorkoutSummary,
} from "@/lib/community/shared";

export * from "@/lib/community/shared";

type Cliente = SupabaseClient<Database>;

/**
 * Numa unica linha, e nao partida com `+`: o cliente do Supabase deriva os
 * tipos da string em tempo de compilacao, e uma concatenacao deixa de ser um
 * literal - tudo o que sai da consulta passa a `unknown`.
 */
const COLUNAS =
  "id, body, created_at, like_count, reply_count, author_id, reply_to, root_id, workout_session_id, media_kind, media_path, media_preview_path, media_width, media_height, workout_summary";

type Linha = {
  id: string;
  body: string;
  created_at: string;
  like_count: number;
  reply_count: number;
  author_id: string;
  reply_to: string | null;
  root_id: string | null;
  workout_session_id: string | null;
  media_kind: string | null;
  media_path: string | null;
  media_preview_path: string | null;
  media_width: number | null;
  media_height: number | null;
  workout_summary: unknown;
};

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
    .select(COLUNAS)
    .is("deleted_at", null)
    .is("hidden_at", null)
    // Só o que está no topo do fio; as respostas vivem na página do fio.
    .is("reply_to", null)
    .order("created_at", { ascending: false })
    .limit(PAGINA);

  if (antesDe) consulta = consulta.lt("created_at", antesDe);

  const { data: linhas, error } = await consulta;
  if (error) {
    console.error("[comunidade] falha a ler o feed:", error.message);
    return [];
  }
  return montar(supabase, userId, linhas ?? []);
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
    .select(COLUNAS)
    .eq("author_id", autorId)
    .is("deleted_at", null)
    .is("hidden_at", null)
    .is("reply_to", null)
    .order("created_at", { ascending: false })
    .limit(PAGINA);
  if (antesDe) consulta = consulta.lt("created_at", antesDe);

  const { data: linhas, error } = await consulta;
  if (error || !linhas) return [];
  return montar(supabase, userId, linhas);
}

/**
 * Um fio inteiro: o post de topo e todas as respostas por baixo dele, por
 * ordem cronológica. `root_id` é escrito pelo gatilho `set_post_root`, por
 * isso uma consulta chega, seja qual for a profundidade.
 *
 * Devolve null quando o post não existe ou não é visível a quem pergunta.
 */
export async function lerFio(
  supabase: Cliente,
  userId: string,
  postId: string,
): Promise<{ raiz: PostView; respostas: PostView[] } | null> {
  const { data: pedido } = await supabase
    .from("posts")
    .select("id, root_id")
    .eq("id", postId)
    .maybeSingle();
  if (!pedido) return null;

  const raizId = pedido.root_id ?? pedido.id;

  const [{ data: raizLinha }, { data: respostasLinhas }] = await Promise.all([
    supabase.from("posts").select(COLUNAS).eq("id", raizId).maybeSingle(),
    supabase
      .from("posts")
      .select(COLUNAS)
      .eq("root_id", raizId)
      .is("deleted_at", null)
      .is("hidden_at", null)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);
  if (!raizLinha) return null;

  const vistas = await montar(supabase, userId, [raizLinha, ...(respostasLinhas ?? [])]);
  return { raiz: vistas[0], respostas: vistas.slice(1) };
}

/** Perfis públicos dos autores e o handle de quem se responde, num só passo. */
async function montar(supabase: Cliente, userId: string, linhas: Linha[]): Promise<PostView[]> {
  if (linhas.length === 0) return [];

  const ids = linhas.map((l) => l.id);
  const pais = [...new Set(linhas.map((l) => l.reply_to).filter((x): x is string => !!x))];
  const paisEmFalta = pais.filter((p) => !ids.includes(p));

  // Os autores dos pais que não estão nesta lista: para dizer "a responder a
  // @fulano" mesmo quando o pai é outra página.
  const { data: paisLinhas } = paisEmFalta.length
    ? await supabase.from("posts").select("id, author_id").in("id", paisEmFalta)
    : { data: [] as { id: string; author_id: string }[] };

  const autorDoPai = new Map<string, string>();
  for (const l of linhas) autorDoPai.set(l.id, l.author_id);
  for (const p of paisLinhas ?? []) autorDoPai.set(p.id, p.author_id);

  const autores = [...new Set([...linhas.map((l) => l.author_id), ...autorDoPai.values()])];

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
  const gostados = new Set((gostos ?? []).map((g) => g.post_id));

  // O URL público é construído aqui e não guardado na base de dados: o
  // domínio do Storage muda se o projeto mudar, e um URL gravado numa linha
  // sobrevive à mudança a apontar para o sítio errado.
  const publico = (caminho: string) =>
    supabase.storage.from(BUCKET_MURAL).getPublicUrl(caminho).data.publicUrl;

  const autor = (id: string): AutorView => {
    const p = porAutor.get(id);
    return {
      id,
      // Quem nunca preencheu o nome aparece pelo @, que existe sempre.
      nome: p?.display_name?.trim() || (p?.handle ? `@${p.handle}` : "—"),
      handle: p?.handle ?? null,
      avatarUrl: p?.avatar_url ?? null,
      avatarKind: p?.avatar_kind ?? "photo",
      avatarSeed: p?.avatar_seed ?? null,
    };
  };

  return linhas.map((l) => {
    const paiAutor = l.reply_to ? autorDoPai.get(l.reply_to) : undefined;
    return {
      id: l.id,
      body: l.body,
      createdAt: l.created_at,
      likeCount: l.like_count,
      replyCount: l.reply_count,
      autor: autor(l.author_id),
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
      replyTo: l.reply_to,
      rootId: l.root_id,
      replyToHandle: paiAutor ? (porAutor.get(paiAutor)?.handle ?? null) : null,
    } satisfies PostView;
  });
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

/** Quantas pessoas estiveram na aplicação nos últimos cinco minutos. */
export async function lerOnline(supabase: Cliente): Promise<number> {
  const { data, error } = await supabase.rpc("comunidade_online");
  if (error) {
    console.error("[comunidade] falha a contar online:", error.message);
    return 0;
  }
  return data ?? 0;
}

/* -------------------------------------------------------------------------
 * Notificações.
 * ---------------------------------------------------------------------- */

export async function contarNaoLidas(supabase: Cliente, userId: string): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

/**
 * As últimas notificações, com quem fez o quê e um excerto do post. O post
 * pode já não estar visível (escondido, apagado): a linha fica sem excerto e
 * sem ligação, mas não desaparece — a pessoa saberia que algo lhe faltava.
 */
export async function lerNotificacoes(
  supabase: Cliente,
  userId: string,
): Promise<NotificacaoView[]> {
  const { data: linhas, error } = await supabase
    .from("notifications")
    .select("id, actor_id, tipo, post_id, created_at, read_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !linhas || linhas.length === 0) return [];

  const atores = [...new Set(linhas.map((l) => l.actor_id).filter((x): x is string => !!x))];
  const posts = [...new Set(linhas.map((l) => l.post_id).filter((x): x is string => !!x))];

  const [{ data: perfis }, { data: excertos }] = await Promise.all([
    atores.length
      ? supabase
          .from("perfis_publicos")
          .select("id, display_name, handle, avatar_url, avatar_kind, avatar_seed")
          .in("id", atores)
      : { data: [] },
    posts.length
      ? supabase
          .from("posts")
          .select("id, body, workout_summary, media_path")
          .in("id", posts)
          .is("deleted_at", null)
          .is("hidden_at", null)
      : { data: [] },
  ]);

  const porAtor = new Map((perfis ?? []).map((p) => [p.id, p]));
  const porPost = new Map((excertos ?? []).map((p) => [p.id, p]));

  return linhas.map((l) => {
    const p = l.actor_id ? porAtor.get(l.actor_id) : undefined;
    const post = l.post_id ? porPost.get(l.post_id) : undefined;
    const excerto = post
      ? post.body.trim() || (post.workout_summary ? "🏋" : post.media_path ? "📷" : "")
      : null;
    return {
      id: l.id,
      tipo: l.tipo,
      createdAt: l.created_at,
      lida: l.read_at != null,
      ator: p
        ? {
            id: p.id,
            nome: p.display_name?.trim() || (p.handle ? `@${p.handle}` : "—"),
            handle: p.handle,
            avatarUrl: p.avatar_url,
            avatarKind: p.avatar_kind,
            avatarSeed: p.avatar_seed,
          }
        : null,
      postId: post ? post.id : null,
      excerto: excerto ? excerto.slice(0, 80) : null,
    } satisfies NotificacaoView;
  });
}
