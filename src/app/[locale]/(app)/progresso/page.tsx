import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { Card } from "@/components/ui/surface";
import { getDictionary } from "@/lib/i18n";
import { assertLocale, formatDate } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Progresso", robots: { index: false } };

/** Dias seguidos com pelo menos uma série, a contar de hoje ou de ontem. */
function calcularSequencia(datas: string[]): number {
  const dias = new Set(datas.map((d) => d.slice(0, 10)));
  if (dias.size === 0) return 0;

  const hoje = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  // A sequência não quebra por o treino de hoje ainda não ter acontecido.
  const inicio = new Date(hoje);
  if (!dias.has(iso(hoje))) inicio.setDate(inicio.getDate() - 1);
  if (!dias.has(iso(inicio))) return 0;

  let total = 0;
  const cursor = new Date(inicio);
  while (dias.has(iso(cursor))) {
    total += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return total;
}

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  const copy = dict.app.progress;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  const [{ data: series }, { data: sessoes }] = await Promise.all([
    supabase
      .from("workout_sets")
      .select("weight_kg, reps, completed_at, exercise_name")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(500),
    supabase
      .from("workout_sessions")
      .select("id, started_at, ended_at")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(30),
  ]);

  const linhas = series ?? [];
  const volume = linhas.reduce(
    (total, s) => total + Number(s.weight_kg ?? 0) * (s.reps ?? 0),
    0,
  );
  const sequencia = calcularSequencia(linhas.map((s) => s.completed_at));

  const stats = [
    { label: copy.streak, value: String(sequencia), unit: copy.days },
    { label: copy.sessions, value: String((sessoes ?? []).length), unit: "" },
    {
      label: copy.volume,
      value: volume >= 1000 ? `${(volume / 1000).toFixed(1)}` : String(Math.round(volume)),
      unit: volume >= 1000 ? "t" : "kg",
    },
  ];

  return (
    <>
      <AppHeader
        title={copy.title}
        locale={locale}
        accountLabel={dict.nav.account}
        themeLabels={{
          light: dict.app.account.appearanceLight,
          dark: dict.app.account.appearanceDark,
        }}
        eyebrow={dict.common.tagline}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 pt-6">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-4">
              <p className="text-caption text-fg-subtle">{stat.label}</p>
              <p className="data-mono mt-2 text-title1 text-fg">
                {stat.value}
                {stat.unit ? (
                  <span className="ml-1 text-footnote text-fg-subtle">{stat.unit}</span>
                ) : null}
              </p>
            </Card>
          ))}
        </div>

        {linhas.length === 0 ? (
          <Card>
            <p className="text-callout text-fg-muted">{copy.empty}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {linhas.slice(0, 40).map((serie, index) => (
              <Card key={index} className="flex items-center justify-between gap-3 py-3.5">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-callout text-fg">
                    {serie.exercise_name}
                  </span>
                  <span className="text-caption text-fg-subtle">
                    {formatDate(serie.completed_at, locale, {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <span className="data-mono shrink-0 text-callout text-fg-muted">
                  {serie.weight_kg ? `${serie.weight_kg} kg × ` : ""}
                  {serie.reps}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
