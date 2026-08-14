"use client";

import { useMemo, useState } from "react";

import { Check } from "@/components/ui/icons";
import type { Dict } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

export type ExerciseOption = {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
  /** Verdadeiro quando o registo veio do wger e exige crédito. */
  attributed: boolean;
};

const GROUP_LABELS: Record<string, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebraco: "Antebraço",
  abdomen: "Abdómen",
  quadriceps: "Quadríceps",
  isquiotibiais: "Isquiotibiais",
  gluteos: "Glúteos",
  gemeos: "Gémeos",
  lombar: "Lombar",
  corpo_inteiro: "Corpo inteiro",
};

export function ExercisePicker({
  exercises,
  onPick,
  copy,
}: {
  exercises: ExerciseOption[];
  onPick: (exercise: ExerciseOption) => void;
  copy: Dict["workout"];
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);

  const groups = useMemo(
    () => [...new Set(exercises.map((e) => e.category))].sort(),
    [exercises],
  );

  const filtrados = useMemo(() => {
    const termo = query
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");

    return exercises.filter((e) => {
      if (group && e.category !== group) return false;
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

      <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
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
            {GROUP_LABELS[g] ?? g}
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
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-callout font-medium text-fg">
                    {exercise.name}
                  </span>
                  <span className="truncate text-footnote text-fg-subtle">
                    {GROUP_LABELS[exercise.category] ?? exercise.category}
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
