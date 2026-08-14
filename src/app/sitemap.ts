import type { MetadataRoute } from "next";

import { locales } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { SITE_URL } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = (["home", "science", "signUp", "signIn"] as const).flatMap((key) =>
    locales.map((locale) => ({
      url: `${SITE_URL}${route(locale, key)}`,
      changeFrequency: "weekly" as const,
      priority: key === "home" ? 1 : 0.7,
    })),
  );
  return pages;
}
