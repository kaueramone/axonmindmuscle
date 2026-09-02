"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { LogoAxon } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Gear } from "@/components/ui/icons";
import type { Locale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho com título grande que encolhe ao deslocar, como nas aplicações
 * nativas da Apple: o título migra para a barra compacta e o wordmark sai.
 */
export function AppHeader({
  title,
  locale,
  accountLabel,
  themeLabels,
  eyebrow,
  action,
}: {
  title: string;
  locale: Locale;
  accountLabel: string;
  themeLabels: { light: string; dark: string };
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
          <Link
            href={route(locale, "today")}
            aria-label="AXON"
            className={cn(
              "shrink-0 text-fg transition-opacity duration-300",
              collapsed ? "pointer-events-none opacity-0" : "opacity-100",
            )}
          >
            <LogoAxon className="h-4 w-auto" />
          </Link>

          <span
            className={cn(
              "absolute left-1/2 max-w-[50%] -translate-x-1/2 truncate text-headline font-semibold text-fg transition-opacity duration-300",
              collapsed ? "opacity-100" : "opacity-0",
            )}
          >
            {title}
          </span>

          <span className="flex-1" />

          {action}
          <ThemeToggle labels={themeLabels} />
          <Link
            href={route(locale, "account")}
            aria-label={accountLabel}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-hairline bg-surface text-fg-muted transition-colors hover:text-fg"
          >
            <Gear className="size-4.5" />
          </Link>
        </div>
      </div>

      {/* A barra fixa cresce com a área segura do telemóvel (o entalhe da
          câmara, a barra de estado da app instalada). O espaço por baixo
          dela tem de crescer o mesmo, senão o wordmark fica em cima do
          texto — foi exatamente isso que aconteceu na app instalada. */}
      <div className="mx-auto max-w-2xl px-5 pt-[calc(5rem+env(safe-area-inset-top))]">
        {eyebrow ? <p className="label-brand text-fg-subtle">{eyebrow}</p> : null}
        <h1 className="mt-2 text-large tracking-[-0.03em] text-fg">{title}</h1>
      </div>
      <div ref={sentinel} aria-hidden="true" className="h-px" />
    </>
  );
}
