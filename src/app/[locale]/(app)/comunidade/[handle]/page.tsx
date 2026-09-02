import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { Avatar } from "@/components/app/avatar";
import { CommunityFeed } from "@/components/app/community-feed";
import { FollowButton } from "@/components/app/follow-button";
import { Medals, type Medalha } from "@/components/app/medals";
import { ButtonLink } from "@/components/ui/button";
import { Lock } from "@/components/ui/icons";
import { Badge, Card } from "@/components/ui/surface";
import { lerPostsDoAutor } from "@/lib/community/feed";
import { getDictionary } from "@/lib/i18n";
import { assertLocale, formatDate, marketByLocale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Perfil", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * O que a função `perfil_publico` devolve. É ela que decide o que o visitante
 * vê; a página só desenha o que vier. Secções ausentes são secções que a
 * pessoa não quis mostrar — nunca um erro.
 */
type PerfilPublico = {
  id: string;
  handle: string;
  name: string | null;
  avatar_url: string | null;
  avatar_kind: "photo" | "generated";
  avatar_seed: string | null;
  is_private: boolean;
  is_me: boolean;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  member_since: string;
  show_stats: boolean;
  show_records: boolean;
  show_readiness: boolean;
  hidden: boolean;
  gym?: string | null;
  bio?: string | null;
  stats?: {
    sessions: number;
    weeks_active: number;
    sessions_30d: number;
    volume_kg: number;
    last_session: string | null;
  } | null;
  records?: { name: string; weight_kg: number; reps: number | null }[];
  readiness?: { score: number; state: "strong" | "moderate" | "rest" } | null;
};

const TOM = {
  strong: "text-success",
  moderate: "text-warning",
  rest: "text-danger",
} as const;

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale: rawLocale, handle: rawHandle } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  const copy = dict.app.publicProfile;

  // O segmento é "@handle". Sem o @ não é um perfil — é uma sub-rota que não
  // existe, e a resposta certa é 404, não uma pesquisa.
  const decodificado = decodeURIComponent(rawHandle);
  if (!decodificado.startsWith("@")) notFound();
  const handle = decodificado.slice(1).toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  const { data: bruto, error } = await supabase.rpc("perfil_publico", { p_handle: handle });
  if (error) console.error("[perfil] falha a ler:", error.message);
  if (!bruto || typeof bruto !== "object") notFound();
  const perfil = bruto as unknown as PerfilPublico;

  const nome = perfil.name?.trim() || `@${perfil.handle}`;
  // As medalhas seguem o interruptor das estatísticas: a função devolve
  // vazio para quem não as mostra. Para o próprio, aparecem sempre.
  const [posts, { data: medalhas }] = perfil.hidden
    ? [[], { data: [] }]
    : await Promise.all([
        lerPostsDoAutor(supabase, user.id, perfil.id),
        perfil.stats || perfil.is_me
          ? supabase.rpc("medalhas", { p_user: perfil.id })
          : Promise.resolve({ data: [] }),
      ]);

  const labelsSeguir = { follow: copy.follow, unfollow: copy.unfollow };

  return (
    <>
      <AppHeader
        title={nome}
        locale={locale}
        accountLabel={dict.nav.account}
        themeLabels={{
          light: dict.app.account.appearanceLight,
          dark: dict.app.account.appearanceDark,
        }}
        eyebrow={dict.app.community.title}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 pt-6">
        {/* Cabeçalho: o que é sempre visível, privado ou não. */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <Avatar
              nome={nome}
              url={perfil.avatar_url}
              kind={perfil.avatar_kind}
              seed={perfil.avatar_seed}
              size={72}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h1 className="truncate text-title2 text-fg">{nome}</h1>
              <p className="text-subhead text-fg-subtle">@{perfil.handle}</p>
              {!perfil.hidden && perfil.gym ? (
                <p className="text-subhead text-fg-muted">{perfil.gym}</p>
              ) : null}
            </div>
          </div>

          {!perfil.hidden && perfil.bio ? (
            <p className="text-callout leading-relaxed text-fg [text-wrap:pretty]">{perfil.bio}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-subhead text-fg-muted">
            <span>
              <span className="data-mono text-fg">{perfil.follower_count}</span>{" "}
              {copy.followers}
            </span>
            <span>
              <span className="data-mono text-fg">{perfil.following_count}</span>{" "}
              {copy.following}
            </span>
            <span className="text-caption text-fg-subtle">
              {t(copy.memberSince, {
                date: formatDate(perfil.member_since, locale, { month: "short", year: "numeric" }),
              })}
            </span>
          </div>

          {perfil.is_me ? (
            <ButtonLink href={route(locale, "profile")} variant="secondary" fullWidth>
              {copy.editProfile}
            </ButtonLink>
          ) : (
            <FollowButton
              userId={perfil.id}
              initial={perfil.is_following}
              labels={labelsSeguir}
            />
          )}
        </Card>

        {perfil.hidden ? (
          <Card className="flex items-center gap-3">
            <Lock className="size-4.5 shrink-0 text-fg-subtle" />
            <p className="text-callout text-fg-muted">{copy.privateBody}</p>
          </Card>
        ) : (
          <>
            {perfil.is_me && perfil.is_private ? (
              <Card className="flex items-center gap-3 border-warning/30 bg-warning/12">
                <Lock className="size-4.5 shrink-0 text-warning" />
                <p className="text-callout text-fg">{copy.privateOwner}</p>
              </Card>
            ) : null}

            {perfil.readiness ? (
              <Secao
                titulo={copy.readinessTitle}
                soTuVes={perfil.is_me && !perfil.show_readiness}
                etiqueta={copy.onlyYou}
              >
                <p className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "data-mono text-[2rem] leading-none",
                      TOM[perfil.readiness.state],
                    )}
                  >
                    {perfil.readiness.score}
                  </span>
                  <span className={cn("text-headline", TOM[perfil.readiness.state])}>
                    {dict.readiness.states[perfil.readiness.state]}
                  </span>
                </p>
              </Secao>
            ) : null}

            {perfil.stats ? (
              <Secao
                titulo={copy.statsTitle}
                soTuVes={perfil.is_me && !perfil.show_stats}
                etiqueta={copy.onlyYou}
              >
                <div className="grid grid-cols-3 gap-3">
                  <Stat valor={perfil.stats.sessions} rotulo={copy.statsSessions} />
                  <Stat valor={perfil.stats.weeks_active} rotulo={copy.statsWeeks} />
                  <Stat
                    valor={perfil.stats.volume_kg.toLocaleString(marketByLocale[locale].intl)}
                    rotulo={copy.statsVolume}
                    unidade="kg"
                  />
                </div>
                <p className="text-caption text-fg-subtle">
                  {t(copy.statsLast30, { n: perfil.stats.sessions_30d })}
                </p>
              </Secao>
            ) : null}

            {medalhas && medalhas.length > 0 ? (
              <div className={cn(perfil.is_me && !perfil.show_stats && "opacity-80")}>
                <Medals
                  medalhas={medalhas as Medalha[]}
                  copy={dict.app.medals}
                  locale={locale}
                  compact
                />
              </div>
            ) : null}

            {perfil.records && perfil.records.length > 0 ? (
              <Secao
                titulo={copy.recordsTitle}
                soTuVes={perfil.is_me && !perfil.show_records}
                etiqueta={copy.onlyYou}
              >
                <ul className="flex flex-col divide-y divide-hairline">
                  {perfil.records.map((r) => (
                    <li
                      key={r.name}
                      className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
                    >
                      <span className="truncate text-callout text-fg">{r.name}</span>
                      <span className="data-mono shrink-0 text-subhead text-fg tabular-nums">
                        {r.weight_kg} kg{r.reps != null ? ` × ${r.reps}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </Secao>
            ) : null}

            <section className="flex flex-col gap-3">
              <h2 className="label-brand px-1 text-fg-subtle">{copy.postsTitle}</h2>
              {posts.length === 0 ? (
                <Card>
                  <p className="text-callout text-fg-muted">{copy.postsEmpty}</p>
                </Card>
              ) : (
                <CommunityFeed
                  posts={posts}
                  copy={dict.app.community}
                  states={dict.readiness.states}
                  locale={locale}
                  intlLocale={marketByLocale[locale].intl}
                  agoraISO={new Date().toISOString()}
                />
              )}
            </section>
          </>
        )}

        <Link
          href={route(locale, "community")}
          className="self-center text-subhead font-medium text-accent"
        >
          {copy.backToWall}
        </Link>
      </div>
    </>
  );
}

function Secao({
  titulo,
  soTuVes,
  etiqueta,
  children,
}: {
  titulo: string;
  soTuVes: boolean;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("flex flex-col gap-3", soTuVes && "border-dashed")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="label-brand text-fg-subtle">{titulo}</h2>
        {soTuVes ? <Badge tone="neutral">{etiqueta}</Badge> : null}
      </div>
      {children}
    </Card>
  );
}

function Stat({
  valor,
  rotulo,
  unidade,
}: {
  valor: number | string;
  rotulo: string;
  unidade?: string;
}) {
  return (
    <div>
      <p className="data-mono text-title3 text-fg tabular-nums">
        {valor}
        {unidade ? <span className="ml-0.5 text-caption text-fg-subtle">{unidade}</span> : null}
      </p>
      <p className="mt-0.5 text-caption text-fg-subtle">{rotulo}</p>
    </div>
  );
}
