import { Card } from "@/components/ui/surface";
import type { Dict } from "@/lib/i18n/types";

export type LoadDay = {
  dia: string;
  sessoes: number;
  minutos: number;
  carga: number;
  minutos_cardio: number;
};

export type ZoneRow = { zona: string; minutos: number };

const ZONA_TOM: Record<string, string> = {
  facil: "success",
  moderado: "warning",
  forte: "danger",
};

/**
 * Carga = esforço percebido × minutos, somado no período. Só conta sessões em
 * que a pessoa respondeu ao esforço — por isso mostramos os minutos ao lado,
 * que existem sempre, para o número não parecer menor do que o treino foi.
 */
export function LoadSummary({
  dias,
  zonas,
  copy,
  zoneLabels,
}: {
  dias: LoadDay[];
  zonas: ZoneRow[];
  copy: Dict["app"]["progress"];
  zoneLabels: Dict["workout"]["zones"];
}) {
  const carga = dias.reduce((t, d) => t + Number(d.carga ?? 0), 0);
  const minutos = dias.reduce((t, d) => t + Number(d.minutos ?? 0), 0);
  const cardio = dias.reduce((t, d) => t + Number(d.minutos_cardio ?? 0), 0);

  if (minutos === 0) return null;

  const totalZonas = zonas.reduce((t, z) => t + Number(z.minutos ?? 0), 0);

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="label-brand text-fg-subtle">{copy.loadTitle}</h2>
        <p className="mt-2 text-caption leading-relaxed text-fg-subtle">
          {copy.loadHint}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-caption text-fg-subtle">{copy.loadLabel}</p>
          <p className="data-mono mt-1 text-title3 text-fg tabular-nums">
            {Math.round(carga)}
          </p>
        </div>
        <div>
          <p className="text-caption text-fg-subtle">{copy.minutesLabel}</p>
          <p className="data-mono mt-1 text-title3 text-fg tabular-nums">
            {Math.round(minutos)}
            <span className="ml-1 text-footnote text-fg-subtle">
              {copy.minutesUnit}
            </span>
          </p>
        </div>
        <div>
          <p className="text-caption text-fg-subtle">{copy.cardioLabel}</p>
          <p className="data-mono mt-1 text-title3 text-fg tabular-nums">
            {Math.round(cardio)}
            <span className="ml-1 text-footnote text-fg-subtle">
              {copy.minutesUnit}
            </span>
          </p>
        </div>
      </div>

      {totalZonas > 0 ? (
        <div className="flex flex-col gap-3 border-t border-hairline pt-4">
          <h3 className="text-caption text-fg-subtle">{copy.zonesTitle}</h3>
          <ul className="flex flex-col gap-2.5">
            {zonas.map((z) => {
              const pct = (Number(z.minutos) / totalZonas) * 100;
              return (
                <li key={z.zona} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-subhead text-fg-muted">
                    {zoneLabels[z.zona as keyof typeof zoneLabels]}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-strong">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: `var(--${ZONA_TOM[z.zona] ?? "accent"})`,
                      }}
                    />
                  </span>
                  <span className="data-mono w-12 shrink-0 text-right text-subhead text-fg tabular-nums">
                    {Math.round(Number(z.minutos))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
