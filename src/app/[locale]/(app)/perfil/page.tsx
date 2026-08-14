import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { ProfileForm } from "@/components/app/profile-form";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Perfil", robots: { index: false } };

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect(route(locale, "onboarding"));

  return (
    <>
      <AppHeader
        title={dict.app.profile.title}
        locale={locale}
        accountLabel={dict.nav.account}
        eyebrow={dict.common.tagline}
      />

      <div className="mx-auto max-w-2xl px-5 pt-6">
        <ProfileForm profile={profile} dict={dict} />
      </div>
    </>
  );
}
