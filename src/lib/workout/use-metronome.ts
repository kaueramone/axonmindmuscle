"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Phase = "eccentric" | "pause" | "concentric";

export type Tempo = {
  /** Segundos da fase excêntrica (descida controlada). */
  eccentric: number;
  /** Segundos de pausa no fim da excêntrica. */
  pause: number;
  /** Segundos da fase concêntrica (subida). */
  concentric: number;
};

export type MetronomeState = "idle" | "running" | "paused" | "finished";

type Options = {
  tempo: Tempo;
  /** Repetições alvo. A série termina sozinha ao atingi-las. */
  targetReps: number;
  sound: boolean;
  haptics: boolean;
  onFinished?: (reps: number) => void;
};

const ORDER: Phase[] = ["eccentric", "pause", "concentric"];

/**
 * Motor do metrónomo.
 *
 * A contagem é feita a partir do relógio e não do número de frames, por isso
 * não acumula desvio. Quando a aplicação vai para segundo plano a série é
 * suspensa — quem sai da aplicação não está a executar a repetição — e
 * retoma exatamente onde ficou.
 */
export function useMetronome({
  tempo,
  targetReps,
  sound,
  haptics,
  onFinished,
}: Options) {
  const [state, setState] = useState<MetronomeState>("idle");
  const [phase, setPhase] = useState<Phase>("eccentric");
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [rep, setRep] = useState(0);

  const frame = useRef<number | null>(null);
  const elapsedRef = useRef(0); // segundos já decorridos na série
  const lastTickRef = useRef(0); // performance.now() da última frame
  const lastPhaseRef = useRef<Phase | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  const cycle = Math.max(tempo.eccentric + tempo.pause + tempo.concentric, 0.1);

  /* ---------------- Sinais ---------------- */

  const beep = useCallback(
    (tipo: Phase | "done") => {
      if (haptics && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(tipo === "done" ? [90, 60, 90] : 35);
      }
      if (!sound || !audioCtx.current) return;

      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Tons distintos por fase para se reconhecerem sem olhar.
      const freq = tipo === "eccentric" ? 440 : tipo === "pause" ? 660 : 880;
      osc.frequency.value = tipo === "done" ? 320 : freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    },
    [sound, haptics],
  );

  /* ---------------- Ecrã sempre aceso ---------------- */

  const acquireWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLock.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      // Sem wake lock a ferramenta continua a funcionar; o ecrã é que apaga.
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
  }, []);

  /* ---------------- Ciclo de animação ---------------- */

  useEffect(() => {
    if (state !== "running") return;

    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      elapsedRef.current += delta;

      const total = elapsedRef.current;
      const repsFeitas = Math.floor(total / cycle);

      if (repsFeitas >= targetReps) {
        setRep(targetReps);
        setPhaseProgress(1);
        setState("finished");
        beep("done");
        onFinished?.(targetReps);
        return;
      }

      let dentro = total % cycle;
      let atual: Phase = "eccentric";
      let progresso = 0;

      for (const nome of ORDER) {
        const duracao = tempo[nome];
        if (duracao <= 0) continue;
        if (dentro < duracao) {
          atual = nome;
          progresso = dentro / duracao;
          break;
        }
        dentro -= duracao;
        atual = nome;
        progresso = 1;
      }

      if (lastPhaseRef.current !== atual) {
        lastPhaseRef.current = atual;
        beep(atual);
      }

      setRep(repsFeitas);
      setPhase(atual);
      setPhaseProgress(progresso);
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [state, cycle, tempo, targetReps, beep, onFinished]);

  /* ---------------- Segundo plano ---------------- */

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        setState((s) => (s === "running" ? "paused" : s));
      } else if (wakeLock.current === null && state === "running") {
        void acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [state, acquireWakeLock]);

  useEffect(() => () => releaseWakeLock(), [releaseWakeLock]);

  /* ---------------- Comandos ---------------- */

  const start = useCallback(() => {
    // O AudioContext tem de nascer de um gesto do utilizador.
    if (sound && !audioCtx.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (Ctor) audioCtx.current = new Ctor();
    }
    void audioCtx.current?.resume();
    void acquireWakeLock();

    elapsedRef.current = 0;
    lastPhaseRef.current = null;
    setRep(0);
    setPhase("eccentric");
    setPhaseProgress(0);
    setState("running");
  }, [sound, acquireWakeLock]);

  const pause = useCallback(() => setState("paused"), []);

  const resume = useCallback(() => {
    void acquireWakeLock();
    setState("running");
  }, [acquireWakeLock]);

  const stop = useCallback(() => {
    releaseWakeLock();
    setState("idle");
    elapsedRef.current = 0;
    lastPhaseRef.current = null;
    setRep(0);
    setPhaseProgress(0);
    setPhase("eccentric");
  }, [releaseWakeLock]);

  return {
    state,
    phase,
    phaseProgress,
    rep,
    /** Repetições concluídas quando a série é interrompida a meio. */
    completedReps: state === "finished" ? targetReps : rep,
    start,
    pause,
    resume,
    stop,
  };
}
