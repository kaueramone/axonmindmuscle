import type { Metadata } from "next";

import { LogoSymbol } from "@/components/brand/logo";
import { Reveal } from "@/components/marketing/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRight, Info } from "@/components/ui/icons";
import { Badge } from "@/components/ui/surface";
import { getDictionary } from "@/lib/i18n";
import { assertLocale, marketByLocale, type Locale } from "@/lib/i18n/config";
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
    title: dict.meta.scienceTitle,
    description: dict.meta.scienceDescription,
    alternates: {
      canonical: `${SITE_URL}${route(locale, "science")}`,
      languages: {
        "pt-PT": `${SITE_URL}/pt-pt/ciencia`,
        "pt-BR": `${SITE_URL}/pt-br/ciencia`,
      },
    },
    openGraph: {
      title: dict.meta.scienceTitle,
      description: dict.meta.scienceDescription,
      url: `${SITE_URL}${route(locale, "science")}`,
      siteName: dict.meta.siteName,
      locale: marketByLocale[locale].hreflang.replace("-", "_"),
      type: "article",
    },
  };
}

export default async function SciencePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  const copy = dict.marketing.science;
  const shared = dict.marketing.shared;

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-4xl px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
          <Reveal>
            <p className="label-brand text-accent">{copy.eyebrow}</p>
            <h1 className="mt-6 text-[clamp(2.25rem,6vw,4rem)] font-bold leading-[1.06] tracking-[-0.03em] text-fg">
              {copy.headline}
            </h1>
            <p className="mt-6 max-w-2xl text-title3 leading-relaxed text-fg-muted">
              {copy.subheadline}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={route(locale, "signUp")} size="lg">
                {copy.primaryCta}
                <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href={route(locale, "home")} size="lg" variant="secondary">
                {copy.secondaryCta}
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Princípios ---------------- */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] text-fg">
              {copy.principlesTitle}
            </h2>
          </Reveal>

          <ul className="mt-12 grid gap-5 md:grid-cols-3">
            {copy.principles.map((principle, index) => (
              <Reveal as="li" key={principle.index} delay={index * 90}>
                <article className="h-full rounded-2xl border border-hairline bg-surface p-7">
                  <p className="data-mono text-title2 text-accent">
                    {principle.index}
                  </p>
                  <h3 className="mt-5 text-title3 text-fg">{principle.title}</h3>
                  <p className="mt-3 text-callout leading-relaxed text-fg-muted">
                    {principle.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- Da literatura ao treino ---------------- */}
      <section className="border-b border-hairline bg-bg-sunken/40">
        <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] text-fg">
              {copy.pipelineTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-title3 text-fg-muted">
              {copy.pipelineSubtitle}
            </p>
          </Reveal>

          <ol className="mt-12 flex flex-col">
            {copy.pipeline.map((step, index) => (
              <Reveal as="li" key={step.step} delay={index * 80}>
                <div className="relative flex gap-6 pb-12 last:pb-0">
                  {index < copy.pipeline.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-[1.4375rem] top-14 bottom-1 w-px bg-hairline-strong"
                    />
                  ) : null}

                  <span className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full border border-accent/40 bg-bg text-accent">
                    <span className="data-mono text-subhead">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </span>

                  <div className="pt-1.5">
                    <p className="label-brand text-fg-subtle">{step.step}</p>
                    <h3 className="mt-2 text-title3 text-fg">{step.title}</h3>
                    <p className="mt-2 max-w-xl text-callout leading-relaxed text-fg-muted">
                      {step.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- Variáveis ---------------- */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] text-fg">
              {copy.variablesTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-title3 text-fg-muted">
              {copy.variablesSubtitle}
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {copy.variables.map((variable, index) => (
              <Reveal key={variable.name} delay={(index % 3) * 80}>
                <article className="h-full rounded-xl border border-hairline bg-surface p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-headline font-semibold text-fg">
                      {variable.name}
                    </h3>
                  </div>
                  <p className="data-mono mt-1 text-caption text-accent">
                    {variable.unit}
                  </p>
                  <p className="mt-4 text-subhead leading-relaxed text-fg-muted">
                    {variable.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- O símbolo ---------------- */}
      <section className="border-b border-hairline bg-bg-sunken/40">
        <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] text-fg">
              {shared.symbolTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-title3 leading-relaxed text-fg-muted">
              {shared.symbolBody}
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-12">
              <LogoSymbol className="h-auto w-full text-fg" />
            </div>
          </Reveal>

          <Reveal delay={200}>
            <dl className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["openTitle", "openBody"],
                  ["axonTitle", "axonBody"],
                  ["impulseTitle", "impulseBody"],
                  ["solidTitle", "solidBody"],
                ] as const
              ).map(([titleKey, bodyKey]) => (
                <div key={titleKey}>
                  <dt className="label-brand text-accent">
                    {shared.symbolNodes[titleKey]}
                  </dt>
                  <dd className="mt-2 text-subhead text-fg-muted">
                    {shared.symbolNodes[bodyKey]}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Professor AXON ---------------- */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <Badge tone="accent">{dict.common.inDevelopment}</Badge>
            <h2 className="mt-5 text-[clamp(1.75rem,4vw,2.5rem)] text-fg">
              {copy.assistantTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-title3 leading-relaxed text-fg-muted">
              {copy.assistantBody}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Honestidade de âmbito ---------------- */}
      <section className="border-b border-hairline bg-bg-sunken/40">
        <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] text-fg">
              {copy.honestyTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-title3 leading-relaxed text-fg-muted">
              {copy.honestyBody}
            </p>

            <ul className="mt-9 flex flex-col gap-2.5">
              {copy.honestyItems.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-md border border-hairline bg-surface px-4 py-3"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-fg-subtle" />
                  <span className="text-subhead text-fg-muted">{item}</span>
                </li>
              ))}
            </ul>

            <p className="mt-7 flex items-start gap-2.5 text-subhead text-fg-subtle">
              <Info className="mt-0.5 size-4 shrink-0" />
              {copy.honestyNote}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Fecho ---------------- */}
      <section>
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
