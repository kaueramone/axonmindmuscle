import { assertLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";

import { AppHeader } from "@/components/app/app-header";
import { Card } from "@/components/ui/surface";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

export const metadata: Metadata = { title: "Progresso", robots: { index: false } };

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const dict = await getDictionary(locale);
  const copy = dict.app.progress;

  const stats = [
    { label: copy.streak, value: "0", unit: copy.days },
    { label: copy.sessions, value: "0", unit: "" },
    { label: copy.volume, value: "0", unit: "kg" },
  ];

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
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-4">
              <p className="text-caption text-fg-subtle">{stat.label}</p>
              <p className="data-mono mt-2 text-title1 text-fg">
                {stat.value}
                {stat.unit ? (
                  <span className="ml-1 text-footnote text-fg-subtle">{stat.unit}</span>
                ) : null}
              </p>
            </Card>
          ))}
        </div>

        <Card>
          <p className="text-callout text-fg-muted">{copy.empty}</p>
        </Card>
      </div>
    </>
  );
}
