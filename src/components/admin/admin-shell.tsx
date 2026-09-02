"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { LogoAxon } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Alert, Chart, Bolt, SignOut, Users } from "@/components/ui/icons";
import { signOutAction } from "@/lib/auth/actions";
import { limparCachePrivada } from "@/lib/workout/cache-privada";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

const LINKS = [
  { key: "", label: "Visão geral", Icon: Chart },
  { key: "exercicios", label: "Exercícios", Icon: Bolt },
  { key: "utilizadores", label: "Utilizadores", Icon: Users },
  { key: "comunidade", label: "Comunidade", Icon: Alert },
] as const;

export function AdminShell({
  locale,
  nome,
  children,
}: {
  locale: Locale;
  nome?: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const base = `/${locale}/painel`;

  return (
    <div className="min-h-dvh bg-bg-sunken/50">
      <header className="material sticky top-0 z-30 border-b border-hairline safe-t">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-5">
          <Link href={base} className="flex shrink-0 items-center gap-2.5 text-fg">
            <LogoAxon className="h-5 w-auto" title="AXON" />
            <span className="label-brand text-fg-subtle">Painel</span>
          </Link>

          <nav className="scrollbar-none -mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
            {LINKS.map(({ key, label, Icon }) => {
              const href = key ? `${base}/${key}` : base;
              const ativo = key
                ? pathname.startsWith(href)
                : pathname === base || pathname === `${base}/`;
              return (
                <Link
                  key={key || "overview"}
                  href={href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-subhead transition-colors",
                    ativo
                      ? "bg-accent-soft text-accent"
                      : "text-fg-muted hover:bg-surface-hover",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <ThemeToggle labels={{ light: "Claro", dark: "Escuro" }} />

          {/* O painel tem sessão própria neste subdomínio, por isso precisa
              do seu próprio botão de saída. */}
          <form action={signOutAction} onSubmit={limparCachePrivada} className="shrink-0">
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              title={nome ? `Terminar sessão de ${nome}` : "Terminar sessão"}
              aria-label="Terminar sessão"
              className="grid size-9 place-items-center rounded-full border border-hairline bg-surface text-fg-muted transition-colors hover:text-fg"
            >
              <SignOut className="size-4.5" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 safe-b">{children}</main>
    </div>
  );
}
