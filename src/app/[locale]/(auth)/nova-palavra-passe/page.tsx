import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/recover-forms";
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
  return { title: dict.auth.reset.title, robots: { index: false } };
}

export default async function ResetPasswordPage({
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
        <h1 className="text-large text-fg">{dict.auth.reset.title}</h1>
        <p className="mt-2 text-callout text-fg-muted">{dict.auth.reset.subtitle}</p>
      </div>
      <ResetPasswordForm locale={locale} dict={dict} />
    </div>
  );
}
