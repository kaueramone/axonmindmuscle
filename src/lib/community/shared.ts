import type { ReportReason } from "@/lib/supabase/types";

/**
 * O que a comunidade precisa dos dois lados da fronteira.
 *
 * `feed.ts` tem `server-only` no topo, e bem: as leituras não têm nada que
 * fazer no browser. Mas o contador de caracteres do compositor precisa do
 * mesmo limite que o servidor aplica, e importá-lo de lá arrastava o módulo
 * inteiro para o pacote do cliente — que é exactamente o que o `server-only`
 * existe para impedir. Mesmo padrão de `lib/stripe/shared.ts`.
 */
export const LIMITE_CARACTERES = 280;

/** O balde do Storage onde vivem as fotografias do mural. */
export const BUCKET_MURAL = "mural";

/** Quantos posts por página do feed. */
export const PAGINA = 30;

export const MOTIVOS: ReportReason[] = ["spam", "abuso", "perigoso", "outro"];

/** O que o feed precisa de saber sobre quem escreveu. Nada mais do que isto. */
export type AutorView = {
  id: string;
  nome: string;
  handle: string | null;
  avatarUrl: string | null;
  avatarKind: "photo" | "generated";
  avatarSeed: string | null;
};

export type MediaView = {
  kind: "image" | "video";
  /** O que o cartão mostra: a variante leve. */
  url: string;
  /** O que abre ao toque. */
  fullUrl: string;
  largura: number;
  altura: number;
};

/**
 * O resumo de treino guardado dentro do post. Uma cópia do que a pessoa
 * marcou no momento de partilhar: não muda se o treino for apagado depois e
 * nunca contém mais do que foi marcado.
 */
export type WorkoutSummary = {
  v: 1;
  duration_min?: number;
  volume_kg?: number;
  sets?: number;
  exercises?: {
    name: string;
    sets: number;
    best_weight_kg: number | null;
    best_reps: number | null;
    duration_s: number;
  }[];
  records?: { name: string; weight_kg: number; reps: number | null }[];
  readiness?: { score: number; state: "strong" | "moderate" | "rest" };
};

/** As partes do resumo que a pessoa pode escolher partilhar. */
export type ShareChoices = {
  exercises: boolean;
  totals: boolean;
  records: boolean;
  readiness: boolean;
};

export type PostView = {
  id: string;
  body: string;
  createdAt: string;
  likeCount: number;
  replyCount: number;
  autor: AutorView;
  /** Verdadeiro quando a pessoa que está a ver já reagiu a este post. */
  gostei: boolean;
  meu: boolean;
  /** Ligado a um treino: o cartão mostra a proveniência. */
  doTreino: boolean;
  media: MediaView | null;
  /** O treino partilhado, quando o post nasceu no fim de uma sessão. */
  treino: WorkoutSummary | null;
  /** O pai direto, quando é uma resposta; e o topo do fio. */
  replyTo: string | null;
  rootId: string | null;
  /** A quem responde, para o cartão dizer "a responder a @fulano". */
  replyToHandle: string | null;
};

export type NotificacaoView = {
  id: string;
  tipo: "gosto" | "resposta" | "mencao" | "republicacao" | "seguidor";
  createdAt: string;
  lida: boolean;
  ator: AutorView | null;
  /** O post a que diz respeito, quando ainda está visível. */
  postId: string | null;
  excerto: string | null;
};
