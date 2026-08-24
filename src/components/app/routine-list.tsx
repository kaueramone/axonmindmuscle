"use client";

import { ChevronRight } from "@/components/ui/icons";
import { ListGroup, ListRow } from "@/components/ui/surface";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";

export type RoutineSummary = {
  id: string;
  name: string;
  exercises: number;
};

/** Os treinos guardados, para repetir sem os voltar a montar. */
export function RoutineList({
  routines,
  copy,
  locale,
}: {
  routines: RoutineSummary[];
  copy: Dict["workout"]["routines"];
  locale: Locale;
}) {
  if (routines.length === 0) return null;

  return (
    <ListGroup title={copy.listTitle}>
      {routines.map((r) => (
        <ListRow
          key={r.id}
          label={r.name}
          detail={t(copy.exercises, { n: String(r.exercises) })}
          href={`${route(locale, "workout")}?rotina=${r.id}`}
          trailing={<ChevronRight className="size-4 text-fg-subtle" />}
        />
      ))}
    </ListGroup>
  );
}
