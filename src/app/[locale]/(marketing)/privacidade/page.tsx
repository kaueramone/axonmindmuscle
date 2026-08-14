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

  return (
    <div className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <h1 className="text-large text-fg">{dict.marketing.shared.footerPrivacy}</h1>
      <p className="mt-5 text-callout text-fg-muted">
        {dict.common.inDevelopment}.
      </p>
    </div>
  );
}
