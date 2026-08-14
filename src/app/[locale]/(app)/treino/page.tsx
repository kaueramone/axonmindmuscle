import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { WorkoutRunner } from "@/components/workout/workout-runner";
import type { ExerciseOption } from "@/components/workout/exercise-picker";
import { getDictionary } from "@/lib/i18n";
import { assertLocale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Treino", robots: { index: false } };

export default async function WorkoutPage({
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

  // Catálogo e traduções em duas leituras — a esta escala é tão rápido
  // como um join e mantém a tipagem simples.
  const [{ data: linhas }, { data: nomes }] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, category, equipment, source")
      .eq("is_active", true)
      .order("category"),
    supabase.from("exercise_translations").select("exercise_id, name").eq("locale", locale),
  ]);

  const nomePorId = new Map((nomes ?? []).map((n) => [n.exercise_id, n.name]));

  const exercises: ExerciseOption[] = (linhas ?? [])
    .map((linha) => ({
      id: linha.id,
      name: nomePorId.get(linha.id) ?? "",
      category: linha.category as string,
      equipment: linha.equipment,
      attributed: linha.source === "wger",
    }))
    .filter((e) => e.name)
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  // Uma sessão por terminar significa treino a decorrer.
  const { data: aberta } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <AppHeader
        title={dict.workout.title}
        locale={locale}
        accountLabel={dict.nav.account}
        themeLabels={{
          light: dict.app.account.appearanceLight,
          dark: dict.app.account.appearanceDark,
        }}
        eyebrow={dict.common.tagline}
      />

      <div className="mx-auto max-w-2xl px-5 pt-6">
        <WorkoutRunner
          locale={locale}
          dict={dict}
          userId={user.id}
          exercises={exercises}
          existingSessionId={aberta?.id ?? null}
        />
      </div>
    </>
  );
}
