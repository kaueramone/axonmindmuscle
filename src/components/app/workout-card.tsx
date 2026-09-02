import { Bolt } from "@/components/ui/icons";
import type { WorkoutSummary } from "@/lib/community/shared";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

const TOM = {
  strong: "text-success",
  moderate: "text-warning",
  rest: "text-danger",
} as const;

/**
 * O treino partilhado, dentro do post. Mostra só o que existe no resumo — e o
 * resumo só tem o que a pessoa marcou ao partilhar. Um cartão sem totais e
 * sem exercícios é possível (só recordes, por exemplo) e continua a fazer
 * sentido.
 */
export function WorkoutCard({
  resumo,
  copy,
  states,
}: {
  resumo: WorkoutSummary;
  copy: Dict["app"]["community"];
  states: Dict["readiness"]["states"];
}) {
  const temTotais = resumo.duration_min != null || resumo.volume_kg != null;
  const exercicios = resumo.exercises ?? [];
  const recordes = resumo.records ?? [];

  return (
    <div className="mt-2.5 flex flex-col gap-3 rounded-lg border border-accent/25 bg-accent-soft/40 p-3.5">
      <div className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-accent">
        <Bolt className="size-3.5" />
        {copy.workoutCardTitle}
      </div>

      {temTotais ? (
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {resumo.duration_min != null ? (
            <Stat valor={String(resumo.duration_min)} unidade="min" rotulo={copy.workoutDuration} />
          ) : null}
          {resumo.volume_kg != null ? (
            <Stat
              valor={resumo.volume_kg.toLocaleString("pt")}
              unidade="kg"
              rotulo={copy.workoutVolume}
            />
          ) : null}
          {resumo.sets != null ? (
            <Stat valor={String(resumo.sets)} unidade="" rotulo={copy.workoutSets} />
          ) : null}
        </div>
      ) : null}

      {exercicios.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {exercicios.map((e) => (
            <li key={e.name} className="flex items-baseline justify-between gap-3 text-subhead">
              <span className="truncate text-fg">{e.name}</span>
              <span className="data-mono shrink-0 text-caption text-fg-subtle tabular-nums">
                {e.best_weight_kg != null
                  ? `${e.sets} × ${e.best_weight_kg} kg`
                  : e.duration_s > 0
                    ? `${Math.round(e.duration_s / 60)} min`
                    : t(copy.workoutSetsShort, { n: e.sets })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {recordes.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-caption font-medium text-fg-muted">{copy.workoutRecords}</p>
          <ul className="flex flex-wrap gap-1.5">
            {recordes.map((r) => (
              <li
                key={r.name}
                className="rounded-full border border-success/30 bg-success/12 px-2.5 py-1 text-caption text-success"
              >
                {r.name} · {r.weight_kg} kg{r.reps != null ? ` × ${r.reps}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {resumo.readiness ? (
        <p className="text-caption text-fg-subtle">
          {copy.workoutReadiness}{" "}
          <span className={cn("data-mono", TOM[resumo.readiness.state])}>
            {resumo.readiness.score}
          </span>{" "}
          · {states[resumo.readiness.state]}
        </p>
      ) : null}
    </div>
  );
}

function Stat({ valor, unidade, rotulo }: { valor: string; unidade: string; rotulo: string }) {
  return (
    <span className="flex flex-col">
      <span className="data-mono text-title3 text-fg tabular-nums">
        {valor}
        {unidade ? <span className="ml-0.5 text-caption text-fg-subtle">{unidade}</span> : null}
      </span>
      <span className="text-caption text-fg-subtle">{rotulo}</span>
    </span>
  );
}
