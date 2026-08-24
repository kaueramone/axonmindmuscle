import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { ProfileForm } from "@/components/app/profile-form";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/surface";
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
  const copy = dict.app.profile;

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
        themeLabels={{
          light: dict.app.account.appearanceLight,
          dark: dict.app.account.appearanceDark,
        }}
        eyebrow={dict.common.tagline}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 pt-6">
        <ProfileForm profile={profile} dict={dict} locale={locale} />

        {/* O plano vive aqui e não só nas definições: é no perfil que a pessoa
            olha para quem é dentro do produto, e o plano faz parte disso. */}
        <section className="flex flex-col gap-2">
          <h2 className="label-brand px-4 text-fg-subtle">{copy.planTitle}</h2>

          <Card className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-title3 text-fg">
                  {profile.plan === "pro" ? copy.planPro : copy.planFree}
                </span>
                <p className="text-callout leading-relaxed text-fg-muted">
                  {profile.plan === "pro" ? copy.planProBody : copy.planFreeBody}
                </p>
              </div>
              {profile.plan === "pro" ? <Badge tone="accent">PRO</Badge> : null}
            </div>

            <ButtonLink
              href={route(locale, "plans")}
              variant={profile.plan === "pro" ? "secondary" : "primary"}
              fullWidth
            >
              {profile.plan === "pro" ? copy.planManage : copy.planCta}
            </ButtonLink>

            {profile.plan === "pro" ? null : (
              <p className="text-footnote leading-relaxed text-fg-subtle">
                {copy.planFounders}
              </p>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
