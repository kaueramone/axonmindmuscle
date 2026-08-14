export const locales = ["pt-pt", "pt-br"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt-pt";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

type MarketConfig = {
  /** Código do mercado usado na base de dados. */
  market: "PT" | "BR";
  /** Etiqueta apresentada ao utilizador. */
  label: string;
  currency: "EUR" | "BRL";
  /** Locale ICU usado em Intl.NumberFormat / DateTimeFormat. */
  intl: string;
  /** hreflang correspondente. */
  hreflang: string;
  /** Método de pagamento local (fase posterior do MVP). */
  paymentMethod: string;
};

export const marketByLocale: Record<Locale, MarketConfig> = {
  "pt-pt": {
    market: "PT",
    label: "Portugal",
    currency: "EUR",
    intl: "pt-PT",
    hreflang: "pt-PT",
    paymentMethod: "MB WAY",
  },
  "pt-br": {
    market: "BR",
    label: "Brasil",
    currency: "BRL",
    intl: "pt-BR",
    hreflang: "pt-BR",
    paymentMethod: "Pix",
  },
};

/**
 * Escolhe o locale a partir do cabeçalho Accept-Language e, quando disponível,
 * do país detetado pela rede de distribuição (Vercel envia `x-vercel-ip-country`).
 */
export function negotiateLocale(
  acceptLanguage: string | null,
  country?: string | null,
): Locale {
  if (country) {
    const c = country.toUpperCase();
    if (c === "BR") return "pt-br";
    if (c === "PT") return "pt-pt";
  }

  const header = (acceptLanguage ?? "").toLowerCase();
  if (header.includes("pt-br")) return "pt-br";
  if (header.includes("pt-pt") || header.includes("pt")) return "pt-pt";

  return defaultLocale;
}

export function formatCurrency(value: number, locale: Locale): string {
  const { intl, currency } = marketByLocale[locale];
  return new Intl.NumberFormat(intl, {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatDate(
  value: Date | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" },
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(marketByLocale[locale].intl, options).format(date);
}

/**
 * Valida o segmento de idioma vindo do URL. As rotas são geradas
 * estaticamente para os locales conhecidos, por isso um valor inválido
 * só acontece se alguém escrever o endereço à mão.
 */
export function assertLocale(value: string): Locale {
  if (isLocale(value)) return value;
  throw new Error(`Locale desconhecido: ${value}`);
}
