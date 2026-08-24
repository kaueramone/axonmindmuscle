import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";

import Link from "next/link";

import { AppHeader } from "@/components/app/app-header";
import { Greeting } from "@/components/app/greeting";
import { Bolt, ChevronRight, Sparkle, Users } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, ListGroup, ListRow } from "@/components/ui/surface";
import { route } from "@/lib/routes";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

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
    .select("display_name, plan")
    .eq("id", user!.id)
    .maybeSingle();

  const firstName = profile?.display_name?.split(" ")[0] ?? "";
  const ehPro = profile?.plan === "pro";

  const tools = [
    { icon: <Sparkle className="size-4.5" />, ...pick(copy.tools, "assistant") },
    { icon: <Users className="size-4.5" />, ...pick(copy.tools, "community") },
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
            <h2 className="text-title3 text-fg">{dict.workout.startCta}</h2>
            <p className="text-callout leading-relaxed text-fg-muted">
              {dict.workout.startBody}
            </p>
          </div>
          <ButtonLink href={route(locale, "workout")} size="lg" fullWidth>
            {dict.workout.startCta}
          </ButtonLink>
        </Card>

        <ListRow
          icon={<Bolt className="size-4.5" />}
          label={dict.readiness.cta}
          detail={dict.readiness.intro}
          href={route(locale, "readiness")}
          className="rounded-xl border border-hairline bg-surface"
        />

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
