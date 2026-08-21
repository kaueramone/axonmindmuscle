import { dayLabel } from "@/lib/admin/format";

type Ponto = {
  dia: string;
  novos_utilizadores: number;
  sessoes: number;
  series: number;
  utilizadores_ativos: number;
};

/**
 * Barras de séries por dia. Sem biblioteca de gráficos: a altura é uma
 * percentagem do máximo do período, calculada no servidor.
 */
export function ActivityChart({ pontos }: { pontos: Ponto[] }) {
  const maximo = Math.max(1, ...pontos.map((p) => Number(p.series)));

  if (pontos.every((p) => Number(p.series) === 0)) {
    return (
      <p className="py-6 text-center text-callout text-fg-subtle">
        Ainda não há séries registadas neste período.
      </p>
    );
  }

  return (
    <div>
      <div className="flex h-40 items-end gap-[3px]">
        {pontos.map((p) => {
          const altura = (Number(p.series) / maximo) * 100;
          return (
            <span
              key={p.dia}
              title={`${dayLabel(p.dia)} · ${p.series} séries · ${p.utilizadores_ativos} utilizadores`}
              className="flex h-full flex-1 items-end"
            >
              <span
                className="w-full rounded-t-[2px] bg-accent/70 transition-colors hover:bg-accent"
                style={{ height: `${Math.max(altura, Number(p.series) > 0 ? 3 : 0)}%` }}
              />
            </span>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-caption text-fg-subtle">
        <span>{dayLabel(pontos[0]?.dia ?? "")}</span>
        <span className="data-mono">máx. {maximo} séries/dia</span>
        <span>{dayLabel(pontos[pontos.length - 1]?.dia ?? "")}</span>
      </div>
    </div>
  );
}
