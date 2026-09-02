"use client";

import { useState, useTransition } from "react";

import { Check } from "@/components/ui/icons";
import { Alert, Card, ListGroup, ListRow, Spinner } from "@/components/ui/surface";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import { route } from "@/lib/routes";
import { setRoutineWeekdaysAction } from "@/lib/routines/actions";
import { cn } from "@/lib/utils";

export type RotinaPlaneada = {
  id: string;
  name: string;
  exercises: number;
  weekdays: number[];
};

/** 1 = segunda … 7 = domingo. A ordem é a da semana de treino, não a do Date. */
const DIAS = [1, 2, 3, 4, 5, 6, 7] as const;

/**
 * "A minha semana": a semana em cima, as rotinas em baixo com os sete dias
 * para marcar. Sem arrastar: no telemóvel, um toque por dia é mais rápido e
 * não falha. Cada toque grava logo — não há botão de guardar para esquecer.
 *
 * A mesma rotina pode estar em vários dias (um "corpo inteiro" três vezes por
 * semana) e um dia pode ter mais do que uma rotina.
 */
export function WeekPlanner({
  rotinas,
  hoje,
  copy,
  locale,
}: {
  rotinas: RotinaPlaneada[];
  /** Dia da semana de hoje, 1–7, no fuso da pessoa. */
  hoje: number;
  copy: Dict["app"]["week"];
  locale: Locale;
}) {
  const [lista, setLista] = useState(rotinas);
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, iniciar] = useTransition();
  const [pendente, setPendente] = useState<string | null>(null);

  const nomesDias = copy.days;

  function alternar(rotina: RotinaPlaneada, dia: number) {
    const antes = rotina.weekdays;
    const depois = antes.includes(dia)
      ? antes.filter((d) => d !== dia)
      : [...antes, dia].sort((a, b) => a - b);

    setLista((atual) =>
      atual.map((r) => (r.id === rotina.id ? { ...r, weekdays: depois } : r)),
    );
    setErro(null);
    setPendente(rotina.id);
    iniciar(async () => {
      const r = await setRoutineWeekdaysAction(rotina.id, depois);
      if (!r.ok) {
        setErro(copy.saveFailed);
        setLista((atual) =>
          atual.map((x) => (x.id === rotina.id ? { ...x, weekdays: antes } : x)),
        );
      }
      setPendente(null);
    });
  }

  const porDia = new Map<number, RotinaPlaneada[]>();
  for (const d of DIAS) porDia.set(d, []);
  for (const r of lista) for (const d of r.weekdays) porDia.get(d)?.push(r);

  const diasPlaneados = DIAS.filter((d) => (porDia.get(d)?.length ?? 0) > 0).length;

  return (
    <div className="flex flex-col gap-6">
      {/* A semana, de relance. */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="label-brand text-fg-subtle">{copy.overviewTitle}</h2>
          <span className="text-caption text-fg-subtle">
            {t(copy.daysPlanned, { n: diasPlaneados })}
          </span>
        </div>
        <ul className="grid grid-cols-7 gap-1.5">
          {DIAS.map((d) => {
            const doDia = porDia.get(d) ?? [];
            const ehHoje = d === hoje;
            return (
              <li
                key={d}
                className={cn(
                  "flex min-h-20 flex-col gap-1 rounded-md border p-1.5",
                  ehHoje ? "border-accent bg-accent-soft" : "border-hairline bg-surface",
                )}
              >
                <span
                  className={cn(
                    "text-caption font-semibold uppercase tracking-wider",
                    ehHoje ? "text-accent" : "text-fg-subtle",
                  )}
                >
                  {nomesDias[d - 1]}
                </span>
                {doDia.length === 0 ? (
                  <span className="text-caption text-fg-subtle/70">{copy.restDay}</span>
                ) : (
                  doDia.map((r) => (
                    <span key={r.id} className="truncate text-caption leading-tight text-fg">
                      {r.name}
                    </span>
                  ))
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {erro ? <Alert tone="danger">{erro}</Alert> : null}

      {lista.length === 0 ? (
        <Card className="flex flex-col gap-3">
          <p className="text-callout leading-relaxed text-fg-muted">{copy.noRoutines}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="label-brand px-1 text-fg-subtle">{copy.routinesTitle}</h2>
          {lista.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-callout text-fg">{r.name}</span>
                  <span className="text-caption text-fg-subtle">
                    {t(copy.exercises, { n: r.exercises })}
                  </span>
                </div>
                {pendente === r.id && aGravar ? (
                  <Spinner />
                ) : r.weekdays.length > 0 ? (
                  <Check className="size-4 text-success" />
                ) : null}
              </div>
              <div className="grid grid-cols-7 gap-1.5" role="group" aria-label={r.name}>
                {DIAS.map((d) => {
                  const ativo = r.weekdays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => alternar(r, d)}
                      className={cn(
                        "rounded-md border py-2 text-caption font-semibold uppercase tracking-wider transition-colors",
                        ativo
                          ? "border-accent bg-accent text-accent-fg"
                          : "border-hairline bg-surface text-fg-subtle hover:bg-surface-hover",
                      )}
                    >
                      {nomesDias[d - 1]}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ListGroup footer={copy.hint}>
        <ListRow label={copy.goToWorkout} href={route(locale, "workout")} />
      </ListGroup>
    </div>
  );
}
