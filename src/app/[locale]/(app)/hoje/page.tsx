import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";

import { AppHeader } from "@/components/app/app-header";
import { Greeting } from "@/components/app/greeting";
import {
  Bolt,
  Clock,
  Sparkle,
  Users,
} from "@/components/ui/icons";
import { Badge, Card, ListGroup, ListRow } from "@/components/ui/surface";
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
    .select("display_name")
    .eq("id", user!.id)
    .maybeSingle();

  const firstName = profile?.display_name?.split(" ")[0] ?? "";

  const tools = [
    { icon: <Clock className="size-4.5" />, ...pick(copy.tools, "metronome") },
    { icon: <Bolt className="size-4.5" />, ...pick(copy.tools, "readiness") },
    { icon: <Sparkle className="size-4.5" />, ...pick(copy.tools, "assistant") },
    { icon: <Users className="size-4.5" />, ...pick(copy.tools, "community") },
  ];

  return (
    <>
      <AppHeader
        title={copy.title}
        locale={locale}
        accountLabel={dict.nav.account}
        eyebrow={dict.common.tagline}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-7 px-5 pt-6">
        <Greeting
          name={firstName}
          labels={dict.app.greeting}
          className="text-title3 text-fg-muted"
        />

        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <Badge tone="accent" className="self-start">
              {dict.common.inDevelopment}
            </Badge>
            <h2 className="text-title3 text-fg">{copy.emptyTitle}</h2>
            <p className="text-callout leading-relaxed text-fg-muted">
              {copy.emptyBody}
            </p>
          </div>
        </Card>

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
