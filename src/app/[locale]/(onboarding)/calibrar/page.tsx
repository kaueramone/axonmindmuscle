import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/app/onboarding-wizard";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { route, safeNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Calibrar", robots: { index: false } };

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const { next } = await searchParams;
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  const destino = safeNext(next);
  if (profile?.onboarding_completed_at) redirect(destino ?? route(locale, "today"));

  const fallbackName =
    profile?.display_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    "";

  return (
    <OnboardingWizard
      locale={locale}
      dict={dict}
      defaultName={fallbackName}
      next={destino}
    />
  );
}
