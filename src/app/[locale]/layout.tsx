import { notFound } from "next/navigation";

import { HtmlLang } from "@/components/html-lang";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <>
      <HtmlLang locale={locale as Locale} />
      {children}
    </>
  );
}
