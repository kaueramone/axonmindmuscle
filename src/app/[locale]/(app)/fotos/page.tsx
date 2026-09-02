import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { ProgressPhotos } from "@/components/app/progress-photos";
import { getDictionary } from "@/lib/i18n";
import { assertLocale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Fotos de progresso", robots: { index: false } };

/**
 * A página é só a moldura: as fotografias vivem no dispositivo e o servidor
 * nunca as vê. A sessão é verificada na mesma — é uma página da aplicação.
 */
export default async function PhotosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  const copy = dict.app.photos;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(route(locale, "signIn"));

  return (
    <>
      <AppHeader
        title={copy.title}
        locale={locale}
        accountLabel={dict.nav.account}
        themeLabels={{
          light: dict.app.account.appearanceLight,
          dark: dict.app.account.appearanceDark,
        }}
        eyebrow={dict.common.tagline}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 pt-6">
        <p className="text-callout leading-relaxed text-fg-muted">{copy.intro}</p>
        <ProgressPhotos copy={copy} locale={locale} />
      </div>
    </>
  );
}
