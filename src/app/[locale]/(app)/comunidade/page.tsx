import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { CommunityFeed } from "@/components/app/community-feed";
import { PostComposer } from "@/components/app/post-composer";
import { Card } from "@/components/ui/surface";
import { lerFeed, lerOnline } from "@/lib/community/feed";
import { getDictionary } from "@/lib/i18n";
import { assertLocale, marketByLocale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Comunidade", robots: { index: false } };

// O mural muda a cada minuto e a página é diferente para cada pessoa - já
// traz o que cada uma apoiou. Não há nada aqui que valha a pena guardar.
export const dynamic = "force-dynamic";

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  const copy = dict.app.community;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  // A visita é o que marca presença. Alimenta o "online agora" de toda a gente
  // sem uma única ligação permanente aberta.
  await supabase.rpc("tocar_presenca");

  const [posts, online, { data: podePublicar }] = await Promise.all([
    lerFeed(supabase, user.id),
    lerOnline(supabase),
    supabase.rpc("pode_publicar"),
  ]);

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
        {online > 0 ? (
          <p className="flex items-center gap-2 text-caption text-fg-subtle">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            <span className="data-mono">{online}</span> {copy.online}
          </p>
        ) : null}

        <PostComposer
          copy={copy}
          locale={locale}
          userId={user.id}
          podePublicar={podePublicar === true}
        />

        {posts.length === 0 ? (
          <Card>
            <p className="text-callout text-fg-muted">
              {podePublicar ? copy.emptyPro : copy.empty}
            </p>
          </Card>
        ) : (
          <CommunityFeed
            posts={posts}
            copy={copy}
            states={dict.readiness.states}
            locale={locale}
            intlLocale={marketByLocale[locale].intl}
            agoraISO={new Date().toISOString()}
          />
        )}
      </div>
    </>
  );
}
