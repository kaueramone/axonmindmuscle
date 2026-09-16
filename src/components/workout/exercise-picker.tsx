"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { Check, Play } from "@/components/ui/icons";
import type { Dict } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

export type ExerciseOption = {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
  /** Verdadeiro quando o registo veio do wger e exige crédito. */
  attributed: boolean;
  /** Imagem ou vídeo de demonstração, carregado no painel administrativo. */
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  /** "time" troca o metrónomo por um cronómetro de duração livre. */
  tracking: "reps" | "time";
  description: string | null;
  procedure: string | null;
  breathing: string | null;
  actionFeel: string | null;
};

/** Etiquetas dos grupos, no idioma da pessoa (vêm do dicionário). */
export type MuscleLabels = Dict["app"]["progress"]["muscles"];

/** "Pernas" junta as categorias das pernas num só filtro, sem mexer no catálogo. */
const PERNAS = new Set(["pernas", "quadriceps", "isquiotibiais", "gluteos", "gemeos"]);

export function ExercisePicker({
  exercises,
  onPick,
  copy,
  muscleLabels,
}: {
  exercises: ExerciseOption[];
  onPick: (exercise: ExerciseOption) => void;
  copy: Dict["workout"];
  muscleLabels: MuscleLabels;
}) {
  const [query, setQuery] = useState("");
  const etiqueta = (g: string) => muscleLabels[g as keyof MuscleLabels] ?? g;
  const [group, setGroup] = useState<string | null>(null);

  // Ordenados pela etiqueta no idioma da pessoa, não pela chave interna: em
  // pt-BR "Panturrilhas" não pode aparecer onde caberia "Gémeos".
  const groups = useMemo(() => {
    const presentes = new Set(exercises.map((e) => e.category));
    if ([...presentes].some((c) => PERNAS.has(c))) presentes.add("pernas");
    const nome = (g: string) => muscleLabels[g as keyof MuscleLabels] ?? g;
    return [...presentes].sort((a, b) => nome(a).localeCompare(nome(b), "pt"));
  }, [exercises, muscleLabels]);

  const filtrados = useMemo(() => {
    const termo = query
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");

    return exercises.filter((e) => {
      if (group && !(group === "pernas" ? PERNAS.has(e.category) : e.category === group)) {
        return false;
      }
      if (!termo) return true;
      return e.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .includes(termo);
    });
  }, [exercises, query, group]);

  const precisaCredito = filtrados.some((e) => e.attributed);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-title2 text-fg">{copy.pickExercise}</h2>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={copy.searchPlaceholder}
        aria-label={copy.searchPlaceholder}
        className="h-12 w-full rounded-md border border-hairline bg-surface px-4 text-body text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]"
      />

      {/* No telemóvel desliza; no desktop, sem gesto de arrasto, as categorias
          quebram linha para ficarem todas à vista. */}
      <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <button
          type="button"
          onClick={() => setGroup(null)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-subhead transition-colors",
            group === null
              ? "border-accent bg-accent-soft text-accent"
              : "border-hairline bg-surface text-fg-muted",
          )}
        >
          {copy.allGroups}
        </button>
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-subhead transition-colors",
              group === g
                ? "border-accent bg-accent-soft text-accent"
                : "border-hairline bg-surface text-fg-muted",
            )}
          >
            {etiqueta(g)}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <p className="py-8 text-center text-callout text-fg-subtle">{copy.noResults}</p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface divide-y divide-[var(--hairline)]">
          {filtrados.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => onPick(exercise)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-hairline bg-bg-sunken">
                  {exercise.mediaUrl &&
                  exercise.mediaType === "image" &&
                  !exercise.mediaUrl.toLowerCase().endsWith(".gif") ? (
                    <Image
                      src={exercise.mediaUrl}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  ) : exercise.mediaUrl && exercise.mediaType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={exercise.mediaUrl} alt="" className="size-full object-cover" />
                  ) : exercise.mediaUrl ? (
                    <Play className="size-4 text-fg-subtle" />
                  ) : (
                    <span className="data-mono text-caption text-fg-subtle">
                      {exercise.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-callout font-medium text-fg">
                    {exercise.name}
                  </span>
                  <span className="truncate text-footnote text-fg-subtle">
                    {etiqueta(exercise.category)}
                    {exercise.equipment ? ` · ${exercise.equipment}` : ""}
                  </span>
                </span>
                <Check className="size-4 shrink-0 text-fg-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {precisaCredito ? (
        <p className="px-1 text-caption text-fg-subtle">{copy.catalogCredit}</p>
      ) : null}
    </div>
  );
}
