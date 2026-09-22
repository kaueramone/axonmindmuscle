import "server-only";
import type Stripe from "stripe";
import type { createAdminClient } from "@/lib/supabase/admin";
import { stripe, priceIds } from "@/lib/stripe/server";

export async function recordAffiliateInvoice(
  invoice: Stripe.Invoice,
  db: ReturnType<typeof createAdminClient>,
) {
  if (invoice.status !== "paid" || invoice.amount_paid <= 0) return;
  if (
    process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") &&
    !invoice.livemode
  )
    return;
  // Also accept invoices from older Stripe webhook API versions.
  const legacy = invoice as unknown as {
    subscription?: string | { id: string };
  };
  const reference =
    invoice.parent?.subscription_details?.subscription ?? legacy.subscription;
  const subscriptionId =
    typeof reference === "string" ? reference : reference?.id;
  if (!subscriptionId) return;
  const subscription = await stripe().subscriptions.retrieve(subscriptionId);
  const prices = [
    ...Object.values(priceIds("PT")),
    ...Object.values(priceIds("BR")),
  ].filter(Boolean);
  const isPro =
    subscription.metadata?.plan === "pro" ||
    subscription.items.data.some((item) => prices.includes(item.price.id));
  if (!isPro) return;
  let userId: string | undefined = subscription.metadata?.user_id;
  if (!userId) {
    const customer =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const { data, error } = await db
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customer)
      .maybeSingle();
    if (error) throw new Error(`affiliate customer lookup: ${error.message}`);
    userId = data?.id;
  }
  if (!userId) throw new Error("affiliate invoice: subscription owner missing");
  const paidAt = invoice.status_transitions.paid_at;
  if (!paidAt) throw new Error("affiliate invoice: paid_at missing");
  const { error } = await db.rpc("affiliate_convert", {
    p_user: userId,
    p_invoice: invoice.id,
    p_subscription: subscriptionId,
    p_paid_at: new Date(paidAt * 1000).toISOString(),
  });
  if (error) throw new Error(`affiliate conversion: ${error.message}`);
}
