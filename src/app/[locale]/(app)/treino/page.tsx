import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import {
  WorkoutRunner,
  type ReadinessHint,
} from "@/components/workout/workout-runner";
import type { ExerciseOption } from "@/components/workout/exercise-picker";
import { getDictionary } from "@/lib/i18n";
import { assertLocale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { prescriptionFor } from "@/lib/readiness/score";
import { createClient } from "@/lib/supabase/server";
import { localDate } from "@/lib/workout/periods";
import type { LastPerformance, Zone } from "@/lib/workout/progression";

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
      .select("id, category, equipment, source, media_url, media_type, tracking")
      .eq("is_active", true)
      .order("category"),
    supabase
      .from("exercise_translations")
      .select("exercise_id, name, description, procedure, breathing, action_feel")
      .eq("locale", locale),
  ]);

  const textoPorId = new Map((nomes ?? []).map((n) => [n.exercise_id, n]));

  const exercises: ExerciseOption[] = (linhas ?? [])
    .map((linha) => {
      const texto = textoPorId.get(linha.id);
      return {
        id: linha.id,
        name: texto?.name ?? "",
        category: linha.category as string,
        equipment: linha.equipment,
        attributed: linha.source === "wger",
        tracking: linha.tracking,
        mediaUrl: linha.media_url,
        mediaType: linha.media_type,
        description: texto?.description ?? null,
        procedure: texto?.procedure ?? null,
        breathing: texto?.breathing ?? null,
        actionFeel: texto?.action_feel ?? null,
      };
    })
    .filter((e) => e.name)
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  // Prontidão de hoje: ajusta os valores de partida do treino.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();

  const { data: prontidao } = await supabase
    .from("readiness_checkins")
    .select("state, sore_muscles")
    .eq("user_id", user.id)
    .eq("local_date", localDate(new Date(), perfil?.timezone ?? "Europe/Lisbon"))
    .maybeSingle();

  const readiness: ReadinessHint | null = prontidao
    ? {
        state: prontidao.state,
        ...prescriptionFor(prontidao.state),
        avoidMuscles: (prontidao.sore_muscles ?? []) as string[],
      }
    : null;

  // O que a pessoa fez da última vez em cada exercício. É isto que permite ao
  // treino dizer um peso em vez de uma percentagem.
  const { data: anteriores } = await supabase.rpc("last_performance");

  const lastByExercise: Record<string, LastPerformance> = {};
  for (const linha of anteriores ?? []) {
    lastByExercise[linha.exercise_id] = {
      performedAt: linha.performed_at,
      weightKg: linha.weight_kg,
      reps: linha.reps,
      rir: linha.rir,
      durationS: linha.duration_s,
      intensityZone: linha.intensity_zone as Zone | null,
    };
  }

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
          readiness={readiness}
          lastByExercise={lastByExercise}
        />
      </div>
    </>
  );
}
