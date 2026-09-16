import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import Link from "next/link";

import { LogoSymbol, LogoWordmark } from "@/components/brand/logo";
import { AxonField } from "@/components/marketing/axon-field";
import { MetronomeDemo } from "@/components/marketing/metronome-demo";
import { Reveal } from "@/components/marketing/reveal";
import { SecaoFoto } from "@/components/marketing/secao-foto";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRight, Check, ChevronDown, Close, Sparkle } from "@/components/ui/icons";
import { Badge } from "@/components/ui/surface";
import { getDictionary } from "@/lib/i18n";
import { assertLocale, formatCurrency, marketByLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import { route } from "@/lib/routes";
import {
  billingEnabled,
  fetchFoundersDiscounts,
  fetchPrices,
  type BillingInterval,
  type PriceView,
} from "@/lib/stripe/server";
import { FOUNDERS_CODE } from "@/lib/stripe/shared";
import type { MarketCode } from "@/lib/supabase/types";
import { SITE_URL } from "@/lib/utils";

/**
 * Os preços da LP são os do Stripe, os mesmos da página Planos: a landing
 * nunca anuncia um valor diferente do que vai ser cobrado. Uma hora de cache
 * porque a LP é pública e o Stripe não tem de ser chamado a cada visita.
 * Sem configuração, ou com o Stripe em baixo, a página mostra os planos sem
 * números e aponta para a aplicação.
 */
const precosDaLp = unstable_cache(
  async (
    market: MarketCode,
    intl: string,
  ): Promise<{ precos: PriceView[]; descontos: Partial<Record<BillingInterval, number>> }> => {
    if (!billingEnabled()) return { precos: [], descontos: {} };
    // Um erro aqui não fica em cache: a exceção sobe e a página cai no
    // recuo só nesse pedido, em vez de esconder os preços durante uma hora.
    const [precos, descontos] = await Promise.all([
      fetchPrices(market, intl),
      fetchFoundersDiscounts(),
    ]);
    return { precos, descontos };
  },
  ["lp-precos"],
  { revalidate: 3600 },
);

async function lerPrecos(market: MarketCode, intl: string) {
  try {
    return await precosDaLp(market, intl);
  } catch (erro) {
    console.error("[lp] preços indisponíveis:", (erro as Error)?.message);
    return { precos: [] as PriceView[], descontos: {} as Partial<Record<BillingInterval, number>> };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);

  return {
    title: dict.meta.fitnessTitle,
    description: dict.meta.fitnessDescription,
    alternates: {
      canonical: `${SITE_URL}${route(locale, "home")}`,
      languages: {
        "pt-PT": `${SITE_URL}/pt-pt`,
        "pt-BR": `${SITE_URL}/pt-br`,
      },
    },
    openGraph: {
      title: dict.meta.fitnessTitle,
      description: dict.meta.fitnessDescription,
      url: `${SITE_URL}${route(locale, "home")}`,
      siteName: dict.meta.siteName,
      locale: marketByLocale[locale].hreflang.replace("-", "_"),
      type: "website",
    },
  };
}

export default async function FitnessLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  const copy = dict.marketing.fitness;
  const market = marketByLocale[locale];

  const { precos, descontos } = await lerPrecos(market.market, market.intl);
  const mensal = precos.find((p) => p.interval === "month");
  const anual = precos.find((p) => p.interval === "year");
  const poupanca =
    mensal && anual && mensal.amount > 0
      ? Math.round((1 - anual.amount / (mensal.amount * 12)) * 100)
      : 0;
  /** Preço com o desconto de fundador aplicado, ou null se não há cupão. */
  const comFundadores = (p: PriceView) => {
    const d = descontos[p.interval];
    return d ? formatCurrency(p.amount * (1 - d / 100), locale) : null;
  };
  const assinarHref = `${route(locale, "signUp")}?next=${encodeURIComponent(route(locale, "plans"))}`;

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <AxonField />

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              {/* Wordmark do manual: acompanha o tema por currentColor. */}
              <LogoWordmark
                className="mx-auto h-14 w-auto text-fg sm:h-16"
                title={dict.common.brandFull}
              />
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-6 text-[clamp(2.5rem,7vw,4.5rem)] font-bold leading-[1.04] tracking-[-0.03em] text-fg">
                {copy.headline}
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mx-auto mt-6 max-w-2xl text-title3 leading-relaxed text-fg-muted">
                {copy.subheadline}
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink href={route(locale, "signUp")} size="lg">
                  {copy.primaryCta}
                  <ArrowRight className="size-4" />
                </ButtonLink>
                <ButtonLink
                  href={route(locale, "science")}
                  size="lg"
                  variant="secondary"
                >
                  {copy.secondaryCta}
                </ButtonLink>
              </div>
              <p className="mt-4 text-footnote text-fg-subtle">
                {copy.trustLine}{" "}
                <a href="#planos" className="font-medium text-accent hover:opacity-70">
                  {copy.professorCta}
                </a>
              </p>
            </Reveal>
          </div>

          <Reveal delay={320} className="mt-20">
            <div className="mx-auto max-w-md">
              <LogoSymbol className="h-auto w-full text-fg opacity-90" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Três pilares ---------------- */}
      <section className="relative isolate border-t border-hairline">
        <SecaoFoto src="/lp/academia.jpg" posicao="center 40%" />
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-fg">
              {copy.pillarsTitle}
            </h2>
            <p className="mt-4 text-title3 text-fg-muted">{copy.pillarsSubtitle}</p>
          </Reveal>

          <ul className="mt-14 grid gap-5 md:grid-cols-3">
            {copy.pillars.map((pillar, index) => (
              <Reveal as="li" key={pillar.index} delay={index * 90}>
                <article className="h-full rounded-2xl border border-hairline bg-surface p-7 transition-colors duration-300 hover:bg-surface-strong">
                  <p className="data-mono text-title2 text-accent">{pillar.index}</p>
                  <h3 className="mt-5 text-title3 text-fg">{pillar.title}</h3>
                  <p className="mt-3 text-callout leading-relaxed text-fg-muted">
                    {pillar.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- Ferramentas ---------------- */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-fg">
              {copy.toolsTitle}
            </h2>
            <p className="mt-4 text-title3 text-fg-muted">{copy.toolsSubtitle}</p>
          </Reveal>

          <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {copy.tools.map((tool, index) => (
              <Reveal as="li" key={tool.title} delay={(index % 3) * 90}>
                <article className="flex h-full flex-col rounded-2xl border border-hairline bg-surface p-6 transition-colors duration-300 hover:bg-surface-strong">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-title3 text-fg">{tool.title}</h3>
                    <Badge tone={tool.plan === "free" ? "neutral" : "accent"}>
                      {copy.toolPlanLabels[tool.plan as keyof typeof copy.toolPlanLabels]}
                    </Badge>
                  </div>
                  <p className="mt-3 text-callout leading-relaxed text-fg-muted">{tool.body}</p>
                </article>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- Metrónomo ---------------- */}
      <section className="border-t border-hairline bg-bg-sunken/40">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
          <Reveal>
            <p className="label-brand text-fg-subtle">{copy.metronomeEyebrow}</p>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-fg">
              {copy.metronomeTitle}
            </h2>
            <p className="mt-5 text-title3 leading-relaxed text-fg-muted">
              {copy.metronomeBody}
            </p>
            <p className="mt-6 border-l-2 border-accent/50 pl-4 text-headline leading-relaxed text-fg">
              {copy.metronomeNote}
            </p>
            <p className="mt-6 text-footnote text-fg-subtle">
              {copy.metronomeEquipment}
            </p>
          </Reveal>

          <Reveal delay={120}>
            <MetronomeDemo
              caption={copy.metronomeCaption}
              labels={copy.metronomePhases}
            />
          </Reveal>
        </div>
      </section>

      {/* ---------------- Prontidão ---------------- */}
      <section className="relative isolate border-t border-hairline">
        <SecaoFoto src="/lp/casa.jpg" posicao="center 45%" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
          <Reveal delay={120} className="order-2 lg:order-1">
            <div className="flex flex-col gap-3">
              {(
                [
                  { key: "strong", tone: "success", bar: "w-full" },
                  { key: "moderate", tone: "warning", bar: "w-2/3" },
                  { key: "rest", tone: "danger", bar: "w-1/3" },
                ] as const
              ).map((state) => (
                <div
                  key={state.key}
                  className="flex items-center gap-4 rounded-xl border border-hairline bg-surface px-5 py-4"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: `var(--${state.tone})` }}
                  />
                  <span className="flex-1 text-callout font-medium text-fg">
                    {copy.readinessStates[state.key]}
                  </span>
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-strong">
                    <span
                      className={`block h-full rounded-full ${state.bar}`}
                      style={{ background: `var(--${state.tone})` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="order-1 lg:order-2">
            <Badge tone="neutral">{dict.common.free}</Badge>
            <h2 className="mt-5 text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-fg">
              {copy.readinessTitle}
            </h2>
            <p className="mt-5 text-title3 leading-relaxed text-fg-muted">
              {copy.readinessBody}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Professor AXON ---------------- */}
      <section className="border-t border-hairline bg-bg-sunken/40">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
          <Reveal>
            <Badge tone="accent">{copy.professorEyebrow}</Badge>
            <h2 className="mt-5 text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-fg">
              {copy.professorTitle}
            </h2>
            <p className="mt-5 text-title3 leading-relaxed text-fg-muted">
              {copy.professorBody}
            </p>
            <ul className="mt-7 flex flex-col gap-2.5">
              {copy.professorPoints.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-1 size-4 shrink-0 text-accent" />
                  <span className="text-callout text-fg-muted">{item}</span>
                </li>
              ))}
            </ul>
            <ButtonLink href="#planos" variant="secondary" className="mt-8">
              {copy.professorCta}
              <ArrowRight className="size-4" />
            </ButtonLink>
          </Reveal>

          {/* A mesma cena da aplicação: o Professor no canto e o balão com
              uma pergunta real e a resposta que ele dá. */}
          <Reveal delay={120}>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-end sm:gap-4">
              <Image
                src="/professor-axon.webp"
                alt={copy.professorEyebrow}
                width={537}
                height={600}
                unoptimized
                className="h-44 w-auto self-start drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)] sm:h-64 sm:self-end"
              />
              <div className="relative flex-1 rounded-xl border border-hairline-strong material-thick p-4 shadow-[var(--shadow-float)]">
                <span
                  aria-hidden
                  className="absolute -bottom-2 left-14 size-4 rotate-45 border-b border-r border-hairline-strong material-thick sm:bottom-24 sm:-left-2 sm:border-l sm:border-r-0"
                />
                <p className="ml-auto w-fit max-w-[90%] rounded-lg rounded-br-xs bg-accent-solid px-3.5 py-2 text-subhead text-accent-fg">
                  {copy.professorDemoQuestion}
                </p>
                <p className="mt-3 text-subhead leading-relaxed text-fg">
                  {copy.professorDemoAnswer}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Como a AXON pensa ---------------- */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
          <Reveal>
            <p className="label-brand text-accent">{copy.thinkingEyebrow}</p>
            <h2 className="mt-4 text-[clamp(1.5rem,3.4vw,2.25rem)] leading-tight text-fg">
              {copy.thinkingTitle}
            </h2>
            <p className="mt-5 text-title3 leading-relaxed text-fg-muted">
              {copy.thinkingBody}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Evidência ---------------- */}
      <section className="relative isolate border-t border-hairline bg-bg-sunken/40">
        <SecaoFoto src="/lp/ar-livre.jpg" posicao="center 35%" />
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <Reveal>
            <Sparkle className="mx-auto size-8 text-accent" />
            <h2 className="mt-6 text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-fg">
              {copy.proofTitle}
            </h2>
            <p className="mt-5 text-title3 leading-relaxed text-fg-muted">
              {copy.proofBody}
            </p>
            <Link
              href={route(locale, "science")}
              className="mt-7 inline-flex items-center gap-2 text-headline font-semibold text-accent transition-opacity hover:opacity-70"
            >
              {copy.proofCta}
              <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Planos ---------------- */}
      <section id="planos" className="scroll-mt-20 border-t border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-fg">
              {copy.pricingTitle}
            </h2>
            <p className="mt-4 text-title3 text-fg-muted">{copy.pricingBody}</p>
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-3xl gap-5 md:grid-cols-2">
            <Reveal>
              <article className="flex h-full flex-col rounded-2xl border border-hairline bg-surface p-7">
                <h3 className="text-title3 text-fg">{copy.pricingFreeTitle}</h3>
                <p className="mt-5 flex items-baseline gap-2">
                  <span className="data-mono text-title1 text-fg">{formatCurrency(0, locale)}</span>
                  <span className="text-callout text-fg-muted">{copy.pricingFreeForever}</span>
                </p>
                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {copy.pricingFreeItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span className="text-callout text-fg-muted">{item}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink href={route(locale, "signUp")} variant="secondary" className="mt-7" fullWidth>
                  {copy.primaryCta}
                </ButtonLink>
                <p className="mt-3 text-center text-footnote text-fg-subtle">{copy.trustLine}</p>
              </article>
            </Reveal>

            <Reveal delay={100}>
              <article className="flex h-full flex-col rounded-2xl border border-accent/40 bg-surface p-7 shadow-[0_0_0_1px_var(--accent-soft)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-title3 text-fg">{copy.pricingProTitle}</h3>
                  {mensal && descontos.month ? (
                    <Badge tone="accent">{copy.pricingProBadge}</Badge>
                  ) : (
                    <Badge tone="accent">{dict.common.pro}</Badge>
                  )}
                </div>

                {mensal ? (
                  <div className="mt-5">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="data-mono text-title1 text-fg">
                        {comFundadores(mensal) ?? mensal.formatted}
                      </span>
                      <span className="text-callout text-fg-muted">{copy.pricingProMonth}</span>
                    </p>
                    {comFundadores(mensal) ? (
                      <p className="mt-1 text-footnote text-fg-subtle">
                        <s>{mensal.formatted}</s> {t(copy.pricingProCode, { code: FOUNDERS_CODE })}
                      </p>
                    ) : null}
                    {anual ? (
                      <p className="mt-2 text-footnote text-fg-muted">
                        {copy.pricingProOr}{" "}
                        <span className="font-semibold text-fg">
                          {comFundadores(anual) ?? anual.formatted}
                        </span>{" "}
                        {copy.pricingProYear}
                        {poupanca > 0 ? `, ${t(copy.pricingProYearSaving, { percent: poupanca })}` : ""}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-5 text-callout text-fg-muted">{copy.pricingUnavailable}</p>
                )}

                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {copy.pricingProItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span className="text-callout text-fg-muted">{item}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink href={assinarHref} className="mt-7" fullWidth>
                  {copy.pricingProCta}
                  <ArrowRight className="size-4" />
                </ButtonLink>
                <p className="mt-3 text-center text-footnote text-fg-subtle">
                  {t(copy.pricingProPayment, { payment: market.paymentMethod })}
                </p>
                {mensal && descontos.month ? (
                  <p className="mt-4 border-t border-hairline pt-4 text-footnote leading-relaxed text-fg-subtle">
                    {copy.pricingProFounders}
                  </p>
                ) : null}
              </article>
            </Reveal>
          </div>

          {/* A tabela: a mesma lista para os dois planos, sem letras pequenas. */}
          <Reveal className="mx-auto mt-10 max-w-3xl">
            <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline">
                    <th scope="col" className="px-5 py-4 text-left text-subhead font-medium text-fg-subtle">
                      {copy.compareTitle}
                    </th>
                    <th scope="col" className="w-20 px-2 py-4 text-center text-subhead font-semibold text-fg sm:w-28">
                      {copy.compareFree}
                    </th>
                    <th scope="col" className="w-20 px-2 py-4 text-center text-subhead font-semibold text-accent sm:w-28">
                      {copy.comparePro}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hairline)]">
                  {copy.compareRows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-5 py-3.5 text-callout text-fg-muted">{row.label}</td>
                      <td className="px-2 py-3.5 text-center">
                        <Incluido sim={row.free} yes={copy.compareIncluded} no={copy.compareNotIncluded} />
                      </td>
                      <td className="px-2 py-3.5 text-center">
                        <Incluido sim={row.pro} yes={copy.compareIncluded} no={copy.compareNotIncluded} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Perguntas frequentes ---------------- */}
      <section className="border-t border-hairline bg-bg-sunken/40">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-fg">
              {copy.faqTitle}
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-10 divide-y divide-[var(--hairline)] rounded-2xl border border-hairline bg-surface">
              {copy.faq.map((item) => (
                <details key={item.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-headline font-semibold text-fg [&::-webkit-details-marker]:hidden">
                    {t(item.q, { code: FOUNDERS_CODE })}
                    <ChevronDown className="size-4 shrink-0 text-fg-subtle transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-callout leading-relaxed text-fg-muted">
                    {t(item.a, { payment: market.paymentMethod, code: FOUNDERS_CODE })}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Fecho ---------------- */}
      <section className="relative isolate border-t border-hairline bg-bg-sunken/40">
        <SecaoFoto src="/lp/fecho.jpg" posicao="center 50%" />
        <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8 sm:py-32">
          <Reveal>
            <h2 className="text-[clamp(2rem,5vw,3.25rem)] leading-tight tracking-[-0.03em] text-fg">
              {copy.finalTitle}
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-title3 text-fg-muted">
              {copy.finalBody}
            </p>
            <ButtonLink href={route(locale, "signUp")} size="lg" className="mt-9">
              {copy.finalCta}
              <ArrowRight className="size-4" />
            </ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/** Uma célula da tabela de planos: visto ou cruz, com texto para leitores de ecrã. */
function Incluido({ sim, yes, no }: { sim: boolean; yes: string; no: string }) {
  return sim ? (
    <>
      <Check className="mx-auto size-4 text-accent" />
      <span className="sr-only">{yes}</span>
    </>
  ) : (
    <>
      <Close className="mx-auto size-4 text-fg-subtle/50" />
      <span className="sr-only">{no}</span>
    </>
  );
}
