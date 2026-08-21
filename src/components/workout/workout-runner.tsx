"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AxonRunner } from "@/components/workout/axon-runner";
import { ExerciseBrief } from "@/components/workout/exercise-brief";
import {
  ExercisePicker,
  type ExerciseOption,
} from "@/components/workout/exercise-picker";
import { Button, ButtonLink } from "@/components/ui/button";
import { Check, ChevronLeft, Clock } from "@/components/ui/icons";
import { Alert, Badge, Card, Spinner } from "@/components/ui/surface";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import { route } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  endSession,
  flushQueue,
  logSet,
  startSession,
  tempoToColumns,
} from "@/lib/workout/store";
import { useMetronome, type Tempo } from "@/lib/workout/use-metronome";
import { formatDuration, useTimer } from "@/lib/workout/use-timer";
import type { ReadinessState } from "@/lib/readiness/score";

export type ReadinessHint = {
  state: ReadinessState;
  loadDelta: number;
  rirDelta: number;
  avoidMuscles: string[];
};

type Step =
  "picking" | "configuring" | "running" | "logging" | "resting" | "summary";

type LoggedSet = {
  exercise: string;
  weight: number | null;
  reps: number;
  volume: number;
  /** Segundos, quando o exercício é contado por tempo. */
  duration?: number;
};

const PRESETS: { key: keyof Dict["workout"]["presets"]; tempo: Tempo }[] = [
  { key: "controlled", tempo: { eccentric: 3, pause: 1, concentric: 1 } },
  { key: "standard", tempo: { eccentric: 2, pause: 0, concentric: 2 } },
  { key: "slow", tempo: { eccentric: 4, pause: 2, concentric: 1 } },
  { key: "explosive", tempo: { eccentric: 3, pause: 0, concentric: 1 } },
];

const REST_SECONDS = 120;

/** Durações sugeridas, em minutos, para exercícios contados por tempo. */
const DURATION_PRESETS = [10, 20, 30, 45];

export function WorkoutRunner({
  locale,
  dict,
  userId,
  exercises,
  existingSessionId,
  readiness,
}: {
  locale: Locale;
  dict: Dict;
  userId: string;
  exercises: ExerciseOption[];
  existingSessionId: string | null;
  readiness: ReadinessHint | null;
}) {
  const copy = dict.workout;

  const [step, setStep] = useState<Step>("picking");
  const [sessionId, setSessionId] = useState<string | null>(existingSessionId);
  const [exercise, setExercise] = useState<ExerciseOption | null>(null);
  const [tempo, setTempo] = useState<Tempo>(PRESETS[0].tempo);
  const [targetReps, setTargetReps] = useState(10);
  const [weight, setWeight] = useState("");
  // A prontidão de hoje entra como valor de partida, não como imposição.
  const [rir, setRir] = useState<number | null>(
    Math.min(4, 2 + (readiness?.rirDelta ?? 0)),
  );
  const [sound, setSound] = useState(false);
  const [haptics, setHaptics] = useState(true);
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);
  const [logged, setLogged] = useState<LoggedSet[]>([]);
  const [restLeft, setRestLeft] = useState(REST_SECONDS);
  const [startedAt] = useState(() => Date.now());
  const actualReps = useRef(0);

  /* Exercícios contados por tempo: o alvo é uma intenção, não um limite. */
  const [targetMinutes, setTargetMinutes] = useState(20);
  const loggedDuration = useRef(0);
  const timer = useTimer();
  const porTempo = exercise?.tracking === "time";

  const metronome = useMetronome({
    tempo,
    targetReps,
    sound,
    haptics,
    onFinished: (reps) => {
      actualReps.current = reps;
      setStep("logging");
    },
  });

  /* Escoa séries que tenham ficado em fila num treino anterior. */
  useEffect(() => {
    void flushQueue();
    const onOnline = () => void flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  /* Contagem do descanso */
  useEffect(() => {
    if (step !== "resting") return;
    const id = setInterval(() => {
      setRestLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  const beginSet = useCallback(async () => {
    setBusy(true);
    let id = sessionId;
    if (!id) {
      const sessao = await startSession(userId);
      id = sessao.id;
      setSessionId(id);
      if (!sessao.online) setQueued(true);
    }
    setBusy(false);
    setStep("running");
    if (porTempo) {
      timer.reset();
      timer.start();
    } else {
      metronome.start();
    }
  }, [sessionId, userId, metronome, timer, porTempo]);

  const stopSet = useCallback(() => {
    actualReps.current = metronome.rep;
    metronome.stop();
    setStep("logging");
  }, [metronome]);

  /** Fecha o cronómetro e grava logo a duração: não há carga nem RIR a pedir. */
  const stopTimed = useCallback(async () => {
    const segundos = timer.stop();
    loggedDuration.current = segundos;

    if (!exercise || !sessionId) return;
    setBusy(true);

    const { persisted } = await logSet({
      session_id: sessionId,
      user_id: userId,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      position: logged.length + 1,
      weight_kg: null,
      reps: null,
      rir: null,
      duration_s: segundos,
      ...tempoToColumns({ eccentric: 0, pause: 0, concentric: 0 }),
      rest_seconds: null,
    });

    setQueued(!persisted);
    setLogged((prev) => [
      ...prev,
      {
        exercise: exercise.name,
        weight: null,
        reps: 0,
        volume: 0,
        duration: segundos,
      },
    ]);
    setBusy(false);
    setRestLeft(REST_SECONDS);
    setStep("resting");
  }, [timer, exercise, sessionId, userId, logged.length]);

  const saveSet = useCallback(async () => {
    if (!exercise || !sessionId) return;
    setBusy(true);

    const carga = weight.trim() ? Number(weight.replace(",", ".")) : null;
    const reps = actualReps.current || targetReps;

    const { persisted } = await logSet({
      session_id: sessionId,
      user_id: userId,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      position: logged.length + 1,
      weight_kg: Number.isFinite(carga) ? carga : null,
      reps,
      rir,
      duration_s: null,
      ...tempoToColumns(tempo),
      rest_seconds: null,
    });

    setQueued(!persisted);
    setLogged((prev) => [
      ...prev,
      {
        exercise: exercise.name,
        weight: carga,
        reps,
        volume: (carga ?? 0) * reps,
      },
    ]);
    setBusy(false);
    setRestLeft(REST_SECONDS);
    setStep("resting");
  }, [
    exercise,
    sessionId,
    userId,
    weight,
    targetReps,
    rir,
    tempo,
    logged.length,
  ]);

  const finish = useCallback(async () => {
    setBusy(true);
    if (sessionId) await endSession(sessionId);
    setBusy(false);
    setStep("summary");
  }, [sessionId]);

  /* ---------------- Ecrã da série, em modo imersivo ---------------- */

  /* ---------------- Ecrã do cronómetro, em modo imersivo ---------------- */

  if (step === "running" && porTempo) {
    const alvo = targetMinutes * 60;
    const progresso = Math.min(1, timer.elapsed / alvo);
    const atingiu = timer.elapsed >= alvo;

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-bg safe-t safe-b">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="truncate text-subhead text-fg-muted">
            {exercise?.name}
          </span>
          <Badge tone={atingiu ? "success" : "accent"}>
            {atingiu ? copy.timeDone : copy.freeTime}
          </Badge>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-5">
          <div className="flex flex-col items-center gap-2">
            <p className="label-brand text-fg-subtle">{copy.timeElapsed}</p>
            <p
              className={cn(
                "data-mono text-[4.5rem] leading-none tabular-nums transition-colors duration-300",
                atingiu ? "text-success" : "text-fg",
              )}
            >
              {formatDuration(timer.elapsed)}
            </p>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-2">
            <span className="h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
              <span
                className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-linear"
                style={{ width: `${progresso * 100}%` }}
              />
            </span>
            <span className="flex justify-between text-caption text-fg-subtle">
              <span>{copy.timeTarget}</span>
              <span className="data-mono">{formatDuration(alvo)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 px-5 pb-4">
          {timer.running ? (
            <Button
              size="lg"
              variant="secondary"
              fullWidth
              onClick={timer.pause}
            >
              {copy.pause}
            </Button>
          ) : (
            <Button size="lg" fullWidth onClick={timer.resume}>
              {copy.resume}
            </Button>
          )}
          <Button
            size="lg"
            variant="ghost"
            fullWidth
            onClick={stopTimed}
            disabled={busy}
          >
            {busy ? <Spinner /> : null}
            {copy.stopTimed}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "running") {
    const fase = copy.phases[metronome.phase];
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-bg safe-t safe-b">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="truncate text-subhead text-fg-muted">
            {exercise?.name}
          </span>
          <Badge tone="accent">
            {t(copy.setNumber, { n: logged.length + 1 })}
          </Badge>
        </div>

        <p
          className={cn(
            "px-5 text-center text-[2.5rem] font-bold leading-none tracking-tight transition-colors duration-200",
            metronome.phase === "pause" ? "text-warning" : "text-fg",
          )}
        >
          {fase}
        </p>

        <div className="min-h-0 flex-1 px-5 py-4">
          <AxonRunner
            phase={metronome.phase}
            progress={metronome.phaseProgress}
            rep={metronome.rep}
            targetReps={targetReps}
            running={metronome.state === "running"}
          />
        </div>

        <div className="flex flex-col gap-2.5 px-5 pb-4">
          {metronome.state === "paused" ? (
            <Button size="lg" fullWidth onClick={metronome.resume}>
              {copy.resume}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="secondary"
              fullWidth
              onClick={metronome.pause}
            >
              {copy.pause}
            </Button>
          )}
          <Button size="lg" variant="ghost" fullWidth onClick={stopSet}>
            {copy.stopSet}
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- Restantes passos ---------------- */

  return (
    <div className="flex flex-col gap-6">
      {queued ? <Alert tone="info">{copy.offlineQueued}</Alert> : null}

      {step === "picking" ? (
        <ExercisePicker
          exercises={exercises}
          copy={copy}
          onPick={(escolhido) => {
            setExercise(escolhido);
            setStep("configuring");
          }}
        />
      ) : null}

      {step === "configuring" && exercise ? (
        <div className="flex flex-col gap-6">
          <button
            type="button"
            onClick={() => setStep("picking")}
            className="flex items-center gap-1.5 self-start text-subhead text-fg-muted transition-colors hover:text-fg"
          >
            <ChevronLeft className="size-4" />
            {exercise.name}
          </button>

          {readiness && readiness.rirDelta > 0 ? (
            <Alert tone="info">
              <strong className="font-semibold">
                {dict.readiness.states[readiness.state]}.
              </strong>{" "}
              {dict.readiness.adjustLoad}{" "}
              {Math.round(readiness.loadDelta * 100)}% ·{" "}
              {dict.readiness.adjustRir} +{readiness.rirDelta}
            </Alert>
          ) : null}

          {readiness && readiness.avoidMuscles.includes(exercise.category) ? (
            <Alert tone="danger">
              {dict.readiness.avoidTitle}: {dict.readiness.avoidHint}
            </Alert>
          ) : null}

          <ExerciseBrief exercise={exercise} copy={copy} />

          {porTempo ? (
            <>
              <Card className="flex flex-col gap-5">
                <div>
                  <h3 className="text-headline font-semibold text-fg">
                    {copy.duration}
                  </h3>
                  <p className="mt-1 text-footnote leading-relaxed text-fg-subtle">
                    {copy.durationHint}
                  </p>
                </div>

                <div className="flex items-baseline gap-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={180}
                    value={targetMinutes}
                    onChange={(event) =>
                      setTargetMinutes(
                        Math.max(1, Number(event.target.value) || 1),
                      )
                    }
                    aria-label={copy.duration}
                    className="data-mono h-16 w-32 rounded-md border border-hairline bg-surface px-4 text-[2rem] leading-none text-fg outline-none focus:border-accent"
                  />
                  <span className="text-title3 text-fg-subtle">
                    {copy.durationMinutes}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-caption text-fg-subtle">
                    {copy.durationPresets}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_PRESETS.map((minutos) => (
                      <button
                        key={minutos}
                        type="button"
                        aria-pressed={targetMinutes === minutos}
                        onClick={() => setTargetMinutes(minutos)}
                        className={cn(
                          "data-mono rounded-full border px-4 py-2 text-subhead transition-colors",
                          targetMinutes === minutos
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-hairline bg-surface text-fg-subtle hover:text-fg",
                        )}
                      >
                        {minutos} {copy.durationMinutes}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              <p className="text-caption text-fg-subtle">{copy.keepAwake}</p>
            </>
          ) : (
            <>
              <Card className="flex flex-col gap-4">
                <div>
                  <h3 className="text-headline font-semibold text-fg">
                    {copy.cadence}
                  </h3>
                  <p className="mt-1 text-footnote text-fg-subtle">
                    {copy.cadenceHint}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {PRESETS.map((preset) => {
                    const ativo =
                      preset.tempo.eccentric === tempo.eccentric &&
                      preset.tempo.pause === tempo.pause &&
                      preset.tempo.concentric === tempo.concentric;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => setTempo(preset.tempo)}
                        className={cn(
                          "flex flex-col items-start rounded-lg border p-3.5 text-left transition-all active:scale-[0.98]",
                          ativo
                            ? "border-accent bg-accent-soft"
                            : "border-hairline bg-surface hover:bg-surface-hover",
                        )}
                      >
                        <span className="text-callout font-semibold text-fg">
                          {copy.presets[preset.key]}
                        </span>
                        <span className="data-mono text-footnote text-fg-subtle">
                          {
                            copy.presets[
                              `${preset.key}Detail` as keyof typeof copy.presets
                            ]
                          }
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {(["eccentric", "pause", "concentric"] as const).map(
                    (fase) => (
                      <label key={fase} className="flex flex-col gap-1.5">
                        <span className="text-caption text-fg-subtle">
                          {copy.phaseNames[fase]}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={tempo[fase]}
                          onChange={(event) =>
                            setTempo({
                              ...tempo,
                              [fase]: Number(event.target.value),
                            })
                          }
                          className="data-mono h-12 w-full rounded-md border border-hairline bg-surface px-3 text-center text-title3 text-fg outline-none focus:border-accent"
                        />
                      </label>
                    ),
                  )}
                </div>
              </Card>

              <Card className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-footnote font-medium text-fg-muted">
                    {copy.targetReps}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={targetReps}
                    onChange={(event) =>
                      setTargetReps(Number(event.target.value))
                    }
                    className="data-mono h-13 rounded-md border border-hairline bg-surface px-4 text-title3 text-fg outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-footnote font-medium text-fg-muted">
                    {copy.weight}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={0}
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                    className="data-mono h-13 rounded-md border border-hairline bg-surface px-4 text-title3 text-fg outline-none focus:border-accent"
                  />
                </label>
              </Card>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["sound", sound, setSound, copy.sound],
                    ["haptics", haptics, setHaptics, copy.haptics],
                  ] as const
                ).map(([chave, valor, definir, etiqueta]) => (
                  <button
                    key={chave}
                    type="button"
                    onClick={() => definir(!valor)}
                    aria-pressed={valor}
                    className={cn(
                      "rounded-full border px-4 py-2 text-subhead transition-colors",
                      valor
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-hairline bg-surface text-fg-subtle",
                    )}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>

              <p className="text-caption text-fg-subtle">{copy.keepAwake}</p>
            </>
          )}

          <Button size="lg" fullWidth onClick={beginSet} disabled={busy}>
            {busy ? <Spinner /> : null}
            {porTempo ? copy.startTimed : copy.beginSet}
          </Button>
        </div>
      ) : null}

      {step === "logging" && exercise ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-success/12 text-success">
              <Check className="size-7" />
            </span>
            <h2 className="text-title2 text-fg">{copy.setDone}</h2>
            <p className="text-callout text-fg-muted">{exercise.name}</p>
          </div>

          <Card className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-footnote font-medium text-fg-muted">
                {copy.targetReps}
              </span>
              <input
                type="number"
                min={0}
                max={100}
                defaultValue={actualReps.current || targetReps}
                onChange={(event) => {
                  actualReps.current = Number(event.target.value);
                }}
                className="data-mono h-13 rounded-md border border-hairline bg-surface px-4 text-title3 text-fg outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-footnote font-medium text-fg-muted">
                {copy.weight}
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                className="data-mono h-13 rounded-md border border-hairline bg-surface px-4 text-title3 text-fg outline-none focus:border-accent"
              />
            </label>
          </Card>

          <Card className="flex flex-col gap-3">
            <div>
              <p className="text-footnote font-medium text-fg-muted">
                {copy.rir}
              </p>
              <p className="mt-1 text-caption text-fg-subtle">{copy.rirHint}</p>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setRir(valor)}
                  className={cn(
                    "data-mono h-12 flex-1 rounded-md border text-callout transition-colors",
                    rir === valor
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-hairline bg-surface text-fg-muted",
                  )}
                >
                  {valor}
                </button>
              ))}
            </div>
          </Card>

          <Button size="lg" fullWidth onClick={saveSet} disabled={busy}>
            {busy ? <Spinner /> : null}
            {copy.logSet}
          </Button>
        </div>
      ) : null}

      {step === "resting" ? (
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col items-center gap-4 py-10">
            <Clock className="size-6 text-accent" />
            <p className="data-mono text-[4rem] leading-none text-fg tabular-nums">
              {String(Math.floor(restLeft / 60)).padStart(2, "0")}:
              {String(restLeft % 60).padStart(2, "0")}
            </p>
            <p className="text-callout text-fg-muted">{copy.rest}</p>
            <button
              type="button"
              onClick={() => setRestLeft((s) => s + 30)}
              className="rounded-full border border-hairline bg-surface px-4 py-2 text-subhead text-fg-muted transition-colors hover:text-fg"
            >
              {copy.addSeconds}
            </button>
          </Card>

          <div className="flex flex-col gap-2.5">
            <Button size="lg" fullWidth onClick={beginSet} disabled={busy}>
              {copy.nextSet}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              fullWidth
              onClick={() => setStep("picking")}
            >
              {copy.changeExercise}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              fullWidth
              onClick={finish}
              disabled={busy}
            >
              {copy.endWorkout}
            </Button>
          </div>

          {logged.length > 0 ? (
            <Card className="flex flex-col gap-2">
              {logged.map((linha, index) => (
                <div
                  key={index}
                  className="flex items-baseline justify-between gap-3 text-subhead"
                >
                  <span className="truncate text-fg-muted">
                    {linha.exercise}
                  </span>
                  <span className="data-mono shrink-0 text-fg">
                    {linha.duration != null
                      ? formatDuration(linha.duration)
                      : `${linha.weight ? `${linha.weight} kg × ` : ""}${linha.reps}`}
                  </span>
                </div>
              ))}
            </Card>
          ) : null}
        </div>
      ) : null}

      {step === "summary" ? (
        <div className="flex flex-col gap-6 py-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-success/12 text-success">
              <Check className="size-8" />
            </span>
            <h2 className="text-title1 text-fg">{copy.summaryTitle}</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: copy.summarySets, value: String(logged.length) },
              {
                label: copy.summaryVolume,
                value: `${Math.round(logged.reduce((t, l) => t + l.volume, 0))}`,
                unit: "kg",
              },
              {
                label: copy.summaryDuration,
                value: String(
                  Math.max(1, Math.round((Date.now() - startedAt) / 60000)),
                ),
                unit: "min",
              },
            ].map((stat) => (
              <Card key={stat.label} className="p-4 text-center">
                <p className="data-mono text-title1 text-fg">
                  {stat.value}
                  {stat.unit ? (
                    <span className="ml-0.5 text-footnote text-fg-subtle">
                      {stat.unit}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-caption text-fg-subtle">{stat.label}</p>
              </Card>
            ))}
          </div>

          <ButtonLink
            href={route(locale, "today")}
            size="lg"
            className="w-full"
          >
            {copy.summaryClose}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
