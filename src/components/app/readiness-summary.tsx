"use client";

import { useState } from "react";

import { ChevronRight, Info } from "@/components/ui/icons";
import { Alert, Badge, Card } from "@/components/ui/surface";
import type { Dict } from "@/lib/i18n/types";
import type { Presented } from "@/lib/readiness/present";
import type { ReadinessResult } from "@/lib/readiness/score";
import { cn } from "@/lib/utils";

const TONE = {
  strong: { text: "text-success", bg: "bg-success/12", border: "border-success/30" },
  moderate: { text: "text-warning", bg: "bg-warning/12", border: "border-warning/30" },
  rest: { text: "text-danger", bg: "bg-danger/12", border: "border-danger/30" },
} as const;

/**
 * A prontidão em três linhas: o número com o estado, uma frase a dizer porquê,
 * e o que fazer no treino. Os sinais por trás ficam fechados até a pessoa
 * tocar em "Ver detalhes" — o mesmo ecrã serve quem quer só a resposta e quem
 * quer ver o mecanismo, sem que o segundo grupo dite o ecrã do primeiro.
 *
 * Usado no painel de prontidão (depois de responder) e na página inicial
 * (quando o registo de hoje já existe). O cálculo da frase vive em
 * `lib/readiness/present.ts`.
 */
export function ReadinessSummary({
  result,
  presented,
  dict,
  badge,
  compact = false,
}: {
  result: ReadinessResult;
  presented: Presented;
  dict: Dict;
  badge?: string;
  /** Na página inicial não repetimos o aviso de honestidade nem o baseline. */
  compact?: boolean;
}) {
  const copy = dict.readiness;
  const tone = TONE[result.state];
  const [aberto, setAberto] = useState(false);

  const temDetalhes =
    presented.trends.length > 0 || result.avoidMuscles.length > 0 || result.needsBaseline;

  return (
    <Card className={cn("flex flex-col gap-4 border", tone.border, tone.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-brand text-fg-subtle">{copy.title}</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className={cn("data-mono text-[2.75rem] leading-none", tone.text)}>
              {result.score}
            </span>
            <span className="data-mono text-callout text-fg-subtle">{copy.outOf}</span>
            <span className={cn("text-title3", tone.text)}>{presented.state}</span>
          </p>
        </div>
        {badge ? <Badge tone="neutral">{badge}</Badge> : null}
      </div>

      <p className="text-callout leading-relaxed text-fg">{presented.summary}</p>

      <p className="text-subhead leading-relaxed text-fg-muted">{presented.decision}</p>

      {temDetalhes ? (
        <div className="flex flex-col gap-3 border-t border-hairline/60 pt-3">
          <button
            type="button"
            aria-expanded={aberto}
            onClick={() => setAberto((v) => !v)}
            className="flex items-center gap-1.5 self-start text-subhead font-medium text-accent"
          >
            <ChevronRight
              className={cn("size-4 transition-transform", aberto && "rotate-90")}
            />
            {aberto ? copy.detailsHide : copy.detailsShow}
          </button>

          {aberto ? (
            <div className="flex flex-col gap-4">
              {presented.trends.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div>
                    <h3 className="label-brand text-fg-subtle">{copy.signalsTitle}</h3>
                    <p className="mt-1 text-caption text-fg-subtle">{copy.signalsHint}</p>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {presented.trends.map((linha) => (
                      <li
                        key={linha.key}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="flex items-center gap-2.5 text-subhead text-fg-muted">
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              linha.direction === "up" ? "bg-success" : "bg-warning",
                            )}
                          />
                          {linha.label}
                        </span>
                        {linha.trend ? (
                          <span className="data-mono shrink-0 text-caption text-fg-subtle">
                            {linha.trend}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {presented.rirDelta > 0 ? (
                <p className="text-caption text-fg-subtle">
                  {copy.appliedToWorkout} · {copy.adjustLoad} {presented.loadPct}% ·{" "}
                  {copy.adjustRir} +{presented.rirDelta}
                </p>
              ) : null}

              {result.avoidMuscles.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div>
                    <h3 className="label-brand text-fg-subtle">{copy.avoidTitle}</h3>
                    <p className="mt-1 text-caption text-fg-subtle">{copy.avoidHint}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.avoidMuscles.map((m) => (
                      <Badge key={m} tone="warning">
                        {dict.app.progress.muscles[
                          m as keyof typeof dict.app.progress.muscles
                        ] ?? m}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {!compact && result.needsBaseline ? (
                <Alert tone="info" icon={<Info className="size-4" />}>
                  <strong className="font-semibold">{copy.baselineTitle}.</strong>{" "}
                  {copy.baselineHint}
                </Alert>
              ) : null}

              {!compact ? (
                <p className="text-caption leading-relaxed text-fg-subtle">{copy.honesty}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
