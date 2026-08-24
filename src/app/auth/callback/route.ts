import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { route, safeNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Ponto de retorno do OAuth (Google). O Supabase envia um `code` que é
 * trocado por uma sessão e gravado nos cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const cookieLocale = request.cookies.get("axon-locale")?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  const fallback = route(locale, "today");
  const destination = safeNext(next) ?? fallback;

  if (!code) {
    const url = new URL(route(locale, "signIn"), origin);
    url.searchParams.set("error", "generic");
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL(route(locale, "signIn"), origin);
    url.searchParams.set("error", "generic");
    return NextResponse.redirect(url);
  }

  // Utilizadores vindos do OAuth ainda não passaram pela calibração.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && !profile.onboarding_completed_at) {
      const url = new URL(route(locale, "onboarding"), origin);
      if (destination !== route(locale, "onboarding")) {
        url.searchParams.set("next", destination);
      }
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.redirect(new URL(destination, origin));
}
