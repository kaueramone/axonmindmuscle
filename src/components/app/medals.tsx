import { Avatar } from "@/components/app/avatar";
import { Check } from "@/components/ui/icons";
import { Badge, Card } from "@/components/ui/surface";
import { formatDate, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

export type Medalha = {
  chave: string;
  ganha_em: string | null;
  progresso: number;
  meta: number;
};

export type LinhaRanking = {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_kind: "photo" | "generated";
  avatar_seed: string | null;
  sessoes: number;
  sou_eu: boolean;
};

/**
 * Medalhas por consistência: sessões concluídas, semanas seguidas, a
 * primeira partilha. Nunca por carga — foi a decisão, e é também o que faz
 * um iniciante e um avançado concorrerem em pé de igualdade. As que faltam
 * mostram o progresso, para haver uma próxima.
 */
export function Medals({
  medalhas,
  copy,
  locale,
  compact = false,
}: {
  medalhas: Medalha[];
  copy: Dict["app"]["medals"];
  locale: Locale;
  /** No perfil público só as ganhas. */
  compact?: boolean;
}) {
  const lista = compact ? medalhas.filter((m) => m.ganha_em) : medalhas;
  if (lista.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="label-brand text-fg-subtle">{copy.title}</h2>
        {!compact ? (
          <p className="mt-2 text-caption leading-relaxed text-fg-subtle">{copy.hint}</p>
        ) : null}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {lista.map((m) => {
          const nomes = copy.items[m.chave as keyof typeof copy.items];
          if (!nomes) return null;
          const ganha = m.ganha_em != null;
          return (
            <li
              key={m.chave}
              className={cn(
                "flex flex-col gap-1.5 rounded-md border p-3",
                ganha ? "border-success/30 bg-success/8" : "border-hairline bg-surface",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn("text-callout font-medium", ganha ? "text-fg" : "text-fg-muted")}
                >
                  {nomes.name}
                </span>
                {ganha ? <Check className="size-4 shrink-0 text-success" /> : null}
              </div>
              <span className="text-caption text-fg-subtle">{nomes.body}</span>
              {ganha && m.ganha_em ? (
                <span className="text-caption text-success">
                  {formatDate(m.ganha_em, locale, { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              ) : (
                <span className="mt-auto flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-strong">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${Math.round((m.progresso / m.meta) * 100)}%` }}
                    />
                  </span>
                  <span className="data-mono text-caption text-fg-subtle tabular-nums">
                    {m.progresso}/{m.meta}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/**
 * Ranking mensal de consistência, só entre quem a pessoa segue e só com quem
 * ligou o interruptor. A pessoa aparece sempre na sua própria lista — para
 * saber onde está — mesmo sem entrar na dos outros.
 */
export function ConsistencyRanking({
  linhas,
  optIn,
  copy,
  profileHref,
  mes,
}: {
  linhas: LinhaRanking[];
  optIn: boolean;
  copy: Dict["app"]["medals"];
  profileHref: string;
  mes: string;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="label-brand text-fg-subtle">{copy.rankingTitle}</h2>
        <span className="text-caption text-fg-subtle">{mes}</span>
      </div>
      <p className="text-caption leading-relaxed text-fg-subtle">{copy.rankingHint}</p>

      {linhas.length <= 1 ? (
        <p className="text-callout text-fg-muted">{copy.rankingEmpty}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-hairline">
          {linhas.map((l, i) => {
            const nome = l.display_name?.trim() || (l.handle ? `@${l.handle}` : "—");
            return (
              <li
                key={l.user_id}
                className={cn(
                  "flex items-center gap-3 py-2.5 first:pt-0 last:pb-0",
                  l.sou_eu && "font-medium",
                )}
              >
                <span className="data-mono w-5 text-right text-subhead text-fg-subtle tabular-nums">
                  {i + 1}
                </span>
                <Avatar
                  nome={nome}
                  url={l.avatar_url}
                  kind={l.avatar_kind}
                  seed={l.avatar_seed}
                  size={32}
                />
                <span className="min-w-0 flex-1 truncate text-callout text-fg">
                  {nome}
                  {l.sou_eu ? (
                    <span className="ml-2">
                      <Badge tone="accent">{copy.you}</Badge>
                    </span>
                  ) : null}
                </span>
                <span className="data-mono text-subhead text-fg tabular-nums">
                  {t(copy.sessions, { n: l.sessoes })}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {!optIn ? (
        <p className="text-caption text-fg-subtle">
          {copy.optInHint}{" "}
          <a href={profileHref} className="font-medium text-accent">
            {copy.optInLink}
          </a>
        </p>
      ) : null}
    </Card>
  );
}
