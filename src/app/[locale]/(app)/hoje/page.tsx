import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";

import Link from "next/link";

import { AppHeader } from "@/components/app/app-header";
import { Greeting } from "@/components/app/greeting";
import { ReadinessSummary } from "@/components/app/readiness-summary";
import { Bolt, ChevronRight, Sparkle } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, ListGroup, ListRow } from "@/components/ui/surface";
import { route } from "@/lib/routes";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { presentReadiness } from "@/lib/readiness/present";
import type { ReadinessResult } from "@/lib/readiness/score";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n/interpolate";
import { isoWeekday, localDate } from "@/lib/workout/periods";

export const metadata: Metadata = { title: "Hoje", robots: { index: false } };

export default async function TodayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  const copy = dict.app.today;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, plan, timezone")
    .eq("id", user!.id)
    .maybeSingle();

  // "Como estou hoje?" é a primeira pergunta de quem abre a aplicação. Se o
  // registo de hoje existe, a resposta aparece aqui, sem obrigar a navegar
  // — o número, o estado e uma frase; os sinais ficam fechados.
  const hoje = localDate(new Date(), profile?.timezone ?? "Europe/Lisbon");
  const { data: registoDeHoje } = await supabase
    .from("readiness_checkins")
    .select("score, state, drivers, sore_muscles")
    .eq("user_id", user!.id)
    .eq("local_date", hoje)
    .maybeSingle();

  // O treino do dia, se a pessoa planeou a semana. Mais do que um no mesmo
  // dia é possível; o primeiro pela ordem de criação é o que abre o ecrã e
  // os outros ficam a um toque em "A minha semana".
  const diaSemana = isoWeekday(new Date(), profile?.timezone ?? "Europe/Lisbon");
  const { data: rotinasDeHoje } = await supabase
    .from("routines")
    .select("id, name")
    .eq("user_id", user!.id)
    .is("archived_at", null)
    .contains("weekdays", [diaSemana])
    .order("created_at", { ascending: true })
    .limit(3);
  const rotinaDeHoje = rotinasDeHoje?.[0] ?? null;

  const prontidao: ReadinessResult | null = registoDeHoje
    ? {
        score: registoDeHoje.score,
        state: registoDeHoje.state,
        drivers: (registoDeHoje.drivers ?? []) as ReadinessResult["drivers"],
        avoidMuscles: registoDeHoje.sore_muscles ?? [],
        needsBaseline: false,
      }
    : null;

  const firstName = profile?.display_name?.split(" ")[0] ?? "";
  const ehPro = profile?.plan === "pro";

  // A comunidade já existe e tem o seu separador; o que continua a caminho é
  // só o assistente.
  const tools = [
    { icon: <Sparkle className="size-4.5" />, ...pick(copy.tools, "assistant") },
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

      <div className="mx-auto flex max-w-2xl flex-col gap-7 px-5 pt-6">
        {/* A saudação e o convite ao PRO partilham a linha: o convite fica ao
            lado em ecrãs largos e desce por baixo no telemóvel, sem nunca
            empurrar o botão de treinar para fora do primeiro ecrã. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Greeting
            name={firstName}
            labels={dict.app.greeting}
            className="text-title3 text-fg-muted"
          />

          {ehPro ? null : (
            <Link
              href={route(locale, "plans")}
              className="flex shrink-0 items-center gap-2.5 rounded-xl border border-accent/25 bg-accent-soft px-3.5 py-2 transition-opacity hover:opacity-80"
            >
              <Sparkle className="size-4 shrink-0 text-accent" />
              <span className="flex flex-col">
                <span className="text-footnote font-semibold text-accent">
                  {copy.proTitle}
                </span>
                <span className="text-caption text-fg-muted">{copy.proBody}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-accent/60" />
            </Link>
          )}
        </div>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-title3 text-fg">
              {rotinaDeHoje
                ? t(dict.app.week.todayTitle, { name: rotinaDeHoje.name })
                : dict.workout.startCta}
            </h2>
            <p className="text-callout leading-relaxed text-fg-muted">
              {rotinaDeHoje
                ? (rotinasDeHoje ?? [])
                    .slice(1)
                    .map((r) => r.name)
                    .join(" · ") || dict.workout.startBody
                : dict.workout.startBody}
            </p>
          </div>
          <ButtonLink
            href={
              rotinaDeHoje
                ? `${route(locale, "workout")}?rotina=${rotinaDeHoje.id}`
                : route(locale, "workout")
            }
            size="lg"
            fullWidth
          >
            {rotinaDeHoje
              ? t(dict.app.week.todayStart, { name: rotinaDeHoje.name })
              : dict.workout.startCta}
          </ButtonLink>
          <Link
            href={route(locale, "week")}
            className="flex items-center justify-center gap-1 text-subhead font-medium text-accent"
          >
            {dict.app.week.plan}
            <ChevronRight className="size-4" />
          </Link>
        </Card>

        <section className="flex flex-col gap-3">
          <h2 className="label-brand px-1 text-fg-subtle">{dict.readiness.todayTitle}</h2>
          {prontidao ? (
            <>
              <ReadinessSummary
                result={prontidao}
                presented={presentReadiness(prontidao, dict.readiness)}
                dict={dict}
                compact
              />
              <Link
                href={route(locale, "readiness")}
                className="flex items-center gap-1 self-end px-1 text-subhead font-medium text-accent"
              >
                {dict.readiness.todayOpen}
                <ChevronRight className="size-4" />
              </Link>
            </>
          ) : (
            <ListRow
              icon={<Bolt className="size-4.5" />}
              label={dict.readiness.cta}
              detail={dict.readiness.intro}
              href={route(locale, "readiness")}
              className="rounded-xl border border-hairline bg-surface"
            />
          )}
        </section>

        <ListGroup title={copy.toolsTitle}>
          {tools.map((tool) => (
            <ListRow
              key={tool.label}
              icon={tool.icon}
              label={tool.label}
              detail={tool.detail}
              trailing={<Badge>{dict.common.soon}</Badge>}
            />
          ))}
        </ListGroup>
      </div>
    </>
  );
}

/** Extrai o par etiqueta/descrição de uma ferramenta do dicionário. */
function pick(
  tools: {
    metronome: string;
    metronomeBody: string;
    readiness: string;
    readinessBody: string;
    assistant: string;
    assistantBody: string;
    community: string;
    communityBody: string;
    tutorials: string;
    tutorialsBody: string;
    points: string;
    pointsBody: string;
  },
  key: "metronome" | "readiness" | "assistant" | "community" | "tutorials" | "points",
) {
  return { label: tools[key], detail: tools[`${key}Body` as const] };
}
