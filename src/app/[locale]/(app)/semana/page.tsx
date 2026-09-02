import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { WeekPlanner, type RotinaPlaneada } from "@/components/app/week-planner";
import { getDictionary } from "@/lib/i18n";
import { assertLocale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { isoWeekday } from "@/lib/workout/periods";

export const metadata: Metadata = { title: "A minha semana", robots: { index: false } };

export default async function WeekPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  const copy = dict.app.week;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  const [{ data: perfil }, { data: rotinas }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    supabase
      .from("routines")
      .select("id, name, weekdays, routine_exercises(count)")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const lista: RotinaPlaneada[] = (rotinas ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    weekdays: r.weekdays ?? [],
    exercises:
      (r.routine_exercises as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }));

  return (
    <>
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
        <p className="text-callout leading-relaxed text-fg-muted">{copy.intro}</p>
        <WeekPlanner
          rotinas={lista}
          hoje={isoWeekday(new Date(), perfil?.timezone ?? "Europe/Lisbon")}
          copy={copy}
          locale={locale}
        />
      </div>
    </>
  );
}
