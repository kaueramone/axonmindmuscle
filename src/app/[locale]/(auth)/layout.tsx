import { assertLocale } from "@/lib/i18n/config";
import Link from "next/link";

import { LogoLockup } from "@/components/brand/logo";
import { LocaleSwitch } from "@/components/marketing/locale-switch";
import { ChevronLeft } from "@/components/ui/icons";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(50%_60%_at_50%_0%,var(--accent-soft),transparent_75%)]"
      />

      <header className="relative flex items-center justify-between gap-4 px-5 py-5 safe-t sm:px-8">
        <Link
          href={route(locale, "home")}
          className="inline-flex items-center gap-1.5 text-subhead text-fg-muted transition-colors hover:text-fg"
        >
          <ChevronLeft className="size-4" />
          {dict.auth.backHome}
        </Link>
        <LocaleSwitch locale={locale} />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-5 pb-16 pt-4 sm:px-8">
        <div className="w-full max-w-[26rem]">
          <div className="mb-10 flex justify-center">
            <Link href={route(locale, "home")} aria-label={dict.common.brandFull}>
              <LogoLockup className="h-14 w-auto text-fg" />
            </Link>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
