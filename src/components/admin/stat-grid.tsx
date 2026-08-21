import type { ReactNode } from "react";

import { Card } from "@/components/ui/surface";

export type Stat = {
  label: string;
  value: string;
  hint?: string;
};

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-4">
          <p className="text-caption text-fg-subtle">{stat.label}</p>
          <p className="data-mono mt-1.5 text-title2 text-fg">{stat.value}</p>
          {stat.hint ? (
            <p className="mt-1 text-caption text-fg-subtle">{stat.hint}</p>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

export function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="label-brand text-fg-subtle">{title}</h2>
        {hint ? <p className="mt-1 text-caption text-fg-subtle">{hint}</p> : null}
      </div>
      {children}
    </Card>
  );
}
