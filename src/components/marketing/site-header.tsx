"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LogoLockup } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Close } from "@/components/ui/icons";
import { LocaleSwitch } from "@/components/marketing/locale-switch";
import type { Locale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Labels = {
  home: string;
  science: string;
  signIn: string;
  signUp: string;
  menu: string;
  close: string;
};

export function SiteHeader({
  locale,
  labels,
  authed,
  openAppLabel,
}: {
  locale: Locale;
  labels: Labels;
  authed: boolean;
  openAppLabel: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: route(locale, "home"), label: labels.home },
    { href: route(locale, "science"), label: labels.science },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 safe-t transition-[background-color,border-color] duration-300",
        scrolled || open
          ? "material border-b border-hairline"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link
          href={route(locale, "home")}
          className="shrink-0 text-fg"
          aria-label="AXON Mind-Muscle"
        >
          <LogoLockup className="h-8 w-auto" />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-sm px-3 py-2 text-subhead font-medium transition-colors",
                pathname === link.href
                  ? "text-fg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <LocaleSwitch locale={locale} className="hidden sm:flex" />

          {authed ? (
            <ButtonLink href={route(locale, "today")} size="sm">
              {openAppLabel}
            </ButtonLink>
          ) : (
            <>
              <ButtonLink
                href={route(locale, "signIn")}
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                {labels.signIn}
              </ButtonLink>
              <ButtonLink href={route(locale, "signUp")} size="sm">
                {labels.signUp}
              </ButtonLink>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? labels.close : labels.menu}
            aria-expanded={open}
            className="grid size-9 place-items-center rounded-sm text-fg md:hidden"
          >
            {open ? (
              <Close className="size-5" />
            ) : (
              <span aria-hidden="true" className="flex w-5 flex-col gap-1.5">
                <span className="h-px w-full bg-current" />
                <span className="h-px w-full bg-current" />
              </span>
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div className="material-thick border-t border-hairline px-5 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col" aria-label="Principal">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border-b border-hairline py-3.5 text-title3 font-semibold text-fg"
              >
                {link.label}
              </Link>
            ))}
            {!authed ? (
              <Link
                href={route(locale, "signIn")}
                className="border-b border-hairline py-3.5 text-title3 font-semibold text-fg"
              >
                {labels.signIn}
              </Link>
            ) : null}
          </nav>
          <div className="pt-5">
            <LocaleSwitch locale={locale} />
          </div>
        </div>
      ) : null}
    </header>
  );
}
