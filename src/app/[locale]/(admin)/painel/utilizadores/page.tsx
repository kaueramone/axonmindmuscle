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

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, role, market, locale, plan, created_at, onboarding_completed_at, pro_granted_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os utilizadores.");
  const affiliates = new Map<string, { id: string; enabled: boolean }>();
  // Read all affiliate pages so an account past the API row limit remains marked.
  for (let offset = 0; ; offset += 500) {
    const { data: batch, error: affiliateError } = await supabase.from("affiliates")
      .select("id, user_id, enabled").order("id").range(offset, offset + 499);
    if (affiliateError) throw new Error("Não foi possível carregar os afiliados.");
    for (const affiliate of batch ?? []) {
      if (affiliate.user_id) affiliates.set(affiliate.user_id, affiliate);
    }
    if (!batch || batch.length < 500) break;
  }

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
    affiliate: affiliates.get(p.id) ?? null,
  }));

  return <UsersTable linhas={linhas} selfId={user.id} />;
}
