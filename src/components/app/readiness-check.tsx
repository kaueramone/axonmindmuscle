import { Card } from "@/components/ui/surface";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";

export type ReadinessPerformance = {
  estado: "strong" | "moderate" | "rest";
  sessoes: number;
  rpe_medio: number | null;
  volume_medio: number | null;
  series_medias: number | null;
  rir_medio: number | null;
};

/** Abaixo disto, um estado não diz nada e não deve ser mostrado como se dissesse. */
const SESSOES_POR_ESTADO = 3;
/** E abaixo disto o bloco inteiro é ruído. */
const SESSOES_NO_TOTAL = 8;

/**
 * A prontidão a prestar contas.
 *
 * O cuidado aqui não é técnico, é de honestidade. Isto é uma heurística, não um
 * marcador validado de recuperação, e com meia dúzia de sessões não diz
 * rigorosamente nada. Por isso há limiares: cada estado precisa de sessões que
 * cheguem para aparecer, e o bloco só existe de todo quando há histórico que o
 * sustente. Prometer precisão aqui seria a forma mais rápida de perder a
 * confiança que a funcionalidade existe para ganhar.
 */
export function ReadinessCheck({
  linhas,
  copy,
  states,
  locale,
}: {
  linhas: ReadinessPerformance[];
  copy: Dict["app"]["progress"];
  states: Dict["readiness"]["states"];
  locale: Locale;
}) {
  const total = linhas.reduce((n, l) => n + l.sessoes, 0);
  const uteis = linhas.filter((l) => l.sessoes >= SESSOES_POR_ESTADO);

  if (total < SESSOES_NO_TOTAL || uteis.length < 2) return null;

  const nf = new Intl.NumberFormat(locale === "pt-br" ? "pt-BR" : "pt-PT", {
    maximumFractionDigits: 0,
  });

  const ordem = { strong: 0, moderate: 1, rest: 2 } as const;
  const ordenadas = [...uteis].sort((a, b) => ordem[a.estado] - ordem[b.estado]);

  const forte = ordenadas.find((l) => l.estado === "strong");
  const descanso = ordenadas.find((l) => l.estado === "rest");

  // A leitura só é escrita quando há os dois extremos para comparar. Com um
  // extremo só, qualquer frase seria uma insinuação.
  const leitura =
    forte && descanso && forte.volume_medio != null && descanso.volume_medio != null
      ? t(copy.readinessRead, {
          alto: nf.format(forte.volume_medio),
          altoEsforco: String(forte.rpe_medio ?? "—"),
          baixo: nf.format(descanso.volume_medio),
          baixoEsforco: String(descanso.rpe_medio ?? "—"),
        })
      : null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-headline font-semibold text-fg">{copy.readinessCheckTitle}</h2>
        {leitura ? (
          <p className="text-callout leading-relaxed text-fg-muted">{leitura}</p>
        ) : null}
      </div>

      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[22rem] border-collapse text-left">
          <thead>
            <tr className="text-caption text-fg-subtle">
              <th className="px-1 pb-2 font-medium">{copy.readinessArrival}</th>
              <th className="px-1 pb-2 text-right font-medium">{copy.sessions}</th>
              <th className="px-1 pb-2 text-right font-medium">{copy.volume}</th>
              <th className="px-1 pb-2 text-right font-medium">{copy.readinessEffort}</th>
            </tr>
          </thead>
          <tbody className="text-callout tabular-nums">
            {ordenadas.map((linha) => (
              <tr key={linha.estado} className="border-t border-hairline">
                <td className="px-1 py-2.5 text-fg">{states[linha.estado]}</td>
                <td className="px-1 py-2.5 text-right text-fg-muted">{linha.sessoes}</td>
                <td className="px-1 py-2.5 text-right text-fg">
                  {linha.volume_medio != null ? nf.format(linha.volume_medio) : "—"}
                </td>
                <td className="px-1 py-2.5 text-right text-fg-muted">
                  {linha.rpe_medio ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-footnote leading-relaxed text-fg-subtle">
        {copy.readinessCaveat}
      </p>
    </Card>
  );
}
