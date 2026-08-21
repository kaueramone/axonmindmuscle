import { ExerciseList, type LinhaExercicio } from "@/components/admin/exercise-list";
import { requireAdmin } from "@/lib/admin/guard";
import { assertLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function AdminExercisesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const { supabase } = await requireAdmin(locale);

  const [{ data: linhas }, { data: textos }] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, category, equipment, is_active, media_url, media_type, source"),
    supabase
      .from("exercise_translations")
      .select("exercise_id, locale, name, procedure, breathing, action_feel"),
  ]);

  const porId = new Map<string, LinhaExercicio>();

  for (const linha of linhas ?? []) {
    porId.set(linha.id, {
      id: linha.id,
      name: "",
      category: linha.category,
      equipment: linha.equipment,
      isActive: linha.is_active,
      mediaUrl: linha.media_url,
      mediaType: linha.media_type,
      temTexto: false,
      source: linha.source,
    });
  }

  for (const texto of textos ?? []) {
    const alvo = porId.get(texto.exercise_id);
    if (!alvo) continue;
    if (texto.locale === locale || !alvo.name) alvo.name = texto.name;
    if (texto.procedure || texto.breathing || texto.action_feel) alvo.temTexto = true;
  }

  const ordenadas = [...porId.values()]
    .filter((l) => l.name)
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return <ExerciseList linhas={ordenadas} locale={locale} />;
}
