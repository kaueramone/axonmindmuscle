import { NextResponse, type NextRequest } from "next/server";

import { limitarPedidos } from "@/lib/api/rate-limit";
import { getDictionary } from "@/lib/i18n";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import {
  FalhaModelo,
  gerarResposta,
  type MensagemModelo,
  type Pedaco,
} from "@/lib/professor/anthropic";
import { reunirContexto } from "@/lib/professor/contexto";
import {
  MAX_CARACTERES_PERGUNTA,
  MAX_MENSAGENS_HISTORICO,
  MAX_TOKENS_RESPOSTA,
  MODELO_PROFESSOR,
  blocoContexto,
  blocoEstavel,
} from "@/lib/professor/prompt";
import { createClient } from "@/lib/supabase/server";

/**
 * O Professor AXON.
 *
 * Recebe a conversa (o browser guarda o histórico; aqui não se grava nada),
 * confirma sessão e plano, cobra uma unidade do limite de pedidos e devolve a
 * resposta do modelo em streaming, linha a linha, em JSON:
 *   {"t":"..."}     um pedaço de texto
 *   {"fim":"..."}   terminou; o valor é o motivo de paragem do modelo
 *   {"e":"..."}     falhou a meio; o texto já enviado fica, o cliente avisa
 *
 * A chave da API nunca sai do servidor e a política de conteúdo do browser
 * nem sequer permite ao cliente falar com a Anthropic diretamente: o único
 * destino autorizado é esta rota.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Uma resposta de 700 tokens demora segundos; o teto é folga, não meta. */
export const maxDuration = 60;

const MAX_CARACTERES_RESPOSTA = 4000;

type Corpo = {
  locale?: unknown;
  messages?: unknown;
};

/**
 * O que chega é o que o browser quis mandar. Papéis desconhecidos caem,
 * mensagens seguidas do mesmo papel juntam-se (a API exige alternância), as
 * respostas antigas encurtam-se e só as últimas N seguem. O resultado começa
 * e termina numa mensagem da pessoa, ou não há pedido.
 */
function normalizarMensagens(bruto: unknown): MensagemModelo[] | "vazio" | "longo" {
  if (!Array.isArray(bruto)) return "vazio";

  const limpas: MensagemModelo[] = [];
  for (const item of bruto.slice(-(MAX_MENSAGENS_HISTORICO * 2))) {
    if (!item || typeof item !== "object") continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;

    const texto = content.replace(/\r\n/g, "\n").trim();
    if (!texto) continue;
    if (role === "user" && texto.length > MAX_CARACTERES_PERGUNTA) return "longo";

    const conteudo = role === "assistant" ? texto.slice(0, MAX_CARACTERES_RESPOSTA) : texto;
    const anterior = limpas[limpas.length - 1];
    if (anterior && anterior.role === role) {
      anterior.content = `${anterior.content}\n\n${conteudo}`;
    } else {
      limpas.push({ role, content: conteudo });
    }
  }

  // A conversa tem de abrir com a pessoa.
  while (limpas.length > 0 && limpas[0].role !== "user") limpas.shift();
  if (limpas.length === 0 || limpas[limpas.length - 1].role !== "user") return "vazio";

  // Só as últimas N mensagens, sem partir um par (pergunta/resposta).
  let recorte = limpas.slice(-MAX_MENSAGENS_HISTORICO);
  while (recorte.length > 0 && recorte[0].role !== "user") recorte = recorte.slice(1);
  return recorte;
}

export async function POST(request: NextRequest) {
  let corpo: Corpo;
  try {
    corpo = (await request.json()) as Corpo;
  } catch {
    return NextResponse.json({ error: "pedido" }, { status: 400 });
  }

  const mensagens = normalizarMensagens(corpo.messages);
  if (mensagens === "vazio" || mensagens === "longo") {
    return NextResponse.json({ error: mensagens }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sem sessão" }, { status: 401 });

  const { data: perfil } = await supabase
    .from("profiles")
    .select("display_name, plan, locale, experience, goal, weekly_frequency, timezone")
    .eq("id", user.id)
    .maybeSingle();

  // A porta do PRO, como no relatório: 402 e não 403. Não é falta de
  // permissão, é falta de plano, e o balão mostra o convite em vez de um erro.
  if (perfil?.plan !== "pro") {
    return NextResponse.json({ error: "plano" }, { status: 402 });
  }

  // Cada pergunta custa dinheiro real. O teto por hora está na função da base
  // de dados; um ciclo automático bate nele em minutos, uma pessoa nunca.
  const limite = await limitarPedidos(supabase, "professor");
  if (limite) return limite;

  const localePedido = typeof corpo.locale === "string" ? corpo.locale : null;
  const locale: Locale = isLocale(localePedido)
    ? localePedido
    : isLocale(perfil.locale)
      ? perfil.locale
      : defaultLocale;

  const dict = await getDictionary(locale);
  const contexto = await reunirContexto(supabase, user.id, locale, dict, perfil);

  const pedido = {
    model: MODELO_PROFESSOR,
    max_tokens: MAX_TOKENS_RESPOSTA,
    temperature: 0.6,
    system: [
      // O bloco estável é o mesmo em todos os pedidos: pede-se cache. Abaixo
      // do mínimo que o modelo aceita para cache a marca é ignorada sem custo.
      { type: "text" as const, text: blocoEstavel(), cache_control: { type: "ephemeral" as const } },
      { type: "text" as const, text: blocoContexto(locale, contexto, new Date()) },
    ],
    messages: mensagens,
  };

  const gerador = gerarResposta(pedido, request.signal);
  try {
    // O primeiro `next()` faz o pedido HTTP: é aqui que uma chave errada ou um
    // 429 da Anthropic aparecem, ainda a tempo de responder com um status.
    const primeiro = await gerador.next();
    if (primeiro.done) {
      return NextResponse.json({ error: "falhou" }, { status: 502 });
    }
    return responderEmStream(primeiro.value, gerador);
  } catch (erro) {
    return respostaDeFalha(erro);
  }
}

function responderEmStream(primeiro: Pedaco, gerador: AsyncGenerator<Pedaco>) {
  const encoder = new TextEncoder();
  const linha = (obj: Record<string, unknown>) => encoder.encode(`${JSON.stringify(obj)}\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emitir = (p: Pedaco) => {
        if (p.tipo === "texto") controller.enqueue(linha({ t: p.texto }));
        else controller.enqueue(linha({ fim: p.razao ?? "end_turn" }));
      };

      try {
        emitir(primeiro);
        for await (const pedaco of gerador) emitir(pedaco);
      } catch (erro) {
        const motivo = erro instanceof FalhaModelo ? erro.motivo : "falhou";
        console.error("[professor] falhou a meio da resposta", motivo, mensagemDe(erro));
        controller.enqueue(linha({ e: motivo === "ocupado" ? "ocupado" : "falhou" }));
      } finally {
        controller.close();
      }
    },
    cancel() {
      // A pessoa fechou o balão: o gerador para de ler e a ligação à API cai
      // com o `signal` do pedido original.
      void gerador.return(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}

function respostaDeFalha(erro: unknown) {
  if (erro instanceof FalhaModelo) {
    // A mensagem da Anthropic vai para os logs inteira; para o browser vai só
    // o motivo. A chave em falta é erro de configuração, e fica gritado.
    console.error(`[professor] ${erro.motivo}`, erro.status ?? "", erro.message);
    if (erro.motivo === "ocupado") {
      return NextResponse.json(
        { error: "ocupado" },
        { status: 503, headers: { "retry-after": "20", "cache-control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: erro.motivo === "falhou" ? "falhou" : "indisponivel" },
      { status: erro.motivo === "falhou" ? 502 : 503 },
    );
  }

  if (erro instanceof Error && erro.name === "AbortError") {
    return new Response(null, { status: 499 });
  }

  console.error("[professor] erro inesperado", mensagemDe(erro));
  return NextResponse.json({ error: "falhou" }, { status: 500 });
}

function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}
