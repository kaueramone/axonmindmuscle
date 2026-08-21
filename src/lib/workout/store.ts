"use client";

import { createClient } from "@/lib/supabase/client";
import type { Tempo } from "@/lib/workout/use-metronome";

export type PendingSet = {
  session_id: string;
  user_id: string;
  exercise_id: string | null;
  exercise_name: string;
  position: number;
  weight_kg: number | null;
  reps: number | null;
  rir: number | null;
  /** Segundos, para exercícios contados por tempo em vez de repetições. */
  duration_s: number | null;
  /** Domínio de intensidade pretendido, nos exercícios de tempo. */
  intensity_zone: "facil" | "moderado" | "forte" | null;
  tempo_eccentric_s: number;
  tempo_pause_s: number;
  tempo_concentric_s: number;
  rest_seconds: number | null;
  completed_at: string;
};

type PendingSession = { id: string; user_id: string; started_at: string };

const SETS_KEY = "axon-series-pendentes";
const SESSIONS_KEY = "axon-sessoes-pendentes";

/** Um ginásio em cave não espera. Ao fim disto seguimos em modo local. */
const TIMEOUT_MS = 5000;

/* ------------------------------------------------------------------
   Fila local
   ------------------------------------------------------------------ */

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, valor: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(valor));
  } catch {
    // Armazenamento cheio ou bloqueado: seguimos sem fila.
  }
}

/** Corre a promessa com limite de tempo — sem isto, um pedido pendurado trava a série. */
async function comLimite<T>(promessa: PromiseLike<T>): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promessa),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
  ]).catch(() => null);
}

export function pendingCount(): number {
  return read<PendingSet>(SETS_KEY).length;
}

/**
 * Envia o que estiver em fila. As sessões vão primeiro: as séries têm uma
 * chave estrangeira para elas e falhariam se a sessão ainda não existisse.
 */
export async function flushQueue(): Promise<{ sessions: number; sets: number }> {
  const sessoes = read<PendingSession>(SESSIONS_KEY);
  const series = read<PendingSet>(SETS_KEY);
  if (sessoes.length === 0 && series.length === 0) return { sessions: 0, sets: 0 };

  const supabase = createClient();

  if (sessoes.length > 0) {
    const resultado = await comLimite(
      supabase.from("workout_sessions").upsert(sessoes, { onConflict: "id" }),
    );
    if (!resultado || resultado.error) return { sessions: 0, sets: 0 };
    write(SESSIONS_KEY, []);
  }

  if (series.length > 0) {
    const resultado = await comLimite(supabase.from("workout_sets").insert(series));
    if (!resultado || resultado.error) return { sessions: sessoes.length, sets: 0 };
    write(SETS_KEY, []);
  }

  return { sessions: sessoes.length, sets: series.length };
}

/* ------------------------------------------------------------------
   Operações
   ------------------------------------------------------------------ */

/**
 * Abre uma sessão. Devolve sempre um identificador: se o servidor não
 * responder a tempo, geramos um localmente e a sessão sobe depois. O
 * utilizador nunca fica à espera para começar a treinar.
 */
export async function startSession(
  userId: string,
): Promise<{ id: string; online: boolean }> {
  const supabase = createClient();

  const resultado = await comLimite(
    supabase.from("workout_sessions").insert({ user_id: userId }).select("id").single(),
  );

  if (resultado && !resultado.error && resultado.data) {
    return { id: resultado.data.id, online: true };
  }

  const local = crypto.randomUUID();
  write<PendingSession>(SESSIONS_KEY, [
    ...read<PendingSession>(SESSIONS_KEY),
    { id: local, user_id: userId, started_at: new Date().toISOString() },
  ]);
  return { id: local, online: false };
}

/**
 * Regista uma série. Nunca falha do ponto de vista do utilizador: se a rede
 * não colaborar, fica em fila local e sobe assim que houver ligação.
 */
export async function logSet(
  set: Omit<PendingSet, "completed_at"> & { completed_at?: string },
): Promise<{ persisted: boolean }> {
  const linha: PendingSet = {
    ...set,
    completed_at: set.completed_at ?? new Date().toISOString(),
  };

  // Se há sessões por criar, esta série tem de esperar por elas.
  const sessoesPendentes = read<PendingSession>(SESSIONS_KEY).length > 0;

  if (!sessoesPendentes) {
    const supabase = createClient();
    const resultado = await comLimite(supabase.from("workout_sets").insert(linha));
    if (resultado && !resultado.error) {
      void flushQueue();
      return { persisted: true };
    }
  }

  write<PendingSet>(SETS_KEY, [...read<PendingSet>(SETS_KEY), linha]);
  return { persisted: false };
}

/**
 * Esforço percebido da sessão. É melhor esforço: se falhar, perde-se o número
 * e não a sessão — não vale a pena pôr isto na fila de escoamento.
 */
export async function setSessionRpe(sessionId: string, rpe: number): Promise<void> {
  const supabase = createClient();
  await comLimite(
    supabase.from("workout_sessions").update({ rpe }).eq("id", sessionId),
  );
}

export async function endSession(sessionId: string): Promise<void> {
  await flushQueue();
  const supabase = createClient();
  await comLimite(
    supabase
      .from("workout_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", sessionId),
  );
}

export function tempoToColumns(tempo: Tempo) {
  return {
    tempo_eccentric_s: tempo.eccentric,
    tempo_pause_s: tempo.pause,
    tempo_concentric_s: tempo.concentric,
  };
}
