import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { Avatar } from "@/components/app/avatar";
import { Card } from "@/components/ui/surface";
import { marcarNotificacoesLidasAction } from "@/lib/community/actions";
import { lerNotificacoes } from "@/lib/community/feed";
import { getDictionary } from "@/lib/i18n";
import { assertLocale, formatDate } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import { postRoute, profileRoute, route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notificações", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Uma linha por notificação, todas geradas por gatilhos na base de dados:
 * gosto, resposta, menção, republicação, seguidor. Abrir a página é o que
 * as marca como lidas — depois de as ler, não antes.
 */
export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  const copy = dict.app.notifications;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  const lista = await lerNotificacoes(supabase, user.id);
  if (lista.some((n) => !n.lida)) await marcarNotificacoesLidasAction();

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
        eyebrow={dict.app.community.title}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 pt-6">
        {lista.length === 0 ? (
          <Card>
            <p className="text-callout text-fg-muted">{copy.empty}</p>
          </Card>
        ) : (
          <Card className="flex flex-col divide-y divide-hairline p-0">
            {lista.map((n) => {
              const nome = n.ator?.nome ?? "—";
              const frase = t(copy.kinds[n.tipo], { name: nome });
              const destino = n.postId
                ? postRoute(locale, n.postId)
                : n.ator?.handle
                  ? profileRoute(locale, n.ator.handle)
                  : null;
              const conteudo = (
                <>
                  <Avatar
                    nome={nome}
                    url={n.ator?.avatarUrl ?? null}
                    kind={n.ator?.avatarKind ?? "photo"}
                    seed={n.ator?.avatarSeed ?? null}
                    size={36}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-callout text-fg">{frase}</span>
                    {n.excerto ? (
                      <span className="truncate text-caption text-fg-subtle">{n.excerto}</span>
                    ) : null}
                    <span className="text-caption text-fg-subtle">
                      {formatDate(n.createdAt, locale, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  {!n.lida ? (
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-hidden />
                  ) : null}
                </>
              );
              const classes = cn(
                "flex items-start gap-3 px-4 py-3",
                !n.lida && "bg-accent-soft/40",
                destino && "transition-colors hover:bg-surface-hover",
              );
              return destino ? (
                <Link key={n.id} href={destino} className={classes}>
                  {conteudo}
                </Link>
              ) : (
                <div key={n.id} className={classes}>
                  {conteudo}
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </>
  );
}
