"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Globe } from "@/components/ui/icons";
import { locales, marketByLocale, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Troca de mercado/idioma preservando o caminho atual.
 * Os segmentos de rota são iguais nos dois locales, por isso basta
 * substituir o prefixo.
 */
export function LocaleSwitch({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    const rest = pathname.split("/").slice(2).join("/");
    const target = rest ? `/${next}/${rest}` : `/${next}`;
    document.cookie = `axon-locale=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(() => {
      router.push(target);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full border border-hairline bg-surface p-0.5",
        pending && "opacity-60",
        className,
      )}
    >
      <Globe className="ml-2 size-3.5 shrink-0 text-fg-subtle" />
      {locales.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => switchTo(option)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-full px-2.5 py-1 text-caption font-semibold uppercase tracking-wider transition-colors",
              active
                ? "bg-surface-strong text-fg"
                : "text-fg-subtle hover:text-fg-muted",
            )}
          >
            {marketByLocale[option].market}
          </button>
        );
      })}
    </div>
  );
}
