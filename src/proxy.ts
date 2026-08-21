import { NextResponse, type NextRequest } from "next/server";

import { isLocale, negotiateLocale } from "@/lib/i18n/config";
import { authSegments, protectedSegments, segments } from "@/lib/routes";
import { updateSession } from "@/lib/supabase/middleware";

const LOCALE_COOKIE = "axon-locale";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ---- 1. Garantir prefixo de idioma no caminho ----
  const firstSegment = pathname.split("/")[1];

  if (!isLocale(firstSegment)) {
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale)
      ? cookieLocale
      : negotiateLocale(
          request.headers.get("accept-language"),
          request.headers.get("x-vercel-ip-country"),
        );

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    const redirect = NextResponse.redirect(url);
    redirect.cookies.set(LOCALE_COOKIE, locale, {
      maxAge: ONE_YEAR,
      path: "/",
      sameSite: "lax",
    });
    return redirect;
  }

  const locale = firstSegment;
  const routeSegment = pathname.split("/")[2] ?? "";

  // O painel administrativo vive num subdomínio próprio, servido pela mesma
  // aplicação. Nesse subdomínio só existem duas coisas: as rotas de
  // autenticação — o painel tem sessão própria, porque os cookies do Supabase
  // são gravados por host e não atravessam para cá — e o painel em si. Tudo o
  // resto (a raiz, um /hoje devolvido pelo OAuth, um link antigo) vai parar ao
  // painel em vez de dar 404.
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const noSubdominioPainel = host.startsWith("painel.");
  const forcarPainel =
    noSubdominioPainel &&
    routeSegment !== segments.admin &&
    !authSegments.includes(routeSegment);

  // ---- 2. Renovar a sessão do Supabase ----
  const { response, user } = await updateSession(request);
  response.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: ONE_YEAR,
    path: "/",
    sameSite: "lax",
  });

  // ---- 3. Guardas de acesso ----
  const isProtected = protectedSegments.includes(routeSegment);
  const isAuthRoute = authSegments.includes(routeSegment);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/${segments.signIn}`;
    url.search = "";
    url.searchParams.set("redirect", pathname + search);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/${segments.today}`;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (forcarPainel) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/${segments.admin}`;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Todos os caminhos exceto:
     * - _next (bundles e imagens otimizadas)
     * - auth (callback e confirmação do Supabase, sem prefixo de idioma)
     * - api
     * - ficheiros estáticos com extensão
     */
    "/((?!_next/static|_next/image|auth/|api/|.*\\.[\\w]+$).*)",
  ],
};
