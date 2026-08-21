"use client";

import Image from "next/image";

import { Card } from "@/components/ui/surface";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import type { ExerciseOption } from "@/components/workout/exercise-picker";

/**
 * Apresentação do exercício: imagem ou vídeo, título e a descrição repartida
 * em procedimento, respiração e sentimento de acção. Cada bloco só aparece
 * se tiver conteúdo — um exercício sem orientação escrita não mostra
 * cabeçalhos vazios.
 */
export function ExerciseBrief({
  exercise,
  copy,
}: {
  exercise: ExerciseOption;
  copy: Dict["workout"];
}) {
  const blocos = [
    { key: "procedure", label: copy.procedure, value: exercise.procedure },
    { key: "breathing", label: copy.breathing, value: exercise.breathing },
    { key: "actionFeel", label: copy.actionFeel, value: exercise.actionFeel },
  ].filter((b) => b.value && b.value.trim());

  const temTexto = blocos.length > 0 || Boolean(exercise.description?.trim());

  if (!exercise.mediaUrl && !temTexto) return null;

  return (
    <Card className="flex flex-col gap-5 overflow-hidden p-0">
      {exercise.mediaUrl ? (
        <div className="relative aspect-video w-full bg-bg-sunken">
          {exercise.mediaType === "video" ? (
            <video
              src={exercise.mediaUrl}
              className="size-full object-cover"
              controls
              playsInline
              preload="metadata"
            />
          ) : exercise.mediaUrl.toLowerCase().endsWith(".gif") ? (
            /* GIFs animados perdem a animação se passarem pelo optimizador. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={exercise.mediaUrl}
              alt={t(copy.mediaAlt, { exercise: exercise.name })}
              className="size-full object-cover"
            />
          ) : (
            <Image
              src={exercise.mediaUrl}
              alt={t(copy.mediaAlt, { exercise: exercise.name })}
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-cover"
            />
          )}
        </div>
      ) : null}

      {temTexto ? (
        <div className="flex flex-col gap-4 px-5 pb-5 pt-1">
          <h3 className="text-headline font-semibold text-fg">{copy.howToTitle}</h3>

          {exercise.description?.trim() ? (
            <p className="text-callout leading-relaxed text-fg-muted">
              {exercise.description}
            </p>
          ) : null}

          {blocos.map((bloco) => (
            <div key={bloco.key} className="flex flex-col gap-1.5">
              <p className="label-brand text-fg-subtle">{bloco.label}</p>
              <p className="whitespace-pre-line text-callout leading-relaxed text-fg-muted">
                {bloco.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
