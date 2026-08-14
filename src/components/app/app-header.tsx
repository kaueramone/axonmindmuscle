"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { LogoSymbol } from "@/components/brand/logo";
import { Gear } from "@/components/ui/icons";
import type { Locale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho com título grande que encolhe ao deslocar, como nas aplicações
 * nativas da Apple: o título migra para a barra compacta.
 */
export function AppHeader({
  title,
  locale,
  accountLabel,
  eyebrow,
  action,
}: {
  title: string;
  locale: Locale;
  accountLabel: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-30 safe-t transition-[background-color,border-color] duration-300",
          collapsed ? "material border-b border-hairline" : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-5">
          <LogoSymbol
            className={cn(
              "h-3 w-auto text-fg transition-opacity duration-300",
              collapsed ? "opacity-0" : "opacity-100",
            )}
          />
          <span
            className={cn(
              "flex-1 truncate text-headline font-semibold text-fg transition-opacity duration-300",
              collapsed ? "opacity-100" : "opacity-0",
            )}
          >
            {title}
          </span>
          <span className={cn("flex-1", collapsed && "hidden")} />
          {action}
          <Link
            href={route(locale, "account")}
            aria-label={accountLabel}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-hairline bg-surface text-fg-muted transition-colors hover:text-fg"
          >
            <Gear className="size-4.5" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 pt-20">
        {eyebrow ? <p className="label-brand text-fg-subtle">{eyebrow}</p> : null}
        <h1 className="mt-2 text-large tracking-[-0.03em] text-fg">{title}</h1>
      </div>
      <div ref={sentinel} aria-hidden="true" className="h-px" />
    </>
  );
}
