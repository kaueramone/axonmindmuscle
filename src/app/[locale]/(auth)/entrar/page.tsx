import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/sign-in-form";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  return { title: dict.auth.signIn.title, robots: { index: false } };
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const { redirect, error } = await searchParams;
  const dict = await getDictionary(locale);

  const initialError =
    error && error in dict.errors ? (error as keyof Dict["errors"]) : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-large text-fg">{dict.auth.signIn.title}</h1>
        <p className="mt-2 text-callout text-fg-muted">{dict.auth.signIn.subtitle}</p>
      </div>
      <SignInForm
        locale={locale}
        dict={dict}
        redirectTo={redirect}
        initialError={initialError}
      />
    </div>
  );
}
