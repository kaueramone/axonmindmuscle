import "server-only";

import type { Locale } from "./config";
import type { Dict } from "./types";

const loaders = {
  "pt-pt": () => import("./dictionaries/pt-pt").then((m) => m.default as Dict),
  "pt-br": () => import("./dictionaries/pt-br").then((m) => m.default as Dict),
} satisfies Record<Locale, () => Promise<Dict>>;

export async function getDictionary(locale: Locale): Promise<Dict> {
  return loaders[locale]();
}

export type { Dict } from "./types";
export * from "./config";
