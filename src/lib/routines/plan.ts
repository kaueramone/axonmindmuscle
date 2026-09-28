import type { ExerciseOption } from "@/components/workout/exercise-picker";

export type RoutineEntry = {
  exercise: ExerciseOption;
  sets: number | null;
  reps: number | null;
  durationS: number | null;
};
export type RoutinePlan = { id: string; name: string; entries: RoutineEntry[] };

export function selectRoutine<T extends { id: string; weekdays: number[] }>(
  routines: T[], requestedId: string | undefined, weekday: number, free: boolean,
): T | null {
  if (free) return null;
  // Um identificador inválido não deve abrir silenciosamente outra rotina.
  if (requestedId) return routines.find((r) => r.id === requestedId) ?? null;
  return routines.find((r) => r.weekdays.includes(weekday)) ?? null;
}

export function buildRoutinePlan(
  routine: { id: string; name: string },
  rows: { exercise_id: string; position: number; target_sets: number | null;
    target_reps: number | null; target_duration_s: number | null }[],
  exercises: ExerciseOption[],
): RoutinePlan {
  const catalog = new Map(exercises.map((e) => [e.id, e]));
  return { ...routine, entries: [...rows].sort((a, b) => a.position - b.position).flatMap((row) => {
    const exercise = catalog.get(row.exercise_id);
    return exercise ? [{ exercise, sets: row.target_sets, reps: row.target_reps, durationS: row.target_duration_s }] : [];
  }) };
}
