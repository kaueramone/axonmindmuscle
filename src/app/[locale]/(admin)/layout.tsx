import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin/guard";
import { assertLocale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "Painel AXON",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);

  // Redireciona quem não for administrador antes de renderizar o que quer que seja.
  const { perfil } = await requireAdmin(locale);

  return (
    <AdminShell locale={locale} nome={perfil?.display_name}>
      {children}
    </AdminShell>
  );
}
