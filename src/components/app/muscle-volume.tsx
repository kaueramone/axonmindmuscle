import { Card } from "@/components/ui/surface";
import type { Dict } from "@/lib/i18n/types";
import type { MuscleGroup } from "@/lib/supabase/types";

export type MuscleRow = { muscle: MuscleGroup; sets: number; volume_kg: number | null };

/**
 * Séries por grupo muscular.
 *
 * A barra é só apoio de leitura — o número está sempre escrito ao lado,
 * porque a comparação entre grupos tem de funcionar sem depender de
 * comprimento nem de cor.
 */
export function MuscleVolume({
  rows,
  copy,
}: {
  rows: MuscleRow[];
  copy: Dict["app"]["progress"];
}) {
  if (rows.length === 0) return null;

  const maximo = Math.max(...rows.map((r) => r.sets), 1);

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="text-headline font-semibold text-fg">{copy.byMuscle}</h2>
        <p className="mt-1.5 text-footnote leading-relaxed text-fg-subtle">
          {copy.byMuscleHint}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const nome =
            copy.muscles[row.muscle as keyof typeof copy.muscles] ?? row.muscle;
          return (
            <li key={row.muscle} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-subhead text-fg-muted">
                {nome}
              </span>
              <span
                className="h-2 flex-1 overflow-hidden rounded-full bg-surface-strong"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(4, Math.round((row.sets / maximo) * 100))}%` }}
                />
              </span>
              <span className="data-mono shrink-0 text-subhead text-fg tabular-nums">
                {row.sets}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
