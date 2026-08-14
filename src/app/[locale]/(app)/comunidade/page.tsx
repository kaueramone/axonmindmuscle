import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";

import { AppHeader } from "@/components/app/app-header";
import { Badge, Card } from "@/components/ui/surface";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

export const metadata: Metadata = { title: "Comunidade", robots: { index: false } };

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  const copy = dict.app.community;

  return (
    <>
      <AppHeader
        title={copy.title}
        locale={locale}
        accountLabel={dict.nav.account}
        themeLabels={{
          light: dict.app.account.appearanceLight,
          dark: dict.app.account.appearanceDark,
        }}
        eyebrow={dict.common.tagline}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 pt-6">
        <Card className="flex items-start justify-between gap-4">
          <p className="text-callout text-fg-muted">{copy.empty}</p>
          <Badge tone="accent">{dict.common.inDevelopment}</Badge>
        </Card>
      </div>
    </>
  );
}
