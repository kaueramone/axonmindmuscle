import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { route, safeNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Confirmação de email e recuperação de palavra-passe.
 * O Supabase envia `token_hash` + `type`; trocamos por uma sessão válida.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  const cookieLocale = request.cookies.get("axon-locale")?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  const destination = safeNext(next) ?? route(locale, "today");

  if (!tokenHash || !type) {
    const url = new URL(route(locale, "signIn"), origin);
    url.searchParams.set("error", "sessionExpired");
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    const url = new URL(route(locale, "signIn"), origin);
    url.searchParams.set("error", "sessionExpired");
    return NextResponse.redirect(url);
  }

  // Quem acabou de confirmar o email ainda não calibrou, e a área da app
  // manda-o para a calibração de qualquer maneira. Se o destino seguisse em
  // cru, perdia-se ali: vai à boleia para ser honrado no fim.
  if (type !== "recovery") {
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
  }

  return NextResponse.redirect(new URL(destination, origin));
}
