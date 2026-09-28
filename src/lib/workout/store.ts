"use client";

import { createClient } from "@/lib/supabase/client";
import type { Tempo } from "@/lib/workout/use-metronome";

export type PendingSet = {
  id?: string;
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

type PendingSession = {
  id: string;
  user_id: string;
  started_at: string;
  /** A rotina de que esta sessão faz parte, quando veio de uma. */
  routine_id: string | null;
};

/**
 * Todas as escritas levam o dono a par do identificador da linha. O RLS ja
 * recusaria uma sessao alheia — foi testado — mas uma condicao que so diz
 * `id = x` depende inteiramente de a politica estar la e continuar como esta.
 * Com o dono na condicao, a consulta esta certa por si.
 */
const SETS_KEY = "axon-series-pendentes";
const SESSIONS_KEY = "axon-sessoes-pendentes";

/** Um ginásio em cave não espera. Ao fim disto seguimos em modo local. */
const TIMEOUT_MS = 5000;

/* ------------------------------------------------------------------
   Fila local
   ------------------------------------------------------------------ */

function read<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, valor: T[]) {
  // Do not claim success when the browser cannot keep the only durable copy.
  localStorage.setItem(key, JSON.stringify(valor));
}

type TerminalSession = {
  id: string;
  user_id: string;
  action: "finish" | "discard";
  ended_at: string;
  synced?: boolean;
};
const TERMINAL_KEY = "axon-sessoes-terminadas-v1";
const flushing = new Map<string, Promise<{ sessions: number; sets: number }>>();
const revisions = new Map<string, number>();

function queueChanged(userId: string) {
  revisions.set(userId, (revisions.get(userId) ?? 0) + 1);
  void flushQueue(userId).catch(() => {});
}

export function isSessionClosed(sessionId: string, userId: string): boolean {
  return read<TerminalSession>(TERMINAL_KEY).some((s) => s.id === sessionId && s.user_id === userId);
}

export function pendingCount(userId: string): number {
  return read<PendingSet>(SETS_KEY).filter((s) => s.user_id === userId).length;
}

/** Persist before sending; stable IDs make retries safe even after a lost response. */
export function flushQueue(userId: string): Promise<{ sessions: number; sets: number }> {
  const active = flushing.get(userId);
  if (active) return active;
  const revision = revisions.get(userId);
  const run = drainQueue(userId).finally(() => {
    flushing.delete(userId);
    // A write can arrive after the last read but before this promise settles.
    if (revisions.get(userId) !== revision) void flushQueue(userId).catch(() => {});
  });
  flushing.set(userId, run);
  return run;
}

async function drainQueue(userId: string): Promise<{ sessions: number; sets: number }> {
  const supabase = createClient();
  const count = { sessions: 0, sets: 0 };
  // Each pass rereads storage so writes made while a request is in flight survive.
  for (;;) {
    const sessions = read<PendingSession>(SESSIONS_KEY);
    const session = sessions.find((s) => s.user_id === userId);
    if (session) {
      const { error } = await supabase.from("workout_sessions")
        .upsert(session, { onConflict: "id", ignoreDuplicates: true })
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
      if (error) return count;
      write(SESSIONS_KEY, read<PendingSession>(SESSIONS_KEY).filter((s) => s.id !== session.id));
      count.sessions++;
      continue;
    }
    const sets = read<PendingSet>(SETS_KEY);
    const set = sets.find((s) => s.user_id === userId);
    if (set) {
      // Upgrade entries left by older app versions before sending them.
      if (!set.id) { set.id = crypto.randomUUID(); write(SETS_KEY, sets); }
      const { error } = await supabase.from("workout_sets")
        .upsert(set, { onConflict: "id", ignoreDuplicates: true })
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
      if (error) return count;
      write(SETS_KEY, read<PendingSet>(SETS_KEY).filter((s) => s.id !== set.id));
      count.sets++;
      continue;
    }
    const terminal = read<TerminalSession>(TERMINAL_KEY).find((s) => s.user_id === userId && !s.synced);
    if (!terminal) return count;
    if (terminal.action === "discard") {
      const { error } = await supabase.from("workout_sets").delete()
        .eq("session_id", terminal.id).eq("user_id", userId)
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
      if (error) return count;
    }
    const query = terminal.action === "discard"
      ? supabase.from("workout_sessions").delete()
      : supabase.from("workout_sessions").update({ ended_at: terminal.ended_at });
    const { error } = await query.eq("id", terminal.id).eq("user_id", userId)
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
    if (error) return count;
    write(TERMINAL_KEY, read<TerminalSession>(TERMINAL_KEY).map((s) =>
      s.id === terminal.id && s.user_id === userId ? { ...s, synced: true } : s));
  }
}

export async function startSession(userId: string, routineId: string | null = null) {
  const id = crypto.randomUUID();
  write<PendingSession>(SESSIONS_KEY, [...read<PendingSession>(SESSIONS_KEY), {
    id, user_id: userId, started_at: new Date().toISOString(), routine_id: routineId,
  }]);
  queueChanged(userId);
  return { id, online: navigator.onLine };
}

export async function logSet(
  set: Omit<PendingSet, "completed_at"> & { completed_at?: string },
): Promise<{ persisted: boolean }> {
  if (isSessionClosed(set.session_id, set.user_id)) throw new Error("Workout already closed");
  const row: PendingSet = {
    ...set, id: set.id ?? crypto.randomUUID(), completed_at: set.completed_at ?? new Date().toISOString(),
  };
  const pending = read<PendingSet>(SETS_KEY);
  if (!pending.some((s) => s.id === row.id)) write(SETS_KEY, [...pending, row]);
  queueChanged(set.user_id);
  return { persisted: false };
}

export async function setSessionRpe(sessionId: string, userId: string, rpe: number): Promise<void> {
  const valor = Math.round(rpe);
  if (!Number.isFinite(valor) || valor < 1 || valor > 10) return;
  await flushQueue(userId).catch(() => {});
  await createClient().from("workout_sessions").update({ rpe: valor })
    .eq("id", sessionId).eq("user_id", userId).abortSignal(AbortSignal.timeout(TIMEOUT_MS));
}

/** Keep a local tombstone after sync as server-rendered pages may still be cached. */
async function closeSession(sessionId: string, userId: string, action: TerminalSession["action"]) {
  const terminals = read<TerminalSession>(TERMINAL_KEY);
  if (!terminals.some((s) => s.id === sessionId && s.user_id === userId)) {
    write(TERMINAL_KEY, [...terminals, {
      id: sessionId, user_id: userId, action, ended_at: new Date().toISOString(),
    }]);
  }
  queueChanged(userId);
}

export async function endSession(sessionId: string, userId: string): Promise<void> {
  await closeSession(sessionId, userId, "finish");
}

export async function discardSession(sessionId: string, userId: string): Promise<void> {
  await closeSession(sessionId, userId, "discard");
}

export function tempoToColumns(tempo: Tempo) {
  return {
    tempo_eccentric_s: tempo.eccentric,
    tempo_pause_s: tempo.pause,
    tempo_concentric_s: tempo.concentric,
  };
}
