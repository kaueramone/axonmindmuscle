"use client";

import { useEffect, useState } from "react";

import { useTheme } from "@/components/theme";
import { Button } from "@/components/ui/button";
import {
  Chart,
  Device,
  Download,
  Globe,
  Lock,
  Moon,
  SignOut,
  Sun,
} from "@/components/ui/icons";
import { Segmented } from "@/components/ui/segmented";
import { Badge, ListGroup, ListRow } from "@/components/ui/surface";
import { signOutAction, updatePreferencesAction } from "@/lib/auth/actions";
import { limparCachePrivada } from "@/lib/workout/cache-privada";
import { locales, marketByLocale, type Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/types";
import { route } from "@/lib/routes";
import type { ThemePreference, UserPlan } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type InstallPrompt = Event & { prompt: () => Promise<void> };

export function AccountSettings({
  locale,
  dict,
  email,
  plan,
  isAdmin = false,
}: {
  locale: Locale;
  dict: Dict;
  email: string;
  plan: UserPlan;
  isAdmin?: boolean;
}) {
  const copy = dict.app.account;
  const { preference, setPreference } = useTheme();
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIsIos(
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !("onbeforeinstallprompt" in window),
    );

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function changeTheme(value: ThemePreference) {
    setPreference(value);
    const data = new FormData();
    data.set("theme", value);
    void updatePreferencesAction(data);
  }

  async function changeLocale(next: Locale) {
    document.cookie = `axon-locale=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    const data = new FormData();
    data.set("preferred_locale", next);

    // Esperar pela gravação antes de navegar. Disparar e sair de imediato
    // cancelava o pedido a meio: o cookie ficava — é do lado do cliente — por
    // isso a aplicação passava a pt-BR, mas o mercado gravado no perfil
    // continuava PT e o pagamento saía em euros. A pessoa escolhia Brasil e
    // era cobrada em euros, sem nada na interface que explicasse porquê.
    try {
      await updatePreferencesAction(data);
    } finally {
      window.location.href = route(next, "account");
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <ListGroup title={copy.preferences}>
        <div className="flex flex-col gap-3 px-4 py-4">
          <p className="text-callout font-medium text-fg">{copy.appearance}</p>
          <Segmented
            ariaLabel={copy.appearance}
            value={preference}
            onChange={changeTheme}
            options={[
              {
                value: "system",
                label: copy.appearanceSystem,
                icon: <Device className="size-4" />,
              },
              {
                value: "light",
                label: copy.appearanceLight,
                icon: <Sun className="size-4" />,
              },
              {
                value: "dark",
                label: copy.appearanceDark,
                icon: <Moon className="size-4" />,
              },
            ]}
          />
        </div>

        <div className="flex flex-col gap-3 px-4 py-4">
          <p className="text-callout font-medium text-fg">{copy.language}</p>
          <div className="flex gap-2">
            {locales.map((option) => {
              const market = marketByLocale[option];
              const active = option === locale;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => void changeLocale(option)}
                  className={cn(
                    "flex flex-1 items-center gap-2.5 rounded-md border px-4 py-3 text-left transition-colors",
                    active
                      ? "border-accent bg-accent-soft"
                      : "border-hairline bg-surface hover:bg-surface-hover",
                  )}
                >
                  <Globe
                    className={cn("size-4", active ? "text-accent" : "text-fg-subtle")}
                  />
                  <span className="flex flex-col">
                    <span className="text-subhead font-medium text-fg">
                      {market.label}
                    </span>
                    <span className="text-caption text-fg-subtle">
                      {market.currency} · {market.paymentMethod}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </ListGroup>

      {isAdmin ? (
        <ListGroup>
          <ListRow
            icon={<Chart className="size-4.5" />}
            label="Painel administrativo"
            detail="Análise da plataforma e catálogo de exercícios"
            href={route(locale, "admin")}
          />
        </ListGroup>
      ) : null}

      <ListGroup title={copy.title}>
        <ListRow icon={<Lock className="size-4.5" />} label={copy.email} value={email} />
        <ListRow
          icon={<Download className="size-4.5" />}
          label={copy.plan}
          detail={plan === "pro" ? copy.planPro : copy.planFree}
          href={route(locale, "plans")}
          trailing={plan === "pro" ? <Badge tone="accent">PRO</Badge> : null}
        />
        <ListRow
          icon={<Lock className="size-4.5" />}
          label={copy.changePassword}
          href={route(locale, "recover")}
        />
      </ListGroup>

      {!installed ? (
        <ListGroup title={copy.installTitle} footer={isIos ? copy.installIosHint : undefined}>
          <div className="flex flex-col gap-3 px-4 py-4">
            <p className="text-subhead text-fg-muted">{copy.installBody}</p>
            {installPrompt ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void installPrompt.prompt();
                  setInstallPrompt(null);
                }}
              >
                <Download className="size-4" />
                {copy.installCta}
              </Button>
            ) : null}
          </div>
        </ListGroup>
      ) : null}

      <ListGroup>
        <form action={signOutAction} onSubmit={limparCachePrivada}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-hover"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-danger/12 text-danger">
              <SignOut className="size-4.5" />
            </span>
            <span className="text-callout font-medium text-danger">{copy.signOut}</span>
          </button>
        </form>
      </ListGroup>
    </div>
  );
}
