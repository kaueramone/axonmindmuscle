import { ActivityChart } from "@/components/admin/activity-chart";
import { Panel, StatGrid, type Stat } from "@/components/admin/stat-grid";
import { Badge } from "@/components/ui/surface";
import { requireAdmin } from "@/lib/admin/guard";
import { compact, volume } from "@/lib/admin/format";
import { assertLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

const ESTADOS: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  strong: { label: "Treinar forte", tone: "success" },
  moderate: { label: "Treinar moderado", tone: "warning" },
  rest: { label: "Descansar", tone: "danger" },
};

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const { supabase } = await requireAdmin(locale);

  const [geral, atividade, topo, prontidao] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase.rpc("admin_daily_activity", { p_days: 30 }),
    supabase.rpc("admin_top_exercises", { p_days: 30, p_limit: 8 }),
    supabase.rpc("admin_readiness_split", { p_days: 30 }),
  ]);

  const o = geral.data?.[0];
  const pontos = atividade.data ?? [];
  const exercicios = topo.data ?? [];
  const estados = prontidao.data ?? [];
  const totalEstados = estados.reduce((soma, e) => soma + Number(e.total), 0);

  const pessoas: Stat[] = [
    {
      label: "Utilizadores",
      value: compact(o?.users_total),
      hint: `+${compact(o?.users_new_7)} nos últimos 7 dias`,
    },
    {
      label: "Ativos (7 d)",
      value: compact(o?.users_active_7),
      hint: `${compact(o?.users_active_30)} em 30 dias`,
    },
    {
      label: "Calibração feita",
      value: compact(o?.users_onboarded),
      hint: o?.users_total
        ? `${Math.round((Number(o.users_onboarded) / Number(o.users_total)) * 100)}% do total`
        : undefined,
    },
    {
      label: "Leads",
      value: compact(o?.leads_total),
      hint: `+${compact(o?.leads_7)} nos últimos 7 dias`,
    },
  ];

  const treino: Stat[] = [
    {
      label: "Treinos",
      value: compact(o?.sessions_total),
      hint: `${compact(o?.sessions_7)} nos últimos 7 dias`,
    },
    {
      label: "Séries",
      value: compact(o?.sets_total),
      hint: `${compact(o?.sets_7)} nos últimos 7 dias`,
    },
    {
      label: "Volume",
      value: volume(o?.volume_total),
      hint: `${volume(o?.volume_7)} nos últimos 7 dias`,
    },
    {
      label: "Check-ins (7 d)",
      value: compact(o?.checkins_7),
      hint: "prontidão registada",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-title1 text-fg">Visão geral</h1>
        <p className="mt-1.5 text-callout text-fg-muted">
          Números da plataforma inteira. Os dados individuais de treino continuam
          fechados — o painel só vê agregados.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="label-brand text-fg-subtle">Pessoas</h2>
        <StatGrid stats={pessoas} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="label-brand text-fg-subtle">Treino</h2>
        <StatGrid stats={treino} />
      </section>

      <Panel title="Séries por dia" hint="Últimos 30 dias">
        <ActivityChart pontos={pontos} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Exercícios mais usados" hint="Últimos 30 dias">
          {exercicios.length === 0 ? (
            <p className="py-4 text-callout text-fg-subtle">Ainda sem dados.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {exercicios.map((e) => (
                <li key={e.exercise_name} className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-callout text-fg-muted">
                    {e.exercise_name}
                  </span>
                  <span className="data-mono shrink-0 text-subhead text-fg">
                    {e.series}
                  </span>
                  <span className="shrink-0 text-caption text-fg-subtle">
                    {e.utilizadores} {Number(e.utilizadores) === 1 ? "pessoa" : "pessoas"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Prontidão" hint="Distribuição dos check-ins nos últimos 30 dias">
          {totalEstados === 0 ? (
            <p className="py-4 text-callout text-fg-subtle">Ainda sem check-ins.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {estados.map((e) => {
                const meta = ESTADOS[e.state] ?? { label: e.state, tone: "success" as const };
                const pct = Math.round((Number(e.total) / totalEstados) * 100);
                return (
                  <li key={e.state} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-callout text-fg-muted">
                      {meta.label}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-strong">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${pct}%`, background: `var(--${meta.tone})` }}
                      />
                    </span>
                    <span className="data-mono w-10 shrink-0 text-right text-subhead text-fg">
                      {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Catálogo e mercados">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone="accent">{compact(o?.exercises_active)} exercícios ativos</Badge>
          <Badge tone={Number(o?.exercises_with_media) > 0 ? "success" : "warning"}>
            {compact(o?.exercises_with_media)} com imagem ou vídeo
          </Badge>
          <Badge>Portugal · {compact(o?.market_pt)}</Badge>
          <Badge>Brasil · {compact(o?.market_br)}</Badge>
        </div>
      </Panel>
    </div>
  );
}
