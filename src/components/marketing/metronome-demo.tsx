"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type PhaseKey = "eccentric" | "hold" | "concentric";

const PHASES: { key: PhaseKey; seconds: number }[] = [
  { key: "eccentric", seconds: 3 },
  { key: "hold", seconds: 1 },
  { key: "concentric", seconds: 1 },
];

const CYCLE = PHASES.reduce((total, phase) => total + phase.seconds, 0);

/**
 * Demonstração do metrónomo visual: o impulso percorre o eixo durante a fase
 * excêntrica, pausa, e regressa na concêntrica. É a mesma leitura do símbolo
 * da marca — o sinal a atravessar o axónio.
 */
export function MetronomeDemo({
  labels,
  caption,
}: {
  labels: { eccentric: string; hold: string; concentric: string; rep: string };
  caption: string;
}) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<PhaseKey>("eccentric");
  const [rep, setRep] = useState(1);
  const [running, setRunning] = useState(false);
  const frame = useRef<number | null>(null);
  const start = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Só anima quando está visível — poupa bateria em telemóvel.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setRunning(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(0.5);
      return;
    }

    start.current = performance.now();
    let lastCycle = 0;

    const tick = (now: number) => {
      const elapsed = ((now - start.current) / 1000) % CYCLE;
      const cycleCount = Math.floor((now - start.current) / 1000 / CYCLE);
      if (cycleCount !== lastCycle) {
        lastCycle = cycleCount;
        setRep((value) => (value % 8) + 1);
      }

      let offset = elapsed;
      let current: PhaseKey = "eccentric";
      let ratio = 0;

      for (const item of PHASES) {
        if (offset < item.seconds) {
          current = item.key;
          ratio = offset / item.seconds;
          break;
        }
        offset -= item.seconds;
      }

      setPhase(current);
      setProgress(
        current === "eccentric" ? ratio : current === "hold" ? 1 : 1 - ratio,
      );

      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [running]);

  const phaseLabel = labels[phase];

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-hairline bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8"
    >
      <div className="flex items-baseline justify-between gap-4">
        <p
          className={cn(
            "text-title2 font-semibold transition-colors duration-300",
            phase === "hold" ? "text-accent" : "text-fg",
          )}
        >
          {phaseLabel}
        </p>
        <p className="data-mono text-footnote text-fg-subtle">
          {labels.rep} {String(rep).padStart(2, "0")} / 08
        </p>
      </div>

      {/* Eixo: nó aberto → impulso → nó sólido */}
      <div className="relative mt-8 mb-2 h-16" aria-hidden="true">
        <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-hairline-strong" />

        {[18, 32, 68, 82].map((left, index) => (
          <span
            key={left}
            className="absolute top-1/2 w-px -translate-y-1/2 bg-hairline-strong"
            style={{
              left: `${left}%`,
              height: index === 0 || index === 3 ? "2.75rem" : "1.75rem",
            }}
          />
        ))}

        <span className="absolute left-0 top-1/2 size-8 -translate-y-1/2 rounded-full border-2 border-current text-fg" />
        <span className="absolute right-0 top-1/2 size-8 -translate-y-1/2 rounded-full bg-fg" />

        {/*
          O Tailwind v4 centra com a propriedade `translate`, que se combina
          com `transform`. A pulsação usa a propriedade `scale` para não
          desalinhar o impulso do eixo.
        */}
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#307FE2] shadow-[0_0_20px_rgba(48,127,226,0.7)]"
          style={{
            left: `calc(2rem + ${progress} * (100% - 4rem))`,
            scale: phase === "hold" ? "1.35" : "1",
            transition: "scale 320ms var(--ease-spring)",
          }}
        />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {PHASES.map((item) => (
          <div
            key={item.key}
            className={cn(
              "rounded-md border px-3 py-2.5 transition-colors duration-300",
              phase === item.key
                ? "border-accent/40 bg-accent-soft"
                : "border-hairline bg-transparent",
            )}
          >
            <p className="data-mono text-title3 text-fg">{item.seconds}s</p>
            <p className="text-caption text-fg-subtle">{labels[item.key]}</p>
          </div>
        ))}
      </div>

      <p className="label-brand mt-6 text-fg-subtle">{caption}</p>
    </div>
  );
}
