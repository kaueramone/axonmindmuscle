import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import {
  REFERRAL_COOKIE,
  REFERRAL_TTL,
  referralToken,
} from "@/lib/affiliates/shared";
import { route } from "@/lib/routes";
import { SITE_URL } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const rawLocale = request.nextUrl.searchParams.get("locale");
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  // Stay on the canonical host that received the request (e.g. www), so the
  // host-only attribution cookie survives the redirect to signup.
  if (request.nextUrl.hostname.startsWith("painel.")) {
    return NextResponse.redirect(
      new URL(`/r/${encodeURIComponent(code)}?locale=${locale}`, SITE_URL),
    );
  }
  const destination = new URL(route(locale, "signUp"), request.nextUrl.origin);
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  if (!/^[0-9a-f]{32}$/.test(code)) return response;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user)
    return NextResponse.redirect(new URL(route(locale, "today"), SITE_URL));
  const { data, error } = await createAdminClient().rpc("affiliate_visit", {
    p_code: code,
    p_existing: referralToken(request.cookies.get(REFERRAL_COOKIE)?.value),
  });
  if (error)
    return new NextResponse(
      "Não foi possível abrir este convite. Tente novamente.",
      { status: 503 },
    );
  if (data)
    response.cookies.set(REFERRAL_COOKIE, data, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFERRAL_TTL,
    });
  return response;
}
