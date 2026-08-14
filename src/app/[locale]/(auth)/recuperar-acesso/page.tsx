import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";

import { RecoverForm } from "@/components/auth/recover-forms";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  return { title: dict.auth.recover.title, robots: { index: false } };
}

export default async function RecoverPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-large text-fg">{dict.auth.recover.title}</h1>
        <p className="mt-2 text-callout text-fg-muted">{dict.auth.recover.subtitle}</p>
      </div>
      <RecoverForm locale={locale} dict={dict} />
    </div>
  );
}
