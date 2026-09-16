"use client";

import { Sparkle } from "@/components/ui/icons";
import { Badge, ListRow } from "@/components/ui/surface";

import { abrirProfessor } from "./professor-axon";

/**
 * A entrada do Professor na página "Hoje": ocupa o lugar do "Em breve" que lá
 * esteve durante o MVP. Não tem página própria; abre o balão flutuante.
 */
export function LinhaProfessor({
  label,
  detail,
  proBadge,
}: {
  label: string;
  detail: string;
  /** Etiqueta "PRO" para quem ainda não tem o plano. */
  proBadge: string | null;
}) {
  return (
    <ListRow
      icon={<Sparkle className="size-4.5" />}
      label={label}
      detail={detail}
      onClick={abrirProfessor}
      trailing={proBadge ? <Badge tone="accent">{proBadge}</Badge> : undefined}
      className="rounded-xl border border-hairline bg-surface"
    />
  );
}
