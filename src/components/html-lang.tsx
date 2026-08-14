"use client";

import { useEffect } from "react";

import { marketByLocale, type Locale } from "@/lib/i18n/config";

/**
 * Afina o atributo `lang` do documento para a variante correta de português.
 * O <html> renderizado é estático (`pt`), o que permite manter as páginas
 * públicas em cache; aqui apenas se acrescenta a região.
 */
export function HtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = marketByLocale[locale].hreflang;
  }, [locale]);

  return null;
}
