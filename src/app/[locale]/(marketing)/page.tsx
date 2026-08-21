import type { Metadata } from "next";
import Link from "next/link";

import { LogoSymbol, LogoWordmark } from "@/components/brand/logo";
import { AxonField } from "@/components/marketing/axon-field";
import { MetronomeDemo } from "@/components/marketing/metronome-demo";
import { Reveal } from "@/components/marketing/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRight, Check, Sparkle } from "@/components/ui/icons";
import { Badge } from "@/components/ui/surface";
import { getDictionary } from "@/lib/i18n";
import { assertLocale, marketByLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import { route } from "@/lib/routes";
import { SITE_URL } from "@/lib/utils";

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
              <p className="mt-4 text-footnote text-fg-subtle">{copy.trustLine}</p>
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
      <section className="border-t border-hairline">
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
      <section className="border-t border-hairline">
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
            <Badge tone="accent">{dict.common.inDevelopment}</Badge>
            <h2 className="mt-5 text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-fg">
              {copy.readinessTitle}
            </h2>
            <p className="mt-5 text-title3 leading-relaxed text-fg-muted">
              {copy.readinessBody}
            </p>
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
      <section className="border-t border-hairline bg-bg-sunken/40">
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
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-fg">
              {copy.pricingTitle}
            </h2>
            <p className="mt-4 text-title3 text-fg-muted">{copy.pricingBody}</p>
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-3xl gap-5 md:grid-cols-2">
            <Reveal>
              <article className="flex h-full flex-col rounded-2xl border border-accent/40 bg-surface p-7 shadow-[0_0_0_1px_var(--accent-soft)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-title3 text-fg">{copy.pricingFreeTitle}</h3>
                  <Badge tone="accent">{dict.common.free}</Badge>
                </div>
                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {copy.pricingFreeItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span className="text-callout text-fg-muted">{item}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href={route(locale, "signUp")}
                  className="mt-7"
                  fullWidth
                >
                  {copy.primaryCta}
                </ButtonLink>
              </article>
            </Reveal>

            <Reveal delay={100}>
              <article className="flex h-full flex-col rounded-2xl border border-hairline bg-surface p-7">
                <div className="flex items-center justify-between">
                  <h3 className="text-title3 text-fg">{copy.pricingProTitle}</h3>
                  <Badge>{dict.common.soon}</Badge>
                </div>
                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {copy.pricingProItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
                      <span className="text-callout text-fg-muted">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-7 text-footnote text-fg-subtle">
                  {t(copy.pricingProNote, { payment: market.paymentMethod })}
                </p>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------- Fecho ---------------- */}
      <section className="border-t border-hairline bg-bg-sunken/40">
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
