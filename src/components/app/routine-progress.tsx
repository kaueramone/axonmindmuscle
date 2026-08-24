import { Card } from "@/components/ui/surface";
import { formatDate, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";

export type RoutineWeek = {
  semana: string;
  sessoes: number;
  series: number;
  volume: number;
  minutos: number;
  rpe_medio: number | null;
  prontidao_media: number | null;
};

export type RoutineWeeks = {
  id: string;
  name: string;
  semanas: RoutineWeek[];
};

/**
 * A resposta à pergunta que a pessoa faz mesmo: esta semana correu melhor que
 * a passada?
 *
 * Volume e esforço lado a lado de propósito. Mais volume com o mesmo esforço é
 * progresso; o mesmo volume com mais esforço é um aviso. Qualquer um dos
 * números sozinho conta metade da história e a metade errada.
 */
export function RoutineProgress({
  rotinas,
  copy,
  locale,
}: {
  rotinas: RoutineWeeks[];
  copy: Dict["workout"]["routines"];
  locale: Locale;
}) {
  const comDados = rotinas.filter((r) => r.semanas.length > 0);
  if (comDados.length === 0) return null;

  const nf = new Intl.NumberFormat(locale === "pt-br" ? "pt-BR" : "pt-PT", {
    maximumFractionDigits: 0,
  });

  return (
    <section className="flex flex-col gap-4">
      <h2 className="label-brand px-1 text-fg-subtle">{copy.weekTitle}</h2>

      {comDados.map((rotina) => (
        <Card key={rotina.id} className="flex flex-col gap-4">
          <h3 className="text-headline font-semibold text-fg">{rotina.name}</h3>

          {rotina.semanas.length < 2 ? (
            <p className="text-callout leading-relaxed text-fg-muted">
              {copy.weekNone}
            </p>
          ) : null}

          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[26rem] border-collapse text-left">
              <thead>
                <tr className="text-caption text-fg-subtle">
                  <th className="px-1 pb-2 font-medium">{copy.weekOfShort}</th>
                  <th className="px-1 pb-2 text-right font-medium">
                    {copy.weekSessions}
                  </th>
                  <th className="px-1 pb-2 text-right font-medium">
                    {copy.weekVolume}
                  </th>
                  <th className="px-1 pb-2 text-right font-medium">{copy.weekRpe}</th>
                  <th className="px-1 pb-2 text-right font-medium">
                    {copy.weekReadiness}
                  </th>
                </tr>
              </thead>
              <tbody className="text-callout tabular-nums">
                {rotina.semanas.map((semana, i) => {
                  // As semanas vêm da mais recente para a mais antiga, por isso
                  // a anterior é a linha de baixo.
                  const antes = rotina.semanas[i + 1];
                  const delta =
                    antes && antes.volume > 0
                      ? ((semana.volume - antes.volume) / antes.volume) * 100
                      : null;

                  return (
                    <tr key={semana.semana} className="border-t border-hairline">
                      <td className="px-1 py-2.5 text-fg">
                        {formatDate(new Date(semana.semana), locale, {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                      <td className="px-1 py-2.5 text-right text-fg-muted">
                        {semana.sessoes}
                      </td>
                      <td className="px-1 py-2.5 text-right text-fg">
                        {nf.format(semana.volume)}
                        {delta !== null && Math.abs(delta) >= 1 ? (
                          <span
                            className={
                              delta > 0
                                ? "ml-1.5 text-caption text-success"
                                : "ml-1.5 text-caption text-fg-subtle"
                            }
                          >
                            {delta > 0 ? "+" : "−"}
                            {Math.abs(Math.round(delta))}%
                          </span>
                        ) : null}
                      </td>
                      <td className="px-1 py-2.5 text-right text-fg-muted">
                        {semana.rpe_medio ?? "—"}
                      </td>
                      <td className="px-1 py-2.5 text-right text-fg-muted">
                        {semana.prontidao_media ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-footnote leading-relaxed text-fg-subtle">
            {t(copy.weekHint, { unit: copy.weekVolumeUnit })}
          </p>
        </Card>
      ))}
    </section>
  );
}
