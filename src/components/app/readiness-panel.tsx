"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Check, Info } from "@/components/ui/icons";
import { Alert, Badge, Card, Spinner } from "@/components/ui/surface";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/types";
import { saveReadinessAction } from "@/lib/readiness/actions";
import {
  computeReadiness,
  prescriptionFor,
  type ReadinessAnswers,
  type ReadinessContext,
  type ReadinessResult,
} from "@/lib/readiness/score";
import { route } from "@/lib/routes";
import type { MuscleGroup } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const MUSCLE_KEYS: MuscleGroup[] = [
  "peito",
  "costas",
  "ombros",
  "biceps",
  "triceps",
  "abdomen",
  "quadriceps",
  "isquiotibiais",
  "gluteos",
  "gemeos",
  "lombar",
];

const TONE = {
  strong: { text: "text-success", bg: "bg-success/12", border: "border-success/30" },
  moderate: { text: "text-warning", bg: "bg-warning/12", border: "border-warning/30" },
  rest: { text: "text-danger", bg: "bg-danger/12", border: "border-danger/30" },
} as const;

/** Botões de 1 a 5, todos no mesmo sentido: à esquerda mau, à direita bom. */
function Scale({
  label,
  value,
  onChange,
  labels,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  labels: [string, string, string, string, string];
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-callout font-medium text-fg">{label}</p>
      <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-md border px-1 py-2.5 transition-colors",
              value === n
                ? "border-accent bg-accent-soft"
                : "border-hairline bg-surface hover:bg-surface-hover",
            )}
          >
            <span
              className={cn(
                "data-mono text-callout",
                value === n ? "text-accent" : "text-fg-muted",
              )}
            >
              {n}
            </span>
          </button>
        ))}
      </div>
      <p className="flex justify-between text-caption text-fg-subtle">
        <span>{labels[0]}</span>
        <span>{labels[4]}</span>
      </p>
    </div>
  );
}

export function ReadinessPanel({
  locale,
  dict,
  context,
  existing,
}: {
  locale: Locale;
  dict: Dict;
  context: ReadinessContext;
  existing: ReadinessResult | null;
}) {
  const copy = dict.readiness;

  const [answers, setAnswers] = useState<ReadinessAnswers>({
    sleepHours: null,
    sleepQuality: null,
    energy: null,
    soreness: null,
    soreMuscles: [],
    restingHr: null,
  });
  const [result, setResult] = useState<ReadinessResult | null>(existing);
  const [busy, setBusy] = useState(false);

  const podeSubmeter =
    answers.energy != null || answers.sleepQuality != null || answers.soreness != null;

  async function submeter() {
    setBusy(true);
    // O servidor recalcula e devolve o que ficou gravado. Mostramos isso e
    // nao a conta feita aqui: se as duas divergirem, a pessoa tem de ver a
    // que fica no historico. O calculo local serve so de rede de seguranca
    // quando a gravacao falha.
    const gravado = await saveReadinessAction({ answers });
    setResult(gravado ?? computeReadiness(answers, context));
    setBusy(false);
  }

  /* ---------------- Resultado ---------------- */

  if (result) {
    const tone = TONE[result.state];
    const receita = prescriptionFor(result.state);

    return (
      <div className="flex flex-col gap-5">
        <Card className={cn("flex flex-col gap-4 border", tone.border, tone.bg)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-brand text-fg-subtle">{copy.scoreLabel}</p>
              <p className={cn("data-mono mt-1 text-[3rem] leading-none", tone.text)}>
                {result.score}
              </p>
            </div>
            <Badge tone="neutral">{copy.savedToday}</Badge>
          </div>

          <div>
            <h2 className={cn("text-title2", tone.text)}>{copy.states[result.state]}</h2>
            <p className="mt-2 text-callout leading-relaxed text-fg-muted">
              {copy.advice[result.state]}
            </p>
          </div>
        </Card>

        {receita.rirDelta > 0 ? (
          <Card className="flex items-center justify-between gap-4">
            <div>
              <p className="text-subhead font-medium text-fg">
                {copy.appliedToWorkout}
              </p>
              <p className="mt-1 text-caption text-fg-subtle">
                {copy.adjustLoad} {Math.round(receita.loadDelta * 100)}% · {copy.adjustRir}{" "}
                +{receita.rirDelta}
              </p>
            </div>
            <Check className="size-5 shrink-0 text-success" />
          </Card>
        ) : null}

        {result.drivers.length > 0 ? (
          <Card className="flex flex-col gap-3">
            <h3 className="label-brand text-fg-subtle">{copy.whyTitle}</h3>
            <ul className="flex flex-col gap-2">
              {result.drivers.map((d) => {
                const chave =
                  d.key === "energy" && d.direction === "up"
                    ? "energyUp"
                    : d.key === "sleepQuality" && d.direction === "up"
                      ? "sleepQualityUp"
                      : d.key;
                const texto = copy.why[chave as keyof typeof copy.why];
                if (!texto) return null;
                return (
                  <li key={d.key + d.direction} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        d.direction === "up" ? "bg-success" : "bg-warning",
                      )}
                    />
                    <span className="text-subhead text-fg-muted">
                      {texto}
                      {d.detail ? (
                        <span className="data-mono text-fg-subtle"> · {d.detail}</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        {result.avoidMuscles.length > 0 ? (
          <Card className="flex flex-col gap-3">
            <div>
              <h3 className="label-brand text-fg-subtle">{copy.avoidTitle}</h3>
              <p className="mt-1.5 text-caption text-fg-subtle">{copy.avoidHint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.avoidMuscles.map((m) => (
                <Badge key={m} tone="warning">
                  {dict.app.progress.muscles[m as keyof typeof dict.app.progress.muscles] ??
                    m}
                </Badge>
              ))}
            </div>
          </Card>
        ) : null}

        {result.needsBaseline ? (
          <Alert tone="info" icon={<Info className="size-4" />}>
            <strong className="font-semibold">{copy.baselineTitle}.</strong>{" "}
            {copy.baselineHint}
          </Alert>
        ) : null}

        <p className="px-1 text-caption leading-relaxed text-fg-subtle">
          {copy.honesty}
        </p>

        <div className="flex flex-col gap-2.5">
          <Button
            size="lg"
            fullWidth
            onClick={() => {
              window.location.href = route(locale, "workout");
            }}
          >
            {dict.workout.startCta}
          </Button>
          <Button
            size="lg"
            variant="ghost"
            fullWidth
            onClick={() => setResult(null)}
          >
            {copy.recalculate}
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- Formulário ---------------- */

  return (
    <div className="flex flex-col gap-5">
      <p className="text-callout text-fg-muted">{copy.intro}</p>

      <Card className="flex flex-col gap-6">
        <Scale
          label={copy.energy}
          value={answers.energy}
          onChange={(v) => setAnswers({ ...answers, energy: v })}
          labels={[
            copy.scales.exhausted,
            copy.scales.low,
            copy.scales.normal,
            copy.scales.energetic,
            copy.scales.excellent,
          ]}
        />

        <Scale
          label={copy.sleepQuality}
          value={answers.sleepQuality}
          onChange={(v) => setAnswers({ ...answers, sleepQuality: v })}
          labels={[
            copy.scales.veryBad,
            copy.scales.bad,
            copy.scales.okay,
            copy.scales.good,
            copy.scales.veryGood,
          ]}
        />

        <div className="flex flex-col gap-2.5">
          <p className="text-callout font-medium text-fg">{copy.sleepHours}</p>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            max={16}
            value={answers.sleepHours ?? ""}
            onChange={(e) =>
              setAnswers({
                ...answers,
                sleepHours: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="data-mono h-13 w-full rounded-md border border-hairline bg-surface px-4 text-title3 text-fg outline-none focus:border-accent"
          />
        </div>

        <Scale
          label={copy.soreness}
          value={answers.soreness}
          onChange={(v) => setAnswers({ ...answers, soreness: v })}
          labels={[
            copy.scales.verySore,
            copy.scales.quiteSore,
            copy.scales.someSore,
            copy.scales.littleSore,
            copy.scales.noSore,
          ]}
        />

        {answers.soreness != null && answers.soreness <= 3 ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-subhead text-fg-muted">{copy.soreWhere}</p>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_KEYS.map((m) => {
                const ativo = answers.soreMuscles.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() =>
                      setAnswers({
                        ...answers,
                        soreMuscles: ativo
                          ? answers.soreMuscles.filter((x) => x !== m)
                          : [...answers.soreMuscles, m],
                      })
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-subhead transition-colors",
                      ativo
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-hairline bg-surface text-fg-subtle",
                    )}
                  >
                    {dict.app.progress.muscles[
                      m as keyof typeof dict.app.progress.muscles
                    ] ?? m}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-callout font-medium text-fg">{copy.restingHr}</p>
          <span className="text-caption text-fg-subtle">{copy.optionalStep}</span>
        </div>
        <input
          type="number"
          inputMode="numeric"
          min={25}
          max={220}
          value={answers.restingHr ?? ""}
          onChange={(e) =>
            setAnswers({
              ...answers,
              restingHr: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="data-mono h-13 w-full rounded-md border border-hairline bg-surface px-4 text-title3 text-fg outline-none focus:border-accent"
        />
        <p className="text-caption leading-relaxed text-fg-subtle">
          {copy.restingHrHint}
        </p>
      </Card>

      <Button size="lg" fullWidth onClick={submeter} disabled={!podeSubmeter || busy}>
        {busy ? <Spinner /> : null}
        {copy.submit}
      </Button>
    </div>
  );
}
