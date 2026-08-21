"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { MUSCLE_LABELS } from "@/components/admin/exercise-form";
import { Pencil, Photo, Play, Plus } from "@/components/ui/icons";
import { Badge, Spinner } from "@/components/ui/surface";
import { setExerciseActiveAction } from "@/lib/admin/actions";
import type { Locale } from "@/lib/i18n/config";
import type { MuscleGroup } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export type LinhaExercicio = {
  id: string;
  name: string;
  category: MuscleGroup;
  equipment: string | null;
  isActive: boolean;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  temTexto: boolean;
  source: string;
};

export function ExerciseList({
  linhas,
  locale,
}: {
  linhas: LinhaExercicio[];
  locale: Locale;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "sem-media" | "sem-texto" | "ocultos">(
    "todos",
  );

  const visiveis = useMemo(() => {
    const termo = query.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return linhas.filter((l) => {
      if (filtro === "sem-media" && l.mediaUrl) return false;
      if (filtro === "sem-texto" && l.temTexto) return false;
      if (filtro === "ocultos" && l.isActive) return false;
      if (!termo) return true;
      return l.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .includes(termo);
    });
  }, [linhas, query, filtro]);

  const semMedia = linhas.filter((l) => !l.mediaUrl).length;
  const semTexto = linhas.filter((l) => !l.temTexto).length;

  const FILTROS = [
    { key: "todos", label: `Todos · ${linhas.length}` },
    { key: "sem-media", label: `Sem imagem · ${semMedia}` },
    { key: "sem-texto", label: `Sem orientação · ${semTexto}` },
    { key: "ocultos", label: "Ocultos" },
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-title1 text-fg">Exercícios</h1>
          <p className="mt-1.5 text-callout text-fg-muted">
            {linhas.length} no catálogo · {semMedia} ainda sem imagem ou vídeo
          </p>
        </div>
        <Link
          href={`/${locale}/painel/exercicios/novo`}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-subhead font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Novo exercício
        </Link>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Procurar exercício"
        aria-label="Procurar exercício"
        className="h-11 w-full rounded-md border border-hairline bg-surface px-3.5 text-body text-fg placeholder:text-fg-subtle outline-none focus:border-accent"
      />

      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFiltro(f.key)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-subhead transition-colors",
              filtro === f.key
                ? "border-accent bg-accent-soft text-accent"
                : "border-hairline bg-surface text-fg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p className="py-10 text-center text-callout text-fg-subtle">
          Nenhum exercício corresponde a este filtro.
        </p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface divide-y divide-[var(--hairline)]">
          {visiveis.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-3">
              <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-hairline bg-bg-sunken">
                {l.mediaUrl && l.mediaType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.mediaUrl} alt="" className="size-full object-cover" />
                ) : l.mediaUrl ? (
                  <Play className="size-4 text-fg-subtle" />
                ) : (
                  <Photo className="size-4 text-fg-subtle opacity-50" />
                )}
              </span>

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-callout font-medium text-fg">
                  {l.name}
                </span>
                <span className="truncate text-footnote text-fg-subtle">
                  {MUSCLE_LABELS[l.category] ?? l.category}
                  {l.equipment ? ` · ${l.equipment}` : ""}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2">
                {!l.isActive ? <Badge tone="warning">Oculto</Badge> : null}
                {!l.temTexto ? <Badge>Sem orientação</Badge> : null}

                <button
                  type="button"
                  disabled={pendente}
                  onClick={() =>
                    iniciar(async () => {
                      await setExerciseActiveAction(l.id, !l.isActive);
                      router.refresh();
                    })
                  }
                  className="rounded-full border border-hairline px-3 py-1.5 text-caption text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
                >
                  {l.isActive ? "Ocultar" : "Mostrar"}
                </button>

                <Link
                  href={`/${locale}/painel/exercicios/${l.id}`}
                  aria-label={`Editar ${l.name}`}
                  className="grid size-9 place-items-center rounded-full border border-hairline text-fg-muted transition-colors hover:text-fg"
                >
                  <Pencil className="size-4" />
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}

      {pendente ? (
        <p className="flex items-center gap-2 text-caption text-fg-subtle">
          <Spinner /> a guardar
        </p>
      ) : null}
    </div>
  );
}
