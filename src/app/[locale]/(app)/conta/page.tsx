import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountSettings } from "@/components/app/account-settings";
import { AppHeader } from "@/components/app/app-header";
import { DataOwnership } from "@/components/app/data-ownership";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conta", robots: { index: false } };

export default async function AccountPage({
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
    .select("plan, role, deletion_requested_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <AppHeader
        title={dict.app.account.title}
        locale={locale}
        accountLabel={dict.nav.account}
        themeLabels={{
          light: dict.app.account.appearanceLight,
          dark: dict.app.account.appearanceDark,
        }}
        eyebrow={dict.common.tagline}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 pt-6">
        <AccountSettings
          locale={locale}
          dict={dict}
          email={user.email ?? ""}
          plan={profile?.plan ?? "free"}
          isAdmin={profile?.role === "admin"}
        />

        <DataOwnership
          locale={locale}
          dict={dict}
          deletionRequestedAt={profile?.deletion_requested_at ?? null}
        />
      </div>
    </>
  );
}
