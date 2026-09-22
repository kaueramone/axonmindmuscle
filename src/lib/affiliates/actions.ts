"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { referralToken } from "./shared";

type Result = { ok: true; id?: string } | { ok: false; error: string };
function failed(message: string): Result {
  if (message.includes("account_not_found"))
    return { ok: false, error: "accountNotFound" };
  if (message.includes("insufficient_pending"))
    return { ok: false, error: "insufficient" };
  return { ok: false, error: "failed" };
}
// Mutations run through RPCs that verify the admin's session inside PostgreSQL.
export async function enableUserAffiliate(userId: string): Promise<Result> {
  if (!referralToken(userId)) return failed("");
  const db = await createClient();
  const { data: isAdmin, error: permissionError } = await db.rpc("is_admin");
  if (permissionError || !isAdmin) return failed("");
  // Resolve only the selected account after verifying the admin's session.
  // The email never travels to the browser; the existing RPC checks admin again.
  const { data: account, error: accountError } = await createAdminClient().auth.admin.getUserById(userId);
  if (accountError || !account.user?.email) return failed("account_not_found");
  const { data, error } = await db.rpc("admin_enable_affiliate", {
    p_email: account.user.email,
  });
  if (error) return failed(error.message);
  revalidatePath("/", "layout");
  return { ok: true, id: data };
}
export async function setAffiliate(
  id: string,
  enabled: boolean,
): Promise<Result> {
  if (!referralToken(id) || typeof enabled !== "boolean") return failed("");
  const db = await createClient();
  const { error } = await db.rpc("admin_set_affiliate", {
    p_affiliate: id,
    p_enabled: enabled,
  });
  if (error) return failed(error.message);
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function payAffiliate(
  id: string,
  quantity: number,
  request: string,
): Promise<Result> {
  if (
    !referralToken(id) ||
    !referralToken(request) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 2147483647
  )
    return failed("");
  const db = await createClient();
  const { data, error } = await db.rpc("admin_pay_affiliate", {
    p_affiliate: id,
    p_quantity: quantity,
    p_request: request,
  });
  if (error) return failed(error.message);
  revalidatePath("/", "layout");
  return { ok: true, id: data };
}
