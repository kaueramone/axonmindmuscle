import { Button } from "@/components/ui/button";
import { Check, Sparkle } from "@/components/ui/icons";
import { Badge, Card } from "@/components/ui/surface";
import { startCheckoutAction, openBillingPortalAction } from "@/lib/billing/actions";
import { FOUNDERS_CODE } from "@/lib/stripe/shared";
import { formatDate, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import type { PriceView } from "@/lib/stripe/server";
import type { SubscriptionStatus, UserPlan } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Subscricao = {
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  interval: string | null;
} | null;

const ESTADO_TEXTO: Record<string, keyof Dict["app"]["plans"]> = {
  active: "statusActive",
  trialing: "statusTrialing",
  past_due: "statusPastDue",
  canceled: "statusCanceled",
};

export function PlanCards({
  locale,
  copy,
  precos,
  plano,
  subscricao,
  descontos,
  cupaoGasto,
  intlLocale,
}: {
  locale: Locale;
  copy: Dict["app"]["plans"];
  precos: PriceView[];
  plano: UserPlan;
  subscricao: Subscricao;
  descontos: Partial<Record<"month" | "year", number>>;
  cupaoGasto: boolean;
  intlLocale: string;
}) {
  const mensal = precos.find((p) => p.interval === "month");
  const anual = precos.find((p) => p.interval === "year");

  // Quanto se poupa no anual, calculado sobre os preços reais e não escrito à mão.
  const poupanca =
    mensal && anual && mensal.amount > 0
      ? Math.round((1 - anual.amount / (mensal.amount * 12)) * 100)
      : 0;

  const ehPro = plano === "pro";

  return (
    <div className="flex flex-col gap-5">
      {ehPro && subscricao ? (
        <Card className="flex flex-col gap-4 border border-accent/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-brand text-fg-subtle">{copy.current}</p>
              <p className="mt-1.5 text-title2 text-fg">{copy.proTitle}</p>
            </div>
            <Badge tone={subscricao.status === "past_due" ? "warning" : "accent"}>
              {copy[ESTADO_TEXTO[subscricao.status] ?? "statusActive"] as string}
            </Badge>
          </div>

          {subscricao.current_period_end ? (
            <p className="text-subhead text-fg-muted">
              {t(subscricao.cancel_at_period_end ? copy.endsOn : copy.renewsOn, {
                date: formatDate(subscricao.current_period_end, locale, {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }),
              })}
            </p>
          ) : null}

          {subscricao.status === "past_due" ? (
            <p className="text-caption leading-relaxed text-warning">
              {copy.pastDueHint}
            </p>
          ) : null}

          <form action={openBillingPortalAction} className="flex flex-col gap-2">
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" size="lg" variant="secondary" fullWidth>
              {copy.manage}
            </Button>
            <p className="text-caption text-fg-subtle">{copy.manageHint}</p>
          </form>
        </Card>
      ) : null}

      {!ehPro ? (
        <>
          <Card className="flex flex-col gap-4 border border-accent/40">
            <div className="flex items-center justify-between">
              <h2 className="text-title3 text-fg">{copy.proTitle}</h2>
              <Sparkle className="size-5 text-accent" />
            </div>

            <div className="flex flex-col gap-3">
              {[mensal, anual].filter(Boolean).map((preco) => {
                const p = preco as PriceView;
                const anualEste = p.interval === "year";
                const desconto = cupaoGasto ? undefined : descontos[p.interval];
                const comDesconto =
                  desconto != null
                    ? new Intl.NumberFormat(intlLocale, {
                        style: "currency",
                        currency: p.currency,
                      }).format(p.amount * (1 - desconto / 100))
                    : null;
                return (
                  <form
                    key={p.id}
                    action={startCheckoutAction}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5",
                      anualEste
                        ? "border-accent bg-accent-soft"
                        : "border-hairline bg-surface",
                    )}
                  >
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="interval" value={p.interval} />
                    <input
                      type="hidden"
                      name="coupon"
                      value={cupaoGasto ? "" : FOUNDERS_CODE}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        {comDesconto ? (
                          <>
                            <span className="data-mono text-title3 text-fg">
                              {comDesconto}
                            </span>
                            <span className="data-mono text-footnote text-fg-subtle line-through">
                              {p.formatted}
                            </span>
                          </>
                        ) : (
                          <span className="data-mono text-title3 text-fg">
                            {p.formatted}
                          </span>
                        )}
                      </span>
                      <span className="text-caption text-fg-subtle">
                        {anualEste ? copy.year : copy.month}
                        {comDesconto
                          ? ` · ${copy.withFounders}`
                          : anualEste && poupanca > 0
                            ? ` · ${t(copy.yearSaving, { percent: poupanca })}`
                            : ""}
                      </span>
                    </span>
                    <Button type="submit" variant={anualEste ? "primary" : "secondary"}>
                      {copy.choose}
                    </Button>
                  </form>
                );
              })}
            </div>

            <ul className="flex flex-col gap-2.5 border-t border-hairline pt-4">
              {copy.proItems.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span className="text-callout text-fg-muted">{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-caption leading-relaxed text-fg-subtle">
              {cupaoGasto ? copy.couponUsed : copy.couponHint}
            </p>
          </Card>

          <Card className="flex flex-col gap-3 bg-accent-soft">
            <p className="text-callout leading-relaxed text-fg">{copy.founders}</p>
          </Card>
        </>
      ) : null}

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-title3 text-fg">{copy.freeTitle}</h2>
          {!ehPro ? <Badge>{copy.current}</Badge> : null}
        </div>
        <ul className="flex flex-col gap-2.5">
          {copy.freeItems.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
              <span className="text-callout text-fg-muted">{item}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
