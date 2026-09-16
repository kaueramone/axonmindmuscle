import "server-only";

/**
 * Cliente mínimo da Messages API da Anthropic, em streaming.
 *
 * Sem SDK de propósito: são dois cabeçalhos, um POST e um leitor de
 * Server-Sent Events. Uma dependência a mais para isto é uma dependência a
 * mais para auditar, e o `npm install` na pasta partilhada já deu problemas
 * suficientes. Se um dia o Professor precisar de ferramentas ou de ficheiros,
 * aí sim, o SDK paga-se.
 */

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const VERSAO_API = "2023-06-01";

export type MensagemModelo = { role: "user" | "assistant"; content: string };

export type BlocoSistema = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};

export type PedidoModelo = {
  model: string;
  max_tokens: number;
  temperature?: number;
  system: BlocoSistema[];
  messages: MensagemModelo[];
};

export type Pedaco =
  | { tipo: "texto"; texto: string }
  | { tipo: "fim"; razao: string | null };

/** Motivos que o cliente distingue; o resto é "falhou". */
export type MotivoFalha = "sem_chave" | "chave_invalida" | "ocupado" | "falhou";

export class FalhaModelo extends Error {
  constructor(
    public readonly motivo: MotivoFalha,
    detalhe: string,
    public readonly status?: number,
  ) {
    super(detalhe);
    this.name = "FalhaModelo";
  }
}

function motivoPorStatus(status: number): MotivoFalha {
  if (status === 401 || status === 403) return "chave_invalida";
  if (status === 429 || status === 529 || status === 503) return "ocupado";
  return "falhou";
}

/**
 * Faz o pedido e devolve os pedaços de texto à medida que chegam.
 *
 * Um evento `error` a meio do stream é lançado como `FalhaModelo`, para quem
 * consome decidir o que dizer à pessoa; o texto já enviado até aí fica com ela.
 */
export async function* gerarResposta(
  pedido: PedidoModelo,
  signal?: AbortSignal,
): AsyncGenerator<Pedaco> {
  const chave = process.env.ANTHROPIC_API_KEY?.trim();
  if (!chave) throw new FalhaModelo("sem_chave", "ANTHROPIC_API_KEY não definida");

  const cabecalhos: Record<string, string> = {
    "x-api-key": chave,
    "anthropic-version": VERSAO_API,
    "content-type": "application/json",
    accept: "text/event-stream",
  };

  // Uma chave criada "para todos os workspaces" não sabe em qual correr e a
  // API recusa o pedido sem este cabeçalho (`wrkspc_...`). Uma chave criada já
  // dentro de um workspace não precisa dele; a variável fica por definir.
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  if (workspace) cabecalhos["anthropic-workspace-id"] = workspace;

  const resposta = await fetch(ENDPOINT, {
    method: "POST",
    headers: cabecalhos,
    body: JSON.stringify({ ...pedido, stream: true }),
    signal,
  });

  if (!resposta.ok || !resposta.body) {
    let detalhe = `HTTP ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { error?: { type?: string; message?: string } };
      if (corpo?.error?.message) detalhe = `${corpo.error.type ?? "erro"}: ${corpo.error.message}`;
    } catch {
      // Sem corpo legível; o status chega.
    }
    throw new FalhaModelo(motivoPorStatus(resposta.status), detalhe, resposta.status);
  }

  const leitor = resposta.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let razao: string | null = null;

  try {
    while (true) {
      const { value, done } = await leitor.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Cada evento SSE termina numa linha em branco. O que sobra sem essa
      // linha é um evento a meio e espera pelo pedaço seguinte.
      let corte = buffer.indexOf("\n\n");
      while (corte !== -1) {
        const bruto = buffer.slice(0, corte);
        buffer = buffer.slice(corte + 2);
        corte = buffer.indexOf("\n\n");

        const evento = lerEvento(bruto);
        if (!evento) continue;

        if (evento.type === "content_block_delta") {
          const delta = evento.delta as { type?: string; text?: string } | undefined;
          if (delta?.type === "text_delta" && delta.text) {
            yield { tipo: "texto", texto: delta.text };
          }
        } else if (evento.type === "message_delta") {
          const d = evento.delta as { stop_reason?: string | null } | undefined;
          if (d?.stop_reason) razao = d.stop_reason;
        } else if (evento.type === "error") {
          const erro = evento.error as { type?: string; message?: string } | undefined;
          const tipo = erro?.type ?? "erro";
          throw new FalhaModelo(
            tipo === "overloaded_error" || tipo === "rate_limit_error" ? "ocupado" : "falhou",
            `${tipo}: ${erro?.message ?? "sem detalhe"}`,
          );
        }
      }
    }
  } finally {
    leitor.releaseLock();
  }

  yield { tipo: "fim", razao };
}

type EventoSse = { type: string } & Record<string, unknown>;

/** Lê um evento SSE. Só interessa a linha `data:`; `event:` repete o `type`. */
function lerEvento(bruto: string): EventoSse | null {
  const dados: string[] = [];
  for (const linha of bruto.split("\n")) {
    if (linha.startsWith("data:")) dados.push(linha.slice(5).trimStart());
  }
  if (dados.length === 0) return null;
  try {
    const json = JSON.parse(dados.join("\n")) as EventoSse;
    return typeof json?.type === "string" ? json : null;
  } catch {
    return null;
  }
}
