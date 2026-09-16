"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { Sparkle } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const CHAVE_POSICAO = "axon-professor-botao";
const TAMANHO = 56;
const MARGEM = 12;
/** Abaixo disto é um toque, não um arrasto. */
const ARRASTO_MINIMO = 6;
/** Por omissão fica acima da barra de separadores, à direita. */
const POSICAO_INICIAL: Posicao = { rx: 16, by: 88 };

/** Distâncias em píxeis à margem direita e ao fundo, sem a área segura. */
type Posicao = { rx: number; by: number };

function lerPosicao(): Posicao | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_POSICAO);
    if (!bruto) return null;
    const p = JSON.parse(bruto) as Partial<Posicao>;
    if (typeof p.rx !== "number" || typeof p.by !== "number") return null;
    if (!Number.isFinite(p.rx) || !Number.isFinite(p.by)) return null;
    return { rx: p.rx, by: p.by };
  } catch {
    return null;
  }
}

function guardarPosicao(p: Posicao) {
  try {
    window.localStorage.setItem(CHAVE_POSICAO, JSON.stringify(p));
  } catch {
    // Sem armazenamento (modo privado, quota): o botão volta ao sítio inicial
    // na próxima visita, e é tudo.
  }
}

function limitar(p: Posicao, areaSegura: number): Posicao {
  const larguraMax = window.innerWidth - TAMANHO - MARGEM;
  const alturaMax = window.innerHeight - TAMANHO - MARGEM - areaSegura;
  return {
    rx: Math.min(Math.max(p.rx, MARGEM), Math.max(MARGEM, larguraMax)),
    by: Math.min(Math.max(p.by, MARGEM), Math.max(MARGEM, alturaMax)),
  };
}

/**
 * O botão flutuante do Professor.
 *
 * Arrasta-se para onde a pessoa quiser e fica lá, guardado neste browser. A
 * posição é medida à margem direita e ao fundo, e não ao canto superior
 * esquerdo, porque é nesses lados que ele vive por omissão: quando a janela
 * muda de tamanho o botão acompanha o canto em vez de ficar perdido no meio.
 *
 * O toque e o arrasto partilham o mesmo gesto. A distinção é feita pela
 * distância percorrida: menos de seis píxeis é um clique e abre o Professor;
 * mais do que isso é um arrasto e o clique que o browser dispara no fim é
 * ignorado. Teclado (Enter, Espaço) continua a abrir, porque é um `button`.
 */
export function BotaoFlutuante({
  aberto,
  onAbrir,
  label,
  dragHint,
}: {
  aberto: boolean;
  onAbrir: () => void;
  label: string;
  dragHint: string;
}) {
  const [posicao, setPosicao] = useState<Posicao>(POSICAO_INICIAL);
  const [aArrastar, setAArrastar] = useState(false);
  const areaSegura = useRef(0);
  const sonda = useRef<HTMLDivElement>(null);
  const inicio = useRef<{ x: number; y: number; posicao: Posicao } | null>(null);
  const arrastou = useRef(false);
  const ultima = useRef<Posicao>(POSICAO_INICIAL);

  // A área segura (a barra do iPhone) só se lê a partir do CSS: a sonda leva
  // `padding-bottom: env(safe-area-inset-bottom)` e nós lemos o valor.
  useEffect(() => {
    const lerAreaSegura = () =>
      sonda.current ? parseFloat(getComputedStyle(sonda.current).paddingBottom) || 0 : 0;

    const aplicar = (p: Posicao) => {
      const limitada = limitar(p, areaSegura.current);
      ultima.current = limitada;
      setPosicao(limitada);
    };

    areaSegura.current = lerAreaSegura();
    aplicar(lerPosicao() ?? POSICAO_INICIAL);

    // Rodar o telemóvel ou encolher a janela não pode deixar o botão fora do
    // ecrã: volta-se a limitar à área visível.
    const aoRedimensionar = () => {
      areaSegura.current = lerAreaSegura();
      aplicar(ultima.current);
    };
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, []);

  function aoPremir(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    inicio.current = { x: e.clientX, y: e.clientY, posicao };
    arrastou.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function aoMover(e: ReactPointerEvent<HTMLButtonElement>) {
    const i = inicio.current;
    if (!i) return;
    const dx = e.clientX - i.x;
    const dy = e.clientY - i.y;
    if (!arrastou.current && Math.hypot(dx, dy) < ARRASTO_MINIMO) return;
    if (!arrastou.current) {
      arrastou.current = true;
      setAArrastar(true);
    }
    const nova = limitar({ rx: i.posicao.rx - dx, by: i.posicao.by - dy }, areaSegura.current);
    ultima.current = nova;
    setPosicao(nova);
  }

  function aoLargar(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!inicio.current) return;
    inicio.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (arrastou.current) {
      setAArrastar(false);
      guardarPosicao(ultima.current);
    }
  }

  function aoClicar() {
    // O browser dispara `click` no fim de qualquer gesto com o ponteiro. Se o
    // gesto foi um arrasto, este clique não é um clique.
    if (arrastou.current) {
      arrastou.current = false;
      return;
    }
    onAbrir();
  }

  return (
    <>
      <div ref={sonda} aria-hidden className="pointer-events-none fixed bottom-0 left-0 safe-b" />
      <button
        type="button"
        aria-label={label}
        title={dragHint}
        aria-expanded={aberto}
        aria-controls="professor-axon"
        data-professor-botao
        onPointerDown={aoPremir}
        onPointerMove={aoMover}
        onPointerUp={aoLargar}
        onPointerCancel={aoLargar}
        onClick={aoClicar}
        style={{
          right: posicao.rx,
          bottom: `calc(${posicao.by}px + env(safe-area-inset-bottom))`,
          width: TAMANHO,
          height: TAMANHO,
          touchAction: "none",
        }}
        className={cn(
          "fixed z-50 select-none rounded-full border border-hairline-strong bg-estrutura shadow-[var(--shadow-float)]",
          "ring-2 ring-[var(--bg)] transition-[opacity,scale,box-shadow] duration-300 [transition-timing-function:var(--ease-spring)]",
          "focus-visible:outline-none focus-visible:ring-[var(--accent-ring)]",
          aArrastar ? "scale-110 cursor-grabbing shadow-[0_16px_48px_-12px_rgba(0,0,0,0.9)]" : "cursor-pointer hover:scale-105",
          aberto && "pointer-events-none scale-75 opacity-0",
        )}
      >
        <span className="absolute inset-0 overflow-hidden rounded-full">
          <Image
            src="/professor-axon-rosto.webp"
            alt=""
            width={TAMANHO}
            height={TAMANHO}
            unoptimized
            draggable={false}
            className="size-full object-cover"
          />
        </span>
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-accent-solid text-accent-fg ring-2 ring-[var(--bg)]"
        >
          <Sparkle className="size-3" />
        </span>
      </button>
    </>
  );
}
