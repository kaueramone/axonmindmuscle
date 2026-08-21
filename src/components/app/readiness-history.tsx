import { Card } from "@/components/ui/surface";
import type { Dict } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export type ReadinessSummary = {
  dias_registados: number;
  dias_forte: number;
  dias_moderado: number;
  dias_descanso: number;
  score_medio: number | null;
  score_melhor: number | null;
  dia_melhor: string | null;
};

export type ReadinessDay = { dia: string; score: number; estado: string };

/**
 * Os três estados são cores de estado — as mesmas que o painel de prontidão e a
 * página inicial já usam — e nunca aparecem sozinhas: cada barra tem o seu
 * rótulo e a sua contagem ao lado.
 */
const ESTADOS = [
  { chave: "strong", tom: "success" },
  { chave: "moderate", tom: "warning" },
  { chave: "rest", tom: "danger" },
] as const;

export function ReadinessHistory({
  resumo,
  dias,
  copy,
  states,
  locale,
  mostrarDiario,
}: {
  resumo: ReadinessSummary | null;
  dias: ReadinessDay[];
  copy: Dict["app"]["progress"];
  states: Dict["readiness"]["states"];
  locale: Locale;
  mostrarDiario: boolean;
}) {
  const total = Number(resumo?.dias_registados ?? 0);

  if (!resumo || total === 0) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="label-brand text-fg-subtle">{copy.readinessTitle}</h2>
        <p className="text-callout leading-relaxed text-fg-muted">
          {copy.readinessEmpty}
        </p>
      </Card>
    );
  }

  const contagens: Record<string, number> = {
    strong: Number(resumo.dias_forte ?? 0),
    moderate: Number(resumo.dias_moderado ?? 0),
    rest: Number(resumo.dias_descanso ?? 0),
  };

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="label-brand text-fg-subtle">{copy.readinessTitle}</h2>
        <p className="mt-2 text-caption leading-relaxed text-fg-subtle">
          {copy.readinessHint}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {ESTADOS.map(({ chave, tom }) => {
          const n = contagens[chave] ?? 0;
          const pct = total > 0 ? (n / total) * 100 : 0;
          return (
            <li key={chave} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-subhead text-fg-muted">
                {states[chave as keyof typeof states]}
              </span>
              {/* A pista existe para a percentagem ser relativa à linha
                  inteira, e não à largura que a barra já ocupa. */}
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-strong">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${pct}%`, background: `var(--${tom})` }}
                />
              </span>
              <span className="data-mono w-8 shrink-0 text-right text-subhead text-fg tabular-nums">
                {n}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-3 gap-3 border-t border-hairline pt-4">
        <div>
          <p className="text-caption text-fg-subtle">{copy.readinessDays}</p>
          <p className="data-mono mt-1 text-title3 text-fg">{total}</p>
        </div>
        <div>
          <p className="text-caption text-fg-subtle">{copy.readinessAvg}</p>
          <p className="data-mono mt-1 text-title3 text-fg">
            {resumo.score_medio ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-caption text-fg-subtle">{copy.readinessBest}</p>
          <p className="mt-1 text-subhead text-fg">
            {resumo.dia_melhor
              ? formatDate(`${resumo.dia_melhor}T12:00:00Z`, locale, {
                  day: "2-digit",
                  month: "short",
                  timeZone: "UTC",
                })
              : "—"}
          </p>
        </div>
      </div>

      {mostrarDiario && dias.length > 1 ? (
        <div className="flex flex-col gap-2 border-t border-hairline pt-4">
          <div className="flex h-20 items-end gap-[3px]">
            {dias.map((d) => {
              const tom =
                d.estado === "strong"
                  ? "success"
                  : d.estado === "moderate"
                    ? "warning"
                    : "danger";
              return (
                <span
                  key={d.dia}
                  title={`${d.dia} · ${d.score}`}
                  className="flex h-full flex-1 items-end"
                >
                  <span
                    className="w-full rounded-t-[2px]"
                    style={{
                      height: `${Math.max(6, Number(d.score))}%`,
                      background: `var(--${tom})`,
                    }}
                  />
                </span>
              );
            })}
          </div>
          <p className={cn("flex justify-between text-caption text-fg-subtle")}>
            <span>{dias[0]?.dia.slice(8)}/{dias[0]?.dia.slice(5, 7)}</span>
            <span>
              {dias[dias.length - 1]?.dia.slice(8)}/
              {dias[dias.length - 1]?.dia.slice(5, 7)}
            </span>
          </p>
        </div>
      ) : null}
    </Card>
  );
}
