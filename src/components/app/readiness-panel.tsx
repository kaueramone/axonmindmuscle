"use client";

import { useState } from "react";

import { ReadinessConsent } from "@/components/app/readiness-consent";
import { ReadinessSummary } from "@/components/app/readiness-summary";
import { Button } from "@/components/ui/button";
import { Alert, Card, Spinner } from "@/components/ui/surface";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/types";
import { saveReadinessAction } from "@/lib/readiness/actions";
import { presentReadiness } from "@/lib/readiness/present";
import {
  type ReadinessAnswers,
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
  existing,
  consentAt,
}: {
  locale: Locale;
  dict: Dict;
  existing: ReadinessResult | null;
  /** Data do consentimento aos dados de saúde; null bloqueia o formulário. */
  consentAt: string | null;
}) {
  const copy = dict.readiness;
  const [consentimento, setConsentimento] = useState<string | null>(consentAt);

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
  const [erro, setErro] = useState<string | null>(null);

  const podeSubmeter =
    answers.energy != null || answers.sleepQuality != null || answers.soreness != null;

  async function submeter() {
    setBusy(true);
    setErro(null);
    // O servidor recalcula e devolve o que ficou gravado. Mostramos isso e
    // nao a conta feita aqui: se as duas divergirem, a pessoa tem de ver a
    // que fica no historico. Se a gravacao falhar (rede, ou consentimento
    // retirado noutro separador) dizemo-lo em vez de mostrar um resultado
    // "registado hoje" que nao ficou registado em lado nenhum.
    const gravado = await saveReadinessAction({ answers });
    if (!gravado) {
      setErro(copy.saveFailed);
      setBusy(false);
      return;
    }
    setResult(gravado);
    setBusy(false);
  }

  /* ---------------- Resultado ---------------- */

  if (result) {
    const presented = presentReadiness(result, copy);

    return (
      <div className="flex flex-col gap-5">
        <ReadinessSummary
          result={result}
          presented={presented}
          dict={dict}
          badge={copy.savedToday}
        />

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

  /* ---------------- Consentimento ---------------- */

  // Sem consentimento o servidor recusa a gravação (política de INSERT), por
  // isso o formulário nem aparece: pedir respostas que não vão ser guardadas
  // seria enganar a pessoa.
  if (!consentimento) {
    return <ReadinessConsent locale={locale} dict={dict} onAccepted={setConsentimento} />;
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

      {erro ? <Alert tone="danger">{erro}</Alert> : null}

      <Button size="lg" fullWidth onClick={submeter} disabled={!podeSubmeter || busy}>
        {busy ? <Spinner /> : null}
        {copy.submit}
      </Button>
    </div>
  );
}
