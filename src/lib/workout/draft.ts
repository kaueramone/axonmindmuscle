import type { ExerciseOption } from "@/components/workout/exercise-picker";
import type { RoutinePlan } from "@/lib/routines/plan";
import type { Tempo } from "./use-metronome";

export type WorkoutStep = "picking" | "configuring" | "running" | "logging" | "resting" | "effort" | "summary";
export type LoggedSet = { exerciseId?: string; exercise: string; weight: number | null; reps: number; volume: number; duration?: number };
export type WorkoutDraft = {
  version: 1;
  userId: string;
  sessionId: string | null;
  routineId: string | null;
  routinePlan?: RoutinePlan | null;
  startedAt: number;
  updatedAt: number;
  step: WorkoutStep;
  exercise: ExerciseOption | null;
  tempo: Tempo;
  targetReps: number;
  weight: string;
  rir: number | null;
  logged: LoggedSet[];
  restEndsAt: number | null;
  targetMinutes: number;
  zone: "facil" | "moderado" | "forte";
  actualReps: number;
  timerElapsed: number;
  metronomeElapsed: number;
  sound: boolean;
  haptics: boolean;
};

const key = (userId: string) => `axon-treino-em-curso-v1:${userId}`;

export function readDraft(userId: string): WorkoutDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(key(userId)) ?? "null");
    if (!value || value.version !== 1 || value.userId !== userId ||
        !["picking", "configuring", "running", "logging", "resting", "effort"].includes(value.step) ||
        !Number.isFinite(value.startedAt) || !Array.isArray(value.logged) ||
        typeof value.weight !== "string" || !value.tempo ||
        !Number.isFinite(value.tempo.eccentric) || !Number.isFinite(value.tempo.pause) ||
        !Number.isFinite(value.tempo.concentric) || !Number.isFinite(value.targetReps) ||
        !Number.isFinite(value.timerElapsed) || value.timerElapsed < 0 ||
        !Number.isFinite(value.metronomeElapsed) || value.metronomeElapsed < 0 ||
        !value.logged.every((set: LoggedSet) => set && typeof set.exercise === "string" &&
          Number.isFinite(set.reps) && Number.isFinite(set.volume) &&
          (set.weight === null || Number.isFinite(set.weight)) &&
          (set.duration === undefined || Number.isFinite(set.duration)))) return null;
    if (["running", "logging", "resting", "configuring"].includes(value.step) &&
        (!value.exercise || typeof value.exercise.name !== "string")) return null;
    return value as WorkoutDraft;
  } catch { return null; }
}

/** Synchronous: closing the tab must not race an outstanding network request. */
export function writeDraft(draft: WorkoutDraft): void {
  localStorage.setItem(key(draft.userId), JSON.stringify(draft));
}

export function clearDraft(userId: string): void {
  localStorage.removeItem(key(userId));
}

export function emptyDraft(userId: string): WorkoutDraft {
  return {
    version: 1, userId, sessionId: null, routineId: null, startedAt: Date.now(),
    updatedAt: Date.now(), step: "picking", exercise: null,
    tempo: { eccentric: 3, pause: 1, concentric: 1 }, targetReps: 10,
    weight: "", rir: 2, logged: [], restEndsAt: null, targetMinutes: 20,
    zone: "moderado", actualReps: 0, timerElapsed: 0, metronomeElapsed: 0,
    sound: false, haptics: true,
  };
}
