"use client";

import type { Phase } from "@/lib/workout/use-metronome";
import { cn } from "@/lib/utils";

/**
 * O guia visual da série: o eixo da marca com o impulso a percorrê-lo ao
 * ritmo da cadência prescrita.
 *
 * Pensado para ser lido a um braço de distância, com o telemóvel apoiado no
 * banco: a informação está na posição e na cor do impulso, não em texto.
 * O impulso desce na excêntrica, para na pausa e sobe na concêntrica — o
 * eixo é vertical porque é assim que a carga se move.
 */
export function AxonRunner({
  phase,
  progress,
  rep,
  targetReps,
  running,
}: {
  phase: Phase;
  progress: number;
  rep: number;
  targetReps: number;
  running: boolean;
}) {
  // Posição do impulso ao longo do eixo, de 0 (topo) a 1 (fundo).
  const posicao =
    phase === "eccentric" ? progress : phase === "pause" ? 1 : 1 - progress;

  const cor =
    phase === "pause" ? "var(--warning)" : phase === "concentric" ? "var(--success)" : "#307FE2";

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Halo que respira com a fase */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(45% 35% at 50% ${8 + posicao * 84}%, color-mix(in srgb, ${cor} 22%, transparent), transparent 70%)`,
          opacity: running ? 1 : 0.35,
        }}
      />

      <div className="relative flex h-full max-h-[30rem] w-full max-w-xs items-stretch justify-center">
        {/* Eixo vertical */}
        <div className="relative w-full">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-6 bottom-6 w-px -translate-x-1/2 bg-hairline-strong"
          />

          {/* Anilhas ao longo do eixo */}
          {[22, 38, 62, 78].map((p) => (
            <span
              key={p}
              aria-hidden="true"
              className="absolute left-1/2 h-px w-10 -translate-x-1/2 bg-hairline-strong"
              style={{ top: `${p}%` }}
            />
          ))}

          {/* Nó aberto no topo: a intenção */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-6 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fg-subtle"
          />
          {/* Nó sólido no fundo: o músculo */}
          <span
            aria-hidden="true"
            className="absolute bottom-6 left-1/2 size-12 -translate-x-1/2 translate-y-1/2 rounded-full bg-fg-subtle"
          />

          {/* O impulso */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              top: `calc(1.5rem + ${posicao} * (100% - 3rem))`,
              background: cor,
              boxShadow: `0 0 40px 8px color-mix(in srgb, ${cor} 55%, transparent)`,
              scale: phase === "pause" ? "1.3" : "1",
              transition: "scale 260ms var(--ease-spring), background 220ms linear",
            }}
          />

          {/* Contagem, no centro, grande e sem distrair */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "data-mono text-[5.5rem] leading-none font-semibold tabular-nums transition-opacity duration-300",
                running ? "text-fg opacity-100" : "text-fg-subtle opacity-60",
              )}
              style={{ textShadow: "0 2px 24px var(--bg)" }}
            >
              {rep}
            </span>
            <span className="data-mono mt-1 text-callout text-fg-subtle">
              / {targetReps}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
