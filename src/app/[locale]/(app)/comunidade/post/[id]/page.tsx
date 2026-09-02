import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { CommunityFeed } from "@/components/app/community-feed";
import { ReplyComposer } from "@/components/app/reply-composer";
import { Card } from "@/components/ui/surface";
import { lerFio } from "@/lib/community/feed";
import { getDictionary } from "@/lib/i18n";
import { assertLocale, marketByLocale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conversa", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * O fio: o post de topo, as respostas por ordem, e a caixa para responder.
 * Uma resposta a outra resposta aparece recuada um nível e diz a quem
 * responde — mais profundidade do que isso não se lê num telemóvel.
 */
export default async function ThreadPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  const copy = dict.app.community;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  const [fio, { data: podePublicar }] = await Promise.all([
    lerFio(supabase, user.id, id),
    supabase.rpc("pode_publicar"),
  ]);
  if (!fio) notFound();

  const agora = new Date().toISOString();
  const intl = marketByLocale[locale].intl;
  const comum = {
    copy,
    states: dict.readiness.states,
    locale,
    intlLocale: intl,
    agoraISO: agora,
  };

  return (
    <>
      <AppHeader
        title={copy.threadTitle}
        locale={locale}
        accountLabel={dict.nav.account}
        themeLabels={{
          light: dict.app.account.appearanceLight,
          dark: dict.app.account.appearanceDark,
        }}
        eyebrow={copy.title}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 pt-6">
        <CommunityFeed posts={[fio.raiz]} {...comum} />

        {fio.respostas.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="label-brand px-1 text-fg-subtle">
              {t(copy.replies, { n: String(fio.respostas.length) })}
            </h2>
            {fio.respostas.map((r) => (
              <div key={r.id} className={r.replyTo && r.replyTo !== fio.raiz.id ? "pl-6" : ""}>
                <CommunityFeed posts={[r]} {...comum} />
              </div>
            ))}
          </section>
        ) : (
          <Card>
            <p className="text-callout text-fg-muted">{copy.noReplies}</p>
          </Card>
        )}

        <ReplyComposer
          postId={fio.raiz.id}
          replyingTo={fio.raiz.meu ? null : fio.raiz.autor.handle}
          copy={copy}
          locale={locale}
          podePublicar={podePublicar === true}
        />

        <Link
          href={route(locale, "community")}
          className="self-center text-subhead font-medium text-accent"
        >
          {dict.app.publicProfile.backToWall}
        </Link>
      </div>
    </>
  );
}
