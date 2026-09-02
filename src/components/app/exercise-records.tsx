"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Trash } from "@/components/ui/icons";
import { Alert, Card, Spinner } from "@/components/ui/surface";
import { formatDate, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import { deleteExerciseHistoryAction } from "@/lib/workout/history-actions";

export type ExerciseRecord = {
  exercise_id: string | null;
  exercise_name: string;
  sets: number;
  sessions: number;
  best_weight_kg: number | null;
  best_reps: number | null;
  last_date: string | null;
};

const MOSTRAR_INICIALMENTE = 8;

/**
 * Cada exercício com a melhor marca e um botão para apagar tudo o que lhe
 * pertence. O botão pede confirmação na própria linha, com o nome do
 * exercício no texto — apagar o histórico errado por um toque a mais é o
 * pior resultado possível aqui, e um diálogo genérico não o evita.
 */
export function ExerciseRecords({
  registos,
  copy,
  locale,
}: {
  registos: ExerciseRecord[];
  copy: Dict["app"]["progress"];
  locale: Locale;
}) {
  const [lista, setLista] = useState(registos);
  const [todos, setTodos] = useState(false);
  const [aConfirmar, setAConfirmar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tom: "info" | "danger"; texto: string } | null>(
    null,
  );
  const [aCorrer, iniciar] = useTransition();

  if (lista.length === 0) return null;

  const chave = (r: ExerciseRecord) => `${r.exercise_id ?? ""}|${r.exercise_name}`;
  const visiveis = todos ? lista : lista.slice(0, MOSTRAR_INICIALMENTE);

  function apagar(r: ExerciseRecord) {
    setAviso(null);
    iniciar(async () => {
      const res = await deleteExerciseHistoryAction({
        exerciseId: r.exercise_id,
        exerciseName: r.exercise_name,
      });
      if (!res.ok) {
        setAviso({ tom: "danger", texto: copy.exercisesDeleteFailed });
        return;
      }
      setLista((atual) => atual.filter((x) => chave(x) !== chave(r)));
      setAConfirmar(null);
      setAviso({
        tom: "info",
        texto: t(copy.exercisesDeleted, { name: r.exercise_name, n: res.sets }),
      });
    });
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="label-brand text-fg-subtle">{copy.exercisesTitle}</h2>
        <p className="mt-2 text-caption leading-relaxed text-fg-subtle">
          {copy.exercisesHint}
        </p>
      </div>

      {aviso ? <Alert tone={aviso.tom}>{aviso.texto}</Alert> : null}

      <ul className="flex flex-col divide-y divide-hairline">
        {visiveis.map((r) => {
          const id = chave(r);
          const confirmando = aConfirmar === id;
          return (
            <li key={id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-callout text-fg">{r.exercise_name}</span>
                  <span className="text-caption text-fg-subtle">
                    {t(copy.exercisesSets, { n: r.sets, s: r.sessions })}
                    {r.last_date
                      ? ` · ${t(copy.exercisesLast, {
                          date: formatDate(`${r.last_date}T12:00:00Z`, locale, {
                            day: "2-digit",
                            month: "short",
                            timeZone: "UTC",
                          }),
                        })}`
                      : null}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {r.best_weight_kg != null ? (
                    <span className="flex flex-col items-end">
                      <span className="text-caption text-fg-subtle">{copy.exercisesBest}</span>
                      <span className="data-mono text-subhead text-fg tabular-nums">
                        {r.best_weight_kg} kg
                        {r.best_reps != null ? ` × ${r.best_reps}` : ""}
                      </span>
                    </span>
                  ) : null}
                  {!confirmando ? (
                    <button
                      type="button"
                      aria-label={`${copy.exercisesDelete}: ${r.exercise_name}`}
                      onClick={() => {
                        setAviso(null);
                        setAConfirmar(id);
                      }}
                      className="rounded-md p-2 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-danger"
                    >
                      <Trash className="size-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              {confirmando ? (
                <div className="flex flex-col gap-2.5">
                  <Alert tone="danger">
                    {t(copy.exercisesDeleteConfirm, { name: r.exercise_name })}
                  </Alert>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      disabled={aCorrer}
                      onClick={() => setAConfirmar(null)}
                    >
                      {copy.exercisesDeleteKeep}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      fullWidth
                      disabled={aCorrer}
                      onClick={() => apagar(r)}
                    >
                      {aCorrer ? <Spinner /> : <Trash className="size-4" />}
                      {copy.exercisesDeleteGo}
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!todos && lista.length > MOSTRAR_INICIALMENTE ? (
        <Button type="button" variant="ghost" fullWidth onClick={() => setTodos(true)}>
          {t(copy.exercisesShowAll, { n: lista.length })}
        </Button>
      ) : null}
    </Card>
  );
}
