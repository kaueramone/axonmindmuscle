"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fundo do hero: uma malha de axónios com impulsos a percorrê-los.
 *
 * A leitura é a do símbolo da marca — eixo horizontal, anilhas ao longo do
 * caminho, nó aberto de um lado e nó sólido do outro, e o sinal a atravessar.
 * Fica muito abaixo do texto em contraste: é atmosfera, não decoração.
 *
 * Construído com elementos posicionados e animação CSS. Sem canvas e sem
 * JavaScript por frame. Para quando o hero sai do ecrã e respeita
 * `prefers-reduced-motion`.
 */

type Axon = {
  /** Posição vertical, em percentagem da altura do hero. */
  top: number;
  /** Início e largura do eixo, em percentagem da largura. */
  left: number;
  width: number;
  /** Anilhas, em percentagem da largura do próprio eixo. */
  ticks: number[];
  /** Segundos que o impulso demora a percorrer o eixo. */
  duration: number;
  delay: number;
  /** Peso visual da linha, de 0 a 1. */
  weight: number;
};

/* Traçado fixo: o servidor e o cliente têm de desenhar o mesmo. */
const AXONS: Axon[] = [
  { top: 16, left: -6, width: 46, ticks: [42, 58, 72], duration: 14, delay: 0, weight: 1 },
  { top: 30, left: 62, width: 44, ticks: [22, 38, 56], duration: 17, delay: 4, weight: 0.7 },
  { top: 47, left: -8, width: 34, ticks: [46, 66], duration: 19, delay: 8, weight: 0.5 },
  { top: 63, left: 70, width: 38, ticks: [26, 44, 62], duration: 15, delay: 2, weight: 0.85 },
  { top: 79, left: -6, width: 40, ticks: [38, 54, 70], duration: 21, delay: 6, weight: 0.45 },
  { top: 92, left: 58, width: 48, ticks: [24, 40, 58], duration: 18, delay: 10, weight: 0.55 },
];

export function AxonField({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) =>
      setActive(entry.isIntersecting),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      {/* Halo de sinapse por trás do texto */}
      <div className="absolute inset-x-0 top-[-20%] h-[75%] bg-[radial-gradient(55%_50%_at_50%_45%,var(--accent-soft),transparent_72%)]" />

      {AXONS.map((axon, index) => (
        <div
          key={index}
          className="absolute h-0"
          style={{
            top: `${axon.top}%`,
            left: `${axon.left}%`,
            width: `${axon.width}%`,
            opacity: axon.weight * 0.5,
          }}
        >
          {/* Eixo, esbatido nas pontas */}
          <span
            className="absolute inset-x-0 top-0 h-px -translate-y-1/2 bg-fg"
            style={{
              opacity: 0.22,
              maskImage:
                "linear-gradient(to right, transparent, #000 18%, #000 82%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, #000 18%, #000 82%, transparent)",
            }}
          />

          {/* Anilhas */}
          {axon.ticks.map((tick) => (
            <span
              key={tick}
              className="absolute top-0 h-6 w-px -translate-x-1/2 -translate-y-1/2 bg-fg"
              style={{ left: `${tick}%`, opacity: 0.16 }}
            />
          ))}

          {/* Nó aberto e nó sólido */}
          <span
            className="absolute left-0 top-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fg"
            style={{ opacity: 0.28 }}
          />
          <span
            className="absolute right-0 top-0 size-3 translate-x-1/2 -translate-y-1/2 rounded-full bg-fg"
            style={{ opacity: 0.2 }}
          />

          {/* Impulso: percorre este eixo de ponta a ponta */}
          <span
            className="absolute top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#307FE2]"
            style={{
              left: 0,
              opacity: 0,
              boxShadow: "0 0 14px 3px rgba(48,127,226,0.5)",
              animation: active
                ? `axon-travel ${axon.duration}s linear ${axon.delay}s infinite`
                : "none",
            }}
          />
        </div>
      ))}
    </div>
  );
}
