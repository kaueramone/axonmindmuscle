import { NextResponse, type NextRequest } from "next/server";

import { isLocale, negotiateLocale } from "@/lib/i18n/config";
import { authSegments, protectedSegments, segments } from "@/lib/routes";
import { construirCsp, gerarNonce } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/middleware";

const LOCALE_COOKIE = "axon-locale";
const ONE_YEAR = 60 * 60 * 24 * 365;
const PRODUCAO = process.env.NODE_ENV === "production";

/**
 * Opções do cookie de idioma. `secure` em produção porque um cookie sem ele
 * viaja em claro à primeira ligação HTTP e ensina a um intermediário que
 * cookies este sítio usa.
 */
const COOKIE_IDIOMA = {
  maxAge: ONE_YEAR,
  path: "/",
  sameSite: "lax" as const,
  secure: PRODUCAO,
};

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Um número irrepetível por pedido. Vai no cabeçalho do pedido para o Next
  // o carimbar nos seus scripts, e no da resposta para o browser o exigir.
  const nonce = gerarNonce();
  const csp = construirCsp(nonce, PRODUCAO);

  /** Toda a resposta que sai daqui leva a política — redirecionamentos incluídos. */
  const comCsp = <T extends NextResponse>(resposta: T): T => {
    resposta.headers.set("content-security-policy", csp);
    return resposta;
  };

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
    redirect.cookies.set(LOCALE_COOKIE, locale, COOKIE_IDIOMA);
    return comCsp(redirect);
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
  const { response, user } = await updateSession(request, {
    "x-nonce": nonce,
    "content-security-policy": csp,
  });
  response.cookies.set(LOCALE_COOKIE, locale, COOKIE_IDIOMA);

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
    return comCsp(redirect);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/${segments.today}`;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return comCsp(redirect);
  }

  if (forcarPainel) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/${segments.admin}`;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return comCsp(redirect);
  }

  return comCsp(response);
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
