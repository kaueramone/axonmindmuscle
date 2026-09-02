import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { ExerciseRecords, type ExerciseRecord } from "@/components/app/exercise-records";
import { LoadSummary, type LoadDay, type ZoneRow } from "@/components/app/load-summary";
import {
  ReadinessCheck,
  type ReadinessPerformance,
} from "@/components/app/readiness-check";
import {
  RoutineProgress,
  type RoutineWeek,
  type RoutineWeeks,
} from "@/components/app/routine-progress";
import { MuscleVolume, type MuscleRow } from "@/components/app/muscle-volume";
import {
  ReadinessHistory,
  type ReadinessDay,
  type ReadinessSummary,
} from "@/components/app/readiness-history";
import { TimezoneSync } from "@/components/app/timezone-sync";
import { Card } from "@/components/ui/surface";
import { getDictionary } from "@/lib/i18n";
import { assertLocale, formatDate } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  PERIODS,
  formatVolume,
  localDate,
  periodRange,
  weeklyStreak,
  type PeriodKey,
} from "@/lib/workout/periods";

export const metadata: Metadata = { title: "Progresso", robots: { index: false } };

export default async function ProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const { p } = await searchParams;
  const dict = await getDictionary(locale);
  const copy = dict.app.progress;

  const period: PeriodKey = (PERIODS as string[]).includes(p ?? "")
    ? (p as PeriodKey)
    : "week";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, weekly_frequency")
    .eq("id", user.id)
    .maybeSingle();

  const timezone = profile?.timezone ?? "Europe/Lisbon";
  const frequencia = profile?.weekly_frequency ?? 3;
  const { from, to } = periodRange(period, timezone);
  const hoje = localDate(new Date(), timezone);

  const [
    { data: series },
    { data: porMusculo },
    { data: diasTreinados },
    { data: prontidaoResumo },
    { data: prontidaoDias },
    { data: cargaDias },
    { data: zonasCardio },
  ] = await Promise.all([
      supabase
        .from("workout_sets_local")
        .select("exercise_name, weight_kg, reps, rir, volume_kg, completed_at, local_date")
        .gte("local_date", from)
        .lte("local_date", to)
        .order("completed_at", { ascending: false }),
      supabase.rpc("training_sets_by_muscle", { p_from: from, p_to: to }),
      // O ano anterior e o corrente chegam para a sequência semanal.
      supabase
        .from("workout_sets_local")
        .select("local_date")
        .gte("local_date", `${Number(hoje.slice(0, 4)) - 1}-01-01`),
      supabase.rpc("readiness_summary", { p_from: from, p_to: to }),
      supabase.rpc("readiness_history", { p_from: from, p_to: to }),
      supabase.rpc("training_load_summary", { p_from: from, p_to: to }),
      supabase.rpc("cardio_minutes_by_zone", { p_from: from, p_to: to }),
    ]);

  // Semana a semana de cada treino guardado. Três chega: são os que a pessoa
  // está mesmo a repetir, e cada um custa uma consulta.
  const { data: rotinasAtivas } = await supabase
    .from("routines")
    .select("id, name")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(3);

  const rotinasComSemanas: RoutineWeeks[] = await Promise.all(
    (rotinasAtivas ?? []).map(async (r) => {
      const { data } = await supabase.rpc("routine_week_summary", {
        p_routine: r.id,
        p_weeks: 8,
      });
      return { id: r.id, name: r.name, semanas: (data ?? []) as RoutineWeek[] };
    }),
  );

  // A prontidão a prestar contas: o que previu contra o que aconteceu.
  const [{ data: prontidaoVsDesempenho }, { data: exercicios }] = await Promise.all([
    supabase.rpc("readiness_vs_performance", { p_from: from, p_to: to }),
    // Todos os exercícios, sem filtro de período: é a lista de onde se apaga.
    supabase.rpc("exercise_history_summary"),
  ]);

  const linhas = series ?? [];
  const volumeTotal = linhas.reduce((total, s) => total + Number(s.volume_kg ?? 0), 0);
  const diasDistintos = new Set(linhas.map((s) => s.local_date)).size;
  const sequencia = weeklyStreak(
    (diasTreinados ?? []).map((d) => d.local_date as string),
    frequencia,
    hoje,
  );

  const stats =
    period === "day"
      ? [
          { label: copy.setsLabel, value: String(linhas.length), unit: "" },
          { label: copy.volume, value: formatVolume(volumeTotal, locale), unit: "" },
          { label: copy.sessions, value: String(diasDistintos), unit: "" },
        ]
      : [
          { label: copy.streakWeeks, value: String(sequencia), unit: copy.weeks },
          { label: copy.sessions, value: String(diasDistintos), unit: "" },
          { label: copy.volume, value: formatVolume(volumeTotal, locale), unit: "" },
        ];

  return (
    <>
      <TimezoneSync current={profile?.timezone ?? null} />

      <AppHeader
        title={copy.title}
        locale={locale}
        accountLabel={dict.nav.account}
        themeLabels={{
          light: dict.app.account.appearanceLight,
          dark: dict.app.account.appearanceDark,
        }}
        eyebrow={dict.common.tagline}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 pt-6">
        {/* Seletor de período: links, para o estado viver no URL e ser partilhável */}
        <nav className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5">
          {PERIODS.map((chave) => {
            const ativo = chave === period;
            return (
              <Link
                key={chave}
                href={`${route(locale, "progress")}?p=${chave}`}
                scroll={false}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-subhead transition-colors",
                  ativo
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-hairline bg-surface text-fg-muted hover:text-fg",
                )}
              >
                {copy.periods[chave]}
              </Link>
            );
          })}
        </nav>

        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-4">
              <p className="text-caption text-fg-subtle">{stat.label}</p>
              <p className="data-mono mt-2 whitespace-nowrap text-title2 text-fg sm:text-title1">
                {stat.value}
                {stat.unit ? (
                  <span className="ml-1 text-footnote text-fg-subtle">{stat.unit}</span>
                ) : null}
              </p>
            </Card>
          ))}
        </div>

        {period !== "day" ? (
          <p className="px-1 text-caption leading-relaxed text-fg-subtle">
            {copy.streakHint}
          </p>
        ) : null}

        <LoadSummary
          dias={(cargaDias ?? []) as LoadDay[]}
          zonas={(zonasCardio ?? []) as ZoneRow[]}
          copy={copy}
          zoneLabels={dict.workout.zones}
        />

        <ReadinessCheck
          linhas={(prontidaoVsDesempenho ?? []) as ReadinessPerformance[]}
          copy={copy}
          states={dict.readiness.states}
          locale={locale}
        />

        <RoutineProgress
          rotinas={rotinasComSemanas}
          copy={dict.workout.routines}
          locale={locale}
        />

        <ExerciseRecords
          registos={(exercicios ?? []) as ExerciseRecord[]}
          copy={copy}
          locale={locale}
        />

        <ReadinessHistory
          resumo={((prontidaoResumo ?? [])[0] ?? null) as ReadinessSummary | null}
          dias={(prontidaoDias ?? []) as ReadinessDay[]}
          copy={copy}
          states={dict.readiness.states}
          locale={locale}
          mostrarDiario={period !== "year"}
        />

        {linhas.length === 0 ? (
          <Card>
            <p className="text-callout text-fg-muted">
              {period === "day" ? copy.empty : copy.noDataPeriod}
            </p>
          </Card>
        ) : (
          <>
            {period !== "day" ? (
              <MuscleVolume rows={(porMusculo ?? []) as MuscleRow[]} copy={copy} />
            ) : null}

            <div className="flex flex-col gap-2">
              {linhas.slice(0, 60).map((serie, index) => (
                <Card
                  key={index}
                  className="flex items-center justify-between gap-3 py-3.5"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-callout text-fg">
                      {serie.exercise_name}
                    </span>
                    <span className="text-caption text-fg-subtle">
                      {formatDate(serie.completed_at as string, locale, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: timezone,
                      })}
                      {serie.rir !== null ? ` · RIR ${serie.rir}` : ""}
                    </span>
                  </span>
                  <span className="data-mono shrink-0 text-callout text-fg-muted">
                    {serie.weight_kg ? `${serie.weight_kg} kg × ` : ""}
                    {serie.reps}
                  </span>
                </Card>
              ))}
            </div>

            <p className="px-1 text-caption leading-relaxed text-fg-subtle">
              {copy.volumeHint}
            </p>
          </>
        )}
      </div>
    </>
  );
}
