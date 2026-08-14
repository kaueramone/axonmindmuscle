import Link from "next/link";

import { LogoLockup } from "@/components/brand/logo";
import { LocaleSwitch } from "@/components/marketing/locale-switch";
import type { Dict } from "@/lib/i18n/types";
import { marketByLocale, type Locale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dict }) {
  const shared = dict.marketing.shared;
  const market = marketByLocale[locale];
  const year = new Date().getFullYear();

  const columns = [
    {
      title: shared.footerMethod,
      links: [
        { href: route(locale, "science"), label: dict.nav.science },
        { href: route(locale, "home"), label: dict.nav.home },
      ],
    },
    {
      title: shared.footerApp,
      links: [
        { href: route(locale, "signUp"), label: dict.nav.signUp },
        { href: route(locale, "signIn"), label: dict.nav.signIn },
      ],
    },
    {
      title: shared.footerLegal,
      links: [
        { href: route(locale, "terms"), label: shared.footerTerms },
        { href: route(locale, "privacy"), label: shared.footerPrivacy },
      ],
    },
  ];

  return (
    <footer className="border-t border-hairline bg-bg-sunken/50">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="flex flex-col items-start gap-5">
            <LogoLockup className="h-20 w-auto text-fg sm:h-24" />
            <p className="max-w-xs text-footnote text-fg-subtle">
              {dict.meta.tagline}
            </p>
            <LocaleSwitch locale={locale} className="w-fit" />
          </div>

          {columns.map((column) => (
            <nav key={column.title} className="flex flex-col gap-3">
              <h3 className="label-brand text-fg-subtle">{column.title}</h3>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-subhead text-fg-muted transition-colors hover:text-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-hairline pt-6 text-caption text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {dict.common.brandFull}. {shared.footerRights}
          </p>
          <p className="flex items-center gap-1.5">
            <span>
              {shared.footerMarket}: {market.label} · {market.currency}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {shared.footerBuiltBy}{" "}
              <a
                href="https://kaueramone.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg-muted transition-colors hover:text-fg"
              >
                kaueramone.dev
              </a>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
