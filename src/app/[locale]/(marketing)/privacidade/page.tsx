import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";

import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

export const metadata: Metadata = { title: "Privacidade" };

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);

  const copy = dict.privacyPolicy;

  return (
    <div className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <h1 className="text-large text-fg">{dict.marketing.shared.footerPrivacy}</h1>
      <p className="mt-2 text-caption text-fg-subtle">{copy.updated}</p>
      <p className="mt-5 text-callout leading-relaxed text-fg-muted">{copy.intro}</p>

      <div className="mt-12 flex flex-col gap-10">
        {copy.sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-3">
            <h2 className="text-title3 text-fg">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-callout leading-relaxed text-fg-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
