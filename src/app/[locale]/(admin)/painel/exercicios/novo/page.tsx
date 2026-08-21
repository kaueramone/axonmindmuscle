import { ExerciseForm } from "@/components/admin/exercise-form";
import { requireAdmin } from "@/lib/admin/guard";
import { assertLocale } from "@/lib/i18n/config";
import type { ExercisePayload } from "@/lib/admin/actions";

export const dynamic = "force-dynamic";

const VAZIO: ExerciseTexto = {
  name: "",
  description: "",
  procedure: "",
  breathing: "",
  actionFeel: "",
};

type ExerciseTexto = ExercisePayload["textos"][string];

export default async function NewExercisePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  await requireAdmin(locale);

  const inicial: ExercisePayload = {
    id: null,
    slug: "",
    category: "peito",
    equipment: "",
    primaryMuscles: [],
    secondaryMuscles: [],
    isActive: true,
    tracking: "reps",
    mediaUrl: null,
    mediaType: null,
    textos: { "pt-pt": { ...VAZIO }, "pt-br": { ...VAZIO } },
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title1 text-fg">Novo exercício</h1>
      <ExerciseForm inicial={inicial} locale={locale} />
    </div>
  );
}
