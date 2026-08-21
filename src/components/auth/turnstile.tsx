"use client";

import { useEffect, useRef, useState } from "react";

import { useTheme } from "@/components/theme";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      language?: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let promessaScript: Promise<void> | null = null;

function carregarScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (promessaScript) return promessaScript;

  promessaScript = new Promise<void>((resolve, reject) => {
    const existente = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    const script = existente ?? document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("turnstile")));
    if (!existente) document.head.appendChild(script);
  });

  return promessaScript;
}

/** Verdadeiro quando existe chave configurada — permite correr sem ela em dev. */
export const turnstileEnabled = Boolean(SITE_KEY);

/**
 * Widget da Cloudflare. O token vai num campo escondido chamado
 * `cf-turnstile-response`, o nome que o Supabase Auth espera. Os tokens são
 * de uso único: sempre que `resetSignal` muda, o widget é reposto para que
 * uma segunda tentativa não envie um token já gasto.
 */
export function Turnstile({
  resetSignal = 0,
  onToken,
  locale,
}: {
  resetSignal?: number;
  onToken?: (token: string) => void;
  locale?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const { resolved } = useTheme();

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelado = false;

    void carregarScript()
      .then(() => {
        if (cancelado || !container.current || !window.turnstile) return;
        if (widgetId.current) {
          window.turnstile.remove(widgetId.current);
          widgetId.current = null;
        }
        container.current.innerHTML = "";
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          theme: resolved === "dark" ? "dark" : "light",
          language: locale === "pt-br" ? "pt-br" : "pt",
          callback: (valor) => {
            setToken(valor);
            onToken?.(valor);
          },
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => {
        /* Sem widget: o servidor decide se aceita o pedido sem token. */
      });

    return () => {
      cancelado = true;
    };
    // onToken é intencionalmente omitido: só o tema e o idioma exigem
    // reconstruir o widget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, locale]);

  useEffect(() => {
    if (!resetSignal || !widgetId.current || !window.turnstile) return;
    window.turnstile.reset(widgetId.current);
    setToken("");
  }, [resetSignal]);

  if (!SITE_KEY) return null;

  return (
    <div className="flex flex-col gap-2">
      <div ref={container} className="min-h-[65px]" />
      <input type="hidden" name="cf-turnstile-response" value={token} readOnly />
    </div>
  );
}
