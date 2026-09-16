"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { ButtonLink } from "@/components/ui/button";
import { ArrowRight, Close, Trash } from "@/components/ui/icons";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import { route } from "@/lib/routes";
import type { UserPlan } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

import { BotaoFlutuante } from "./botao-flutuante";

type Copy = Dict["professor"];

export type Mensagem = {
  role: "user" | "assistant";
  content: string;
  /** O modelo parou pelo limite de tamanho; a pessoa pode pedir para continuar. */
  truncada?: boolean;
};

type Estado = "parado" | "a_pensar" | "a_escrever";

const CHAVE_CONVERSA = "axon-professor-conversa";
const EVENTO_ABRIR = "axon:professor";
const MAX_CARACTERES = 1200;
/** Quantas mensagens seguem para o servidor. Ele corta na mesma; isto poupa bytes. */
const HISTORICO_ENVIADO = 12;

/** Qualquer parte da aplicação abre o Professor com isto (a linha em "Hoje", por exemplo). */
export function abrirProfessor() {
  window.dispatchEvent(new Event(EVENTO_ABRIR));
}

function lerConversa(): Mensagem[] {
  try {
    const bruto = window.sessionStorage.getItem(CHAVE_CONVERSA);
    if (!bruto) return [];
    const lista = JSON.parse(bruto) as unknown;
    if (!Array.isArray(lista)) return [];
    return lista.filter(
      (m): m is Mensagem =>
        !!m &&
        typeof m === "object" &&
        ((m as Mensagem).role === "user" || (m as Mensagem).role === "assistant") &&
        typeof (m as Mensagem).content === "string",
    );
  } catch {
    return [];
  }
}

function guardarConversa(lista: Mensagem[]) {
  try {
    if (lista.length === 0) window.sessionStorage.removeItem(CHAVE_CONVERSA);
    else window.sessionStorage.setItem(CHAVE_CONVERSA, JSON.stringify(lista.slice(-40)));
  } catch {
    // Sem armazenamento a conversa vive só em memória. Chega.
  }
}

/**
 * O Professor AXON: o botão flutuante e o balão de conversa.
 *
 * A conversa vive no browser (memória e `sessionStorage`) e segue inteira em
 * cada pedido; o servidor não guarda nada. É uma decisão de privacidade e de
 * simplicidade: não há tabela de conversas para proteger, exportar ou apagar.
 *
 * Quem não tem PRO vê o Professor na mesma, com o convite em vez do campo de
 * pergunta. O servidor confirma o plano por sua conta; isto aqui é só para a
 * pessoa não escrever uma pergunta que ia ser recusada.
 */
export function ProfessorAxon({
  locale,
  plan,
  firstName,
  copy,
}: {
  locale: Locale;
  plan: UserPlan;
  firstName: string | null;
  copy: Copy;
}) {
  const [aberto, setAberto] = useState(false);
  const [aFechar, setAFechar] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [estado, setEstado] = useState<Estado>("parado");
  const [erro, setErro] = useState<string | null>(null);
  const [semPlano, setSemPlano] = useState(plan !== "pro");
  const [texto, setTexto] = useState("");
  const [recuoTeclado, setRecuoTeclado] = useState(0);

  const [carregado, setCarregado] = useState(false);

  const controlador = useRef<AbortController | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  // A conversa anterior desta aba, se houver. Só depois de a ler é que se
  // passa a gravar: gravar antes escrevia a lista vazia inicial por cima da
  // conversa guardada (e o modo estrito do React, que repete os efeitos em
  // desenvolvimento, lia depois esse vazio como se fosse a conversa).
  useEffect(() => {
    setMensagens(lerConversa());
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) guardarConversa(mensagens);
  }, [mensagens, carregado]);

  const fechar = useCallback(() => {
    if (!aberto) return;
    setAFechar(true);
    window.setTimeout(() => {
      setAberto(false);
      setAFechar(false);
      // O foco volta ao botão, para quem navega por teclado saber onde está.
      document.querySelector<HTMLButtonElement>("[data-professor-botao]")?.focus();
    }, 180);
  }, [aberto]);

  const abrir = useCallback(() => {
    setAFechar(false);
    setAberto(true);
  }, []);

  // Outras partes da aplicação pedem para abrir por evento.
  useEffect(() => {
    window.addEventListener(EVENTO_ABRIR, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR, abrir);
  }, [abrir]);

  // Escape fecha; o foco vai para o campo quando abre.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("keydown", aoTeclar);
    const foco = window.setTimeout(() => campo.current?.focus({ preventScroll: true }), 420);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      window.clearTimeout(foco);
    };
  }, [aberto, fechar]);

  // No telemóvel o balão ocupa o ecrã: a página por trás não deve rolar.
  useEffect(() => {
    if (!aberto) return;
    const estreito = window.matchMedia("(max-width: 639px)").matches;
    if (!estreito) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  // O teclado do telemóvel encolhe a área visível mas não a janela: sem isto o
  // campo de pergunta ficava escondido por baixo do teclado no iPhone.
  useEffect(() => {
    if (!aberto) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const medir = () => {
      const recuo = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setRecuoTeclado(recuo);
    };
    medir();
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
      setRecuoTeclado(0);
    };
  }, [aberto]);

  // Segue a conversa até ao fim à medida que o texto chega.
  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens, estado, aberto]);

  // Fechar a página a meio de uma resposta cancela o pedido.
  useEffect(() => () => controlador.current?.abort(), []);

  // A figura do Professor entra a deslizar; se só fosse pedida ao abrir, a
  // primeira entrada era de um retângulo vazio. Aquece-se a cache mal a
  // página assente.
  useEffect(() => {
    const aquecer = () => {
      const img = new window.Image();
      img.src = "/professor-axon.webp";
    };
    // O Safari ainda não tem `requestIdleCallback`; cai-se num temporizador.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(aquecer, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(aquecer, 1500);
    return () => window.clearTimeout(id);
  }, []);

  function parar() {
    controlador.current?.abort();
    controlador.current = null;
    setEstado("parado");
  }

  function limpar() {
    parar();
    setMensagens([]);
    setErro(null);
    campo.current?.focus();
  }

  async function perguntar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || estado !== "parado" || semPlano) return;
    if (limpa.length > MAX_CARACTERES) {
      setErro(copy.errorLong);
      return;
    }

    setErro(null);
    setTexto("");
    const historico: Mensagem[] = [...mensagens, { role: "user", content: limpa }];
    setMensagens(historico);
    setEstado("a_pensar");

    const ctrl = new AbortController();
    controlador.current = ctrl;

    let resposta: Response;
    try {
      resposta = await fetch("/api/professor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          messages: historico
            .slice(-HISTORICO_ENVIADO)
            .map(({ role, content }) => ({ role, content })),
        }),
        signal: ctrl.signal,
      });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      console.warn("[professor] sem ligação", e);
      setErro(copy.errorNetwork);
      setEstado("parado");
      return;
    }

    if (!resposta.ok || !resposta.body) {
      setErro(await mensagemDeErro(resposta, copy, setSemPlano));
      setEstado("parado");
      return;
    }

    // A resposta chega linha a linha, em JSON. Cada pedaço de texto entra na
    // última mensagem; `fim` diz porque parou; `e` é uma falha a meio.
    const leitor = resposta.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let acumulado = "";
    let comecou = false;

    const aplicar = (extra?: Partial<Mensagem>) => {
      setMensagens((atual) => {
        const copia = [...atual];
        const ultima = copia[copia.length - 1];
        if (ultima?.role === "assistant" && comecou) {
          copia[copia.length - 1] = { ...ultima, content: acumulado, ...extra };
        } else {
          copia.push({ role: "assistant", content: acumulado, ...extra });
        }
        return copia;
      });
      comecou = true;
    };

    try {
      while (true) {
        const { value, done } = await leitor.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const linhas = buffer.split("\n");
        buffer = linhas.pop() ?? "";
        for (const linha of linhas) {
          if (!linha.trim()) continue;
          let evento: { t?: string; fim?: string; e?: string };
          try {
            evento = JSON.parse(linha);
          } catch {
            continue;
          }
          if (typeof evento.t === "string") {
            acumulado += evento.t;
            setEstado("a_escrever");
            aplicar();
          } else if (evento.fim) {
            if (evento.fim === "max_tokens") aplicar({ truncada: true });
          } else if (evento.e) {
            setErro(evento.e === "ocupado" ? copy.errorBusy : copy.errorGeneric);
          }
        }
      }
      if (!comecou) setErro(copy.errorGeneric);
    } catch (e) {
      if (!ctrl.signal.aborted) {
        console.warn("[professor] a ligação caiu", e);
        setErro(copy.errorNetwork);
      }
    } finally {
      if (controlador.current === ctrl) controlador.current = null;
      setEstado("parado");
    }
  }

  function submeter(e: FormEvent) {
    e.preventDefault();
    void perguntar(texto);
  }

  function aoTeclarNoCampo(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envia; Shift+Enter muda de linha, como em qualquer conversa.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void perguntar(texto);
    }
  }

  const saudacao = t(copy.greeting, { name: firstName ? `, ${firstName}` : "" });
  const aOcupar = estado !== "parado";
  // Com o teclado aberto no telemóvel sobra pouco ecrã: o Professor encolhe.
  const compacto = recuoTeclado > 120;

  return (
    <>
      <BotaoFlutuante aberto={aberto} onAbrir={abrir} label={copy.open} dragHint={copy.dragHint} />

      {aberto ? (
        <div
          id="professor-axon"
          className="fixed inset-0 z-50 flex flex-col justify-end sm:pointer-events-none"
          style={{ paddingBottom: recuoTeclado, "--recuo": `${recuoTeclado}px` } as CSSProperties}
        >
          {/* No telemóvel o balão ocupa o ecrã e um toque fora fecha. No
              desktop não há véu: a pessoa pode ler a página enquanto pergunta. */}
          <button
            type="button"
            aria-label={copy.close}
            onClick={fechar}
            className={cn(
              "absolute inset-0 bg-cortex/45 backdrop-blur-[2px] transition-opacity duration-200 sm:hidden",
              aFechar ? "opacity-0" : "animate-fade-in",
            )}
          />

          <div
            className={cn(
              "relative flex flex-col-reverse gap-2 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-opacity duration-150",
              "sm:pointer-events-auto sm:flex-row sm:items-end sm:gap-3 sm:px-5 sm:pb-5",
              aFechar && "opacity-0",
            )}
          >
            {/* O Professor, no canto inferior esquerdo, a entrar da direita
                para a esquerda. */}
            <div
              className={cn(
                "shrink-0 self-start sm:self-end",
                aFechar ? "translate-x-6 transition-[translate] duration-150" : "animate-professor-in",
              )}
            >
              <Image
                src="/professor-axon.webp"
                alt={copy.title}
                width={537}
                height={600}
                unoptimized
                draggable={false}
                className={cn(
                  "w-auto select-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)] transition-[height] duration-200 sm:h-64",
                  compacto ? "h-16" : "h-36",
                )}
              />
            </div>

            {/* O balão de conversa. */}
            <section
              role="dialog"
              aria-label={copy.title}
              className={cn(
                "relative flex min-h-0 flex-col overflow-visible rounded-xl border border-hairline-strong material-thick shadow-[var(--shadow-float)]",
                "w-full sm:w-[400px] sm:max-h-[min(72dvh,640px)] md:w-[440px]",
                compacto
                  ? "max-h-[calc(100dvh-var(--recuo)-7rem)]"
                  : "max-h-[calc(100dvh-var(--recuo)-13rem)]",
                !aFechar && "animate-bubble-in",
              )}
            >
              {/* O bico do balão: aponta para baixo, para o Professor, no
                  telemóvel; para a esquerda, para ele, no desktop. */}
              <span
                aria-hidden
                className={cn(
                  "absolute size-4 rotate-45 border-hairline-strong material-thick",
                  "-bottom-2 left-14 border-b border-r",
                  "sm:bottom-40 sm:-left-2 sm:border-b sm:border-l sm:border-r-0",
                )}
              />

              <header className="flex items-center gap-3 border-b border-hairline px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-headline font-semibold text-fg">{copy.title}</p>
                  <p className="truncate text-caption text-fg-subtle">{copy.subtitle}</p>
                </div>
                {mensagens.length > 0 && !semPlano ? (
                  <button
                    type="button"
                    onClick={limpar}
                    aria-label={copy.newChat}
                    title={copy.newChat}
                    className="grid size-9 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
                  >
                    <Trash className="size-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={fechar}
                  aria-label={copy.close}
                  className="grid size-9 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface hover:text-fg"
                >
                  <Close className="size-4.5" />
                </button>
              </header>

              {semPlano ? (
                <div className="flex flex-col gap-3 px-4 py-5">
                  <p className="text-headline font-semibold text-fg">{copy.proTitle}</p>
                  <p className="text-subhead leading-relaxed text-fg-muted">{copy.proBody}</p>
                  <ButtonLink href={route(locale, "plans")} size="sm" className="self-start">
                    {copy.proCta}
                  </ButtonLink>
                </div>
              ) : (
                <>
                  <div
                    ref={lista}
                    role="log"
                    aria-live="polite"
                    className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 scrollbar-none"
                  >
                    <Fala>{saudacao}</Fala>

                    {mensagens.length === 0 ? (
                      <ul className="flex flex-wrap gap-2">
                        {copy.suggestions.map((s) => (
                          <li key={s}>
                            <button
                              type="button"
                              onClick={() => void perguntar(s)}
                              className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-left text-footnote text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
                            >
                              {s}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {mensagens.map((m, i) =>
                      m.role === "user" ? (
                        <p
                          key={i}
                          className="max-w-[85%] self-end whitespace-pre-wrap rounded-lg rounded-br-xs bg-accent-solid px-3.5 py-2 text-subhead text-accent-fg [overflow-wrap:anywhere]"
                        >
                          {m.content}
                        </p>
                      ) : (
                        <Fala key={i} nota={m.truncada ? copy.truncated : undefined}>
                          {m.content}
                        </Fala>
                      ),
                    )}

                    {estado === "a_pensar" ? <APensar label={copy.thinking} /> : null}

                    {erro ? (
                      <p
                        role="alert"
                        className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-footnote text-danger"
                      >
                        {erro}
                      </p>
                    ) : null}
                  </div>

                  <form
                    onSubmit={submeter}
                    className="flex items-end gap-2 border-t border-hairline px-3 py-3"
                  >
                    <textarea
                      ref={campo}
                      value={texto}
                      onChange={(e) => setTexto(e.target.value.slice(0, MAX_CARACTERES))}
                      onKeyDown={aoTeclarNoCampo}
                      placeholder={copy.placeholder}
                      rows={1}
                      maxLength={MAX_CARACTERES}
                      enterKeyHint="send"
                      aria-label={copy.placeholder}
                      className="max-h-28 min-h-11 flex-1 resize-none rounded-md border border-hairline bg-surface px-3.5 py-2.5 text-callout text-fg outline-none [field-sizing:content] placeholder:text-fg-subtle focus:border-accent"
                    />
                    {aOcupar ? (
                      <button
                        type="button"
                        onClick={parar}
                        className="h-11 shrink-0 rounded-md border border-hairline bg-surface px-3 text-subhead font-medium text-fg-muted transition-colors hover:text-fg"
                      >
                        {copy.stop}
                      </button>
                    ) : (
                      <button
                        type="submit"
                        aria-label={copy.send}
                        disabled={texto.trim().length === 0}
                        className="grid size-11 shrink-0 place-items-center rounded-md bg-accent-solid text-accent-fg transition-[opacity,scale] duration-200 [transition-timing-function:var(--ease-spring)] active:scale-95 disabled:opacity-40"
                      >
                        <ArrowRight className="size-4.5" />
                      </button>
                    )}
                  </form>

                  <p className="border-t border-hairline px-4 py-2 text-caption leading-snug text-fg-subtle">
                    {copy.disclaimer}
                  </p>
                </>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Uma fala do Professor: texto simples, parágrafos curtos, negrito discreto se vier. */
function Fala({ children, nota }: { children: string; nota?: string }) {
  return (
    <div className="flex max-w-[92%] flex-col gap-1.5 self-start">
      {children.split(/\n{2,}|\n(?=- )/).map((paragrafo, i) => (
        <p
          key={i}
          className="whitespace-pre-wrap text-subhead leading-relaxed text-fg [overflow-wrap:anywhere]"
        >
          {comNegrito(paragrafo)}
        </p>
      ))}
      {nota ? <p className="text-caption text-fg-subtle">{nota}</p> : null}
    </div>
  );
}

/** `**assim**` vira negrito. É o único Markdown que se tolera vindo do modelo. */
function comNegrito(texto: string): ReactNode {
  const partes = texto.split("**");
  if (partes.length < 3) return texto.replaceAll("**", "");
  return partes.map((parte, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {parte}
      </strong>
    ) : (
      parte
    ),
  );
}

function APensar({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 self-start px-1 py-1" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-fg-subtle animate-pulse"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </div>
  );
}

async function mensagemDeErro(
  resposta: Response,
  copy: Copy,
  marcarSemPlano: (v: boolean) => void,
): Promise<string> {
  let corpo: { error?: string; repetir_em?: number } = {};
  try {
    corpo = (await resposta.json()) as typeof corpo;
  } catch {
    // Sem JSON; decide-se pelo status.
  }

  switch (resposta.status) {
    case 401:
      return copy.errorSession;
    case 402:
      marcarSemPlano(true);
      return copy.proTitle;
    case 429: {
      const minutos = Math.max(1, Math.ceil((corpo.repetir_em ?? 60) / 60));
      return t(copy.errorRate, { n: minutos });
    }
    case 400:
      return corpo.error === "longo" ? copy.errorLong : copy.errorGeneric;
    case 503:
      return corpo.error === "ocupado" ? copy.errorBusy : copy.errorUnavailable;
    default:
      return copy.errorGeneric;
  }
}
