import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/pt-pt/hoje", "/pt-br/hoje", "/pt-pt/conta", "/pt-br/conta", "/auth/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
