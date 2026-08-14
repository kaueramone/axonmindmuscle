import { assertLocale } from "@/lib/i18n/config";
import { redirect } from "next/navigation";

import { TabBar } from "@/components/app/tab-bar";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O middleware já protege estas rotas; esta verificação é a segunda linha.
  if (!user) redirect(route(locale, "signIn"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed_at) redirect(route(locale, "onboarding"));

  return (
    <div className="min-h-dvh pb-24">
      {children}
      <TabBar
        locale={locale}
        labels={{
          today: dict.nav.today,
          progress: dict.nav.progress,
          community: dict.nav.community,
          profile: dict.nav.profile,
        }}
      />
    </div>
  );
}
