import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { REFERRAL_COOKIE, referralToken } from "./shared";

/** OAuth creates users outside signUpAction. The DB rejects accounts that
 * predate the visit and never changes an attribution already recorded. */
export async function attachOAuthReferral(userId: string) {
  const store = await cookies();
  const token = referralToken(store.get(REFERRAL_COOKIE)?.value);
  if (!token) return;
  const { error } = await createAdminClient().rpc("affiliate_attach", {
    p_user: userId,
    p_visit: token,
  });
  if (error)
    throw new Error("Não foi possível guardar a indicação. Tente novamente.");
  store.delete(REFERRAL_COOKIE);
}
