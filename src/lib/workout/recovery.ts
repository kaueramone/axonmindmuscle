import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { emptyDraft, type WorkoutDraft } from "./draft";

/** Fallback for sessions created before local recovery or on another browser. */
export async function loadOpenWorkout(
  supabase: Awaited<ReturnType<typeof createClient>>, userId: string,
): Promise<WorkoutDraft | null> {
  const { data: session } = await supabase.from("workout_sessions")
    .select("id, started_at, routine_id").eq("user_id", userId).is("ended_at", null)
    .order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (!session) return null;
  const { data: sets, error } = await supabase.from("workout_sets")
    .select("exercise_id, exercise_name, weight_kg, reps, duration_s, position")
    .eq("user_id", userId).eq("session_id", session.id).order("position");
  if (error) throw new Error("Unable to recover workout sets");
  return {
    ...emptyDraft(userId), sessionId: session.id, routineId: session.routine_id,
    startedAt: new Date(session.started_at).getTime(),
    logged: (sets ?? []).map((s) => ({
      exerciseId: s.exercise_id ?? undefined, exercise: s.exercise_name, weight: s.weight_kg, reps: s.reps ?? 0,
      volume: (s.weight_kg ?? 0) * (s.reps ?? 0), ...(s.duration_s == null ? {} : { duration: s.duration_s }),
    })),
  };
}
