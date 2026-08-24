import { UsersTable, type LinhaUtilizador } from "@/components/admin/users-table";
import { requireAdmin } from "@/lib/admin/guard";
import { assertLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const { supabase, user } = await requireAdmin(locale);

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, display_name, role, market, locale, plan, created_at, onboarding_completed_at, pro_granted_at",
    )
    .order("created_at", { ascending: false });

  const linhas: LinhaUtilizador[] = (data ?? []).map((p) => ({
    id: p.id,
    name: p.display_name ?? "",
    role: p.role,
    market: p.market,
    locale: p.locale,
    plan: p.plan,
    proConcedido: p.pro_granted_at != null,
    createdAt: p.created_at,
    onboarded: p.onboarding_completed_at != null,
  }));

  return <UsersTable linhas={linhas} selfId={user.id} />;
}
