"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cronómetro de contagem crescente, ancorado ao relógio e não a um contador
 * de ticks — um intervalo que perde batidas com o ecrã em segundo plano
 * atrasaria o tempo registado. Ao voltar ao primeiro plano, o valor é
 * recalculado a partir do instante de arranque.
 */
export function useTimer({ onTarget }: { onTarget?: () => void } = {}) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const inicio = useRef<number | null>(null);
  const acumulado = useRef(0);
  const alvoAvisado = useRef(false);

  const ler = useCallback(() => {
    if (inicio.current == null) return acumulado.current;
    return acumulado.current + (performance.now() - inicio.current) / 1000;
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(ler()), 250);
    const aoVoltar = () => setElapsed(ler());
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [running, ler]);

  useWakeLock(running);

  const start = useCallback(() => {
    inicio.current = performance.now();
    alvoAvisado.current = false;
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    acumulado.current = ler();
    inicio.current = null;
    setElapsed(acumulado.current);
    setRunning(false);
  }, [ler]);

  const resume = useCallback(() => {
    inicio.current = performance.now();
    setRunning(true);
  }, []);

  /** Devolve os segundos decorridos e congela o cronómetro. */
  const stop = useCallback(() => {
    const total = ler();
    acumulado.current = total;
    inicio.current = null;
    setElapsed(total);
    setRunning(false);
    return Math.round(total);
  }, [ler]);

  const reset = useCallback(() => {
    acumulado.current = 0;
    inicio.current = null;
    alvoAvisado.current = false;
    setElapsed(0);
    setRunning(false);
  }, []);

  /** Avisa uma única vez quando o objetivo é atingido; não pára o relógio. */
  const marcarAlvo = useCallback(
    (alvoSegundos: number) => {
      if (alvoAvisado.current || !alvoSegundos) return;
      if (elapsed >= alvoSegundos) {
        alvoAvisado.current = true;
        onTarget?.();
      }
    },
    [elapsed, onTarget],
  );

  return { elapsed, running, start, pause, resume, stop, reset, marcarAlvo };
}

/**
 * Mantém o ecrã aceso enquanto `active` for verdadeiro, como no metrónomo.
 * Partilhado pelo cronómetro e pelo descanso: os dois são momentos em que a
 * pessoa pousa o telemóvel e espera que ele continue a contar.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let sentinela: { release: () => Promise<void> } | null = null;
    let cancelado = false;

    const wakeLock = (
      navigator as Navigator & {
        wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
      }
    ).wakeLock;

    const pedir = () => {
      void wakeLock
        ?.request("screen")
        .then((s) => {
          if (cancelado) void s.release();
          else sentinela = s;
        })
        .catch(() => {});
    };

    // O sistema liberta o bloqueio quando a página sai de vista; ao voltar,
    // pede-se outra vez, senão o ecrã apaga-se a meio do descanso seguinte.
    const aoVoltar = () => {
      if (document.visibilityState === "visible") pedir();
    };

    pedir();
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", aoVoltar);
      void sentinela?.release().catch(() => {});
    };
  }, [active]);
}

/** mm:ss a partir de segundos. */
export function formatDuration(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
