"use server";

import { revalidatePath } from "next/cache";

import { LIMITE_CARACTERES } from "@/lib/community/shared";
import { createClient } from "@/lib/supabase/server";
import type { ReportReason } from "@/lib/supabase/types";

/**
 * As acções da comunidade devolvem sempre uma chave curta e nunca uma frase: é
 * o componente que traduz, e o mesmo erro tem de sair em pt-PT e em pt-BR.
 */
export type ComunidadeResult = { ok: boolean; error?: string };

const MOTIVOS_VALIDOS: ReportReason[] = ["spam", "abuso", "perigoso", "outro"];

/**
 * Publica no mural.
 *
 * Quem pode escrever é decidido pela função `pode_publicar()` na base de
 * dados, e é essa a verdade: a política de RLS chama-a em cada inserção. A
 * verificação daqui existe só para dar uma mensagem decente em vez de um erro
 * de base de dados — não é ela que protege nada.
 */
export async function publicarAction(formData: FormData): Promise<ComunidadeResult> {
  const corpo = String(formData.get("body") ?? "").trim();
  const media = lerMedia(formData);

  // Uma fotografia sem legenda é uma publicação legítima. Texto vazio só é
  // erro quando não vem mais nada com ele.
  if (corpo.length === 0 && !media) return { ok: false, error: "vazio" };
  if (corpo.length > LIMITE_CARACTERES) return { ok: false, error: "longo" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sessao" };

  const limite = await consumir(supabase, "publicar");
  if (limite) return limite;

  // O caminho tem de estar na pasta de quem publica. A política de RLS diz o
  // mesmo e é ela que manda; isto existe para o erro ser compreensível.
  if (media && !media.path.startsWith(`${user.id}/`)) {
    return { ok: false, error: "generico" };
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      body: corpo,
      ...(media
        ? {
            media_kind: media.kind,
            media_path: media.path,
            media_preview_path: media.previewPath,
            media_width: media.largura,
            media_height: media.altura,
          }
        : {}),
    })
    .select("id")
    .single();

  if (error) {
    // 42501 é a recusa do RLS: aqui só pode ser o plano.
    if (error.code === "42501") return { ok: false, error: "plano" };
    console.error("[comunidade] falha a publicar:", error.message);
    return { ok: false, error: "generico" };
  }

  await guardarMencoes(supabase, post.id, corpo);

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Reagir é a única coisa que o plano gratuito pode fazer no mural. Sem isto a
 * comunidade seria um jornal: uns escrevem, os outros olham.
 */
export async function alternarGostoAction(
  postId: string,
  gostar: boolean,
): Promise<ComunidadeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sessao" };

  const limite = await consumir(supabase, "reagir");
  if (limite) return limite;

  const { error } = gostar
    ? await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id })
    : await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

  // Reagir duas vezes ao mesmo post é sempre o mesmo dedo a bater duas vezes,
  // nunca um erro que valha a pena mostrar.
  if (error && error.code !== "23505") {
    console.error("[comunidade] falha a reagir:", error.message);
    return { ok: false, error: "generico" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Apagar marca a data e não retira a linha. O fio de respostas por baixo de um
 * post apagado continua a fazer sentido, e há o que rever se a decisão for
 * contestada. A política de RLS só deixa mexer no que é da própria pessoa.
 */
export async function apagarPostAction(postId: string): Promise<ComunidadeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sessao" };

  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) {
    console.error("[comunidade] falha a apagar:", error.message);
    return { ok: false, error: "generico" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Denunciar. Vai para a fila do painel; não esconde nada por si só. */
export async function denunciarPostAction(
  postId: string,
  motivo: string,
): Promise<ComunidadeResult> {
  if (!MOTIVOS_VALIDOS.includes(motivo as ReportReason)) {
    return { ok: false, error: "generico" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sessao" };

  const limite = await consumir(supabase, "denunciar");
  if (limite) return limite;

  const { error } = await supabase.from("post_reports").insert({
    post_id: postId,
    reporter_id: user.id,
    motivo: motivo as ReportReason,
  });

  // Já tinha denunciado este post: para quem denuncia, o resultado é o mesmo.
  if (error && error.code !== "23505") {
    console.error("[comunidade] falha a denunciar:", error.message);
    return { ok: false, error: "generico" };
  }

  return { ok: true };
}

/**
 * Marca presença. Chamada uma vez por visita à comunidade — é isto que
 * alimenta o "online agora" sem nenhuma ligação permanente aberta.
 */
export async function tocarPresencaAction(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("tocar_presenca");
  if (error) console.error("[comunidade] falha a marcar presença:", error.message);
}

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** Devolve o erro quando o limite foi ultrapassado, ou null para seguir. */
async function consumir(
  supabase: Cliente,
  acao: "publicar" | "reagir" | "denunciar",
): Promise<ComunidadeResult | null> {
  const { data, error } = await supabase.rpc("consume_rate_limit", { p_acao: acao });

  // Falha aberta, de propósito: se o contador em si estiver em baixo, não é o
  // utilizador que paga por isso. Fica registada a acção e nunca quem a fez.
  if (error) {
    console.error("[comunidade] limite indisponível:", acao, error.message);
    return null;
  }

  return data?.[0]?.permitido === false ? { ok: false, error: "limite" } : null;
}

/**
 * Extrai os @ do texto e grava-os.
 *
 * Guardados em vez de procurados: encontrar '@nome' dentro do corpo a cada
 * leitura obrigaria a varrer a tabela toda. É também o que faz nascer a
 * notificação, por gatilho — o cliente nunca escreve nesta tabela para não
 * poder mencionar-se a si próprio nos posts dos outros.
 */
async function guardarMencoes(supabase: Cliente, postId: string, corpo: string) {
  const nomes = [...corpo.matchAll(/@([a-z0-9_]{3,20})/gi)].map((m) =>
    m[1].toLowerCase(),
  );
  const unicos = [...new Set(nomes)].slice(0, 10);
  if (unicos.length === 0) return;

  const { data: perfis } = await supabase
    .from("profiles")
    .select("id, handle")
    .in("handle", unicos);

  if (!perfis || perfis.length === 0) return;

  const { error } = await supabase
    .from("post_mentions")
    .insert(perfis.map((p) => ({ post_id: postId, user_id: p.id })));

  // Uma menção falhada não pode levar o post atrás: ele já está publicado.
  if (error) console.error("[comunidade] falha a gravar menções:", error.message);
}

/**
 * Lê os campos da fotografia que o compositor já enviou para o Storage.
 *
 * O upload acontece no browser e o que chega aqui são só caminhos. Nada disto
 * é de confiança — daí a verificação da pasta acima e, por baixo dela, a
 * política de RLS, que é a que não se contorna.
 */
function lerMedia(formData: FormData): {
  kind: "image";
  path: string;
  previewPath: string;
  largura: number;
  altura: number;
} | null {
  const path = String(formData.get("mediaPath") ?? "").trim();
  const previewPath = String(formData.get("mediaPreviewPath") ?? "").trim();
  const largura = Number(formData.get("mediaWidth"));
  const altura = Number(formData.get("mediaHeight"));

  if (!path || !previewPath) return null;
  if (!Number.isInteger(largura) || !Number.isInteger(altura)) return null;
  if (largura < 1 || altura < 1) return null;

  return { kind: "image", path, previewPath, largura, altura };
}
