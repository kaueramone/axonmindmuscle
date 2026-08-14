import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { ReadinessPanel } from "@/components/app/readiness-panel";
import { getDictionary } from "@/lib/i18n";
import { assertLocale } from "@/lib/i18n/config";
import type { ReadinessContext, ReadinessResult } from "@/lib/readiness/score";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { localDate } from "@/lib/workout/periods";

export const metadata: Metadata = { title: "Prontidão", robots: { index: false } };

export default async function ReadinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();

  const hoje = localDate(new Date(), profile?.timezone ?? "Europe/Lisbon");

  const [{ data: contexto }, { data: registoDeHoje }] = await Promise.all([
    supabase.rpc("readiness_context"),
    supabase
      .from("readiness_checkins")
      .select("score, state, drivers, sore_muscles")
      .eq("user_id", user.id)
      .eq("local_date", hoje)
      .maybeSingle(),
  ]);

  const linha = Array.isArray(contexto) ? contexto[0] : contexto;

  const context: ReadinessContext = {
    baselineRestingHr: linha?.baseline_resting_hr ?? null,
    baselineSleepHours: linha?.baseline_sleep_hours ?? null,
    baselineDays: linha?.baseline_days ?? 0,
    daysSinceLastSession: linha?.days_since_last_session ?? null,
    consecutiveDays: linha?.consecutive_days ?? 0,
    setsLast7: linha?.sets_last_7 ?? 0,
    avgWeeklySets: Number(linha?.avg_weekly_sets ?? 0),
    recentMuscles: linha?.recent_muscles ?? [],
  };

  const existing: ReadinessResult | null = registoDeHoje
    ? {
        score: registoDeHoje.score,
        state: registoDeHoje.state,
        drivers: (registoDeHoje.drivers ?? []) as ReadinessResult["drivers"],
        avoidMuscles: [
          ...new Set([
            ...(registoDeHoje.sore_muscles ?? []),
            ...context.recentMuscles,
          ]),
        ],
        needsBaseline: context.baselineDays < 5,
      }
    : null;

  return (
    <>
      <AppHeader
        title={dict.readiness.title}
        locale={locale}
        accountLabel={dict.nav.account}
        themeLabels={{
          light: dict.app.account.appearanceLight,
          dark: dict.app.account.appearanceDark,
        }}
        eyebrow={dict.common.tagline}
      />

      <div className="mx-auto max-w-2xl px-5 pt-6">
        <ReadinessPanel
          locale={locale}
          dict={dict}
          context={context}
          existing={existing}
        />
      </div>
    </>
  );
}
