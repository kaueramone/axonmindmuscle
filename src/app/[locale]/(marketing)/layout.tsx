import { assertLocale } from "@/lib/i18n/config";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingLayout({
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

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        locale={locale}
        authed={!!user}
        openAppLabel={dict.nav.openApp}
        labels={{
          home: dict.nav.home,
          science: dict.nav.science,
          signIn: dict.nav.signIn,
          signUp: dict.nav.signUp,
          menu: dict.nav.menu,
          close: dict.common.close,
        }}
      />
      <main className="flex-1 pt-16">{children}</main>
      <SiteFooter locale={locale} dict={dict} />
    </div>
  );
}
