"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Bolt, Chart, User, Users } from "@/components/ui/icons";
import type { Locale } from "@/lib/i18n/config";
import { route, type RouteKey } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Tab = { key: RouteKey; label: string; Icon: typeof Bolt };

/**
 * Barra de separadores ao estilo iOS: fixa no fundo, material translúcido,
 * ícone e etiqueta, com respeito pela safe area do iPhone.
 */
export function TabBar({
  locale,
  labels,
  badge = false,
}: {
  locale: Locale;
  labels: { today: string; progress: string; community: string; profile: string };
  /** Notificações por ler: um ponto no separador da comunidade. */
  badge?: boolean;
}) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { key: "today", label: labels.today, Icon: Bolt },
    { key: "progress", label: labels.progress, Icon: Chart },
    { key: "community", label: labels.community, Icon: Users },
    { key: "profile", label: labels.profile, Icon: User },
  ];

  return (
    <nav
      aria-label={labels.today}
      className="fixed inset-x-0 bottom-0 z-40 material border-t border-hairline safe-b"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {tabs.map(({ key, label, Icon }) => {
          const href = route(locale, key);
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 transition-colors duration-200",
                  active ? "text-accent" : "text-fg-subtle hover:text-fg-muted",
                )}
              >
                <span className="relative">
                  <Icon
                    className={cn(
                      "size-6 transition-transform duration-300 [transition-timing-function:var(--ease-spring)]",
                      active && "scale-110",
                    )}
                  />
                  {badge && key === "community" ? (
                    <span
                      className="absolute -right-1 -top-0.5 size-2 rounded-full bg-accent ring-2 ring-[var(--bg)]"
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span className="text-caption2 font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
