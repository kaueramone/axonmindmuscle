import { notFound } from "next/navigation";

import { ExerciseForm } from "@/components/admin/exercise-form";
import { requireAdmin } from "@/lib/admin/guard";
import type { ExercisePayload } from "@/lib/admin/actions";
import { assertLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale = assertLocale(rawLocale);
  const { supabase } = await requireAdmin(locale);

  const [{ data: linha }, { data: textos }] = await Promise.all([
    supabase.from("exercises").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("exercise_translations")
      .select("locale, name, description, procedure, breathing, action_feel")
      .eq("exercise_id", id),
  ]);

  if (!linha) notFound();

  const mapa: ExercisePayload["textos"] = {};
  for (const t of textos ?? []) {
    mapa[t.locale] = {
      name: t.name ?? "",
      description: t.description ?? "",
      procedure: t.procedure ?? "",
      breathing: t.breathing ?? "",
      actionFeel: t.action_feel ?? "",
    };
  }

  const inicial: ExercisePayload = {
    id: linha.id,
    slug: linha.slug,
    category: linha.category,
    equipment: linha.equipment ?? "",
    primaryMuscles: linha.primary_muscles ?? [],
    secondaryMuscles: linha.secondary_muscles ?? [],
    isActive: linha.is_active,
    mediaUrl: linha.media_url,
    mediaType: linha.media_type,
    textos: mapa,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title1 text-fg">
          {mapa[locale]?.name || mapa["pt-pt"]?.name || "Exercício"}
        </h1>
        {linha.source === "wger" ? (
          <p className="mt-1.5 text-caption text-fg-subtle">
            Registo importado do wger — o crédito da licença CC BY-SA continua a
            aplicar-se ao texto original.
          </p>
        ) : null}
      </div>
      <ExerciseForm inicial={inicial} locale={locale} />
    </div>
  );
}
