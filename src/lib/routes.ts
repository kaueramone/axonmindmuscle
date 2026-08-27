import type { Locale } from "./i18n/config";

/** Segmentos usados no URL. Iguais nos dois locales para simplificar SEO e partilha. */
export const segments = {
  home: "",
  science: "ciencia",
  signIn: "entrar",
  signUp: "criar-conta",
  recover: "recuperar-acesso",
  reset: "nova-palavra-passe",
  onboarding: "calibrar",
  today: "hoje",
  workout: "treino",
  readiness: "prontidao",
  progress: "progresso",
  community: "comunidade",
  profile: "perfil",
  account: "conta",
  admin: "painel",
  plans: "planos",
  terms: "termos",
  privacy: "privacidade",
} as const;

export type RouteKey = keyof typeof segments;

/** Constrói um caminho absoluto com o prefixo de idioma. */
export function route(locale: Locale, key: RouteKey): string {
  const segment = segments[key];
  return segment ? `/${locale}/${segment}` : `/${locale}`;
}

/**
 * Valida um destino que veio de fora — query string, formulário, email.
 *
 * Só caminhos internos passam. Um `next` aceite em cru é um redirecionamento
 * aberto à espera de acontecer: bastava alguém mandar um link de registo com
 * `next=//sitio-falso` para a pessoa acabar lá logo a seguir a confirmar o
 * email, ainda a confiar no que estava a ver.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;

  // Espacos e caracteres de controlo sao removidos pelo analisador de URL do
  // browser antes de ele decidir para onde vai. Um `/\t/evil.com` passa por
  // uma verificacao de prefixo ingenua e chega ao browser como `//evil.com`.
  const limpo = value.replace(/[\u0000-\u001F\u007F\s]/g, "");

  if (!limpo.startsWith("/")) return null;

  // As duas formas de escrever a mesma coisa. O analisador de URL da norma
  // WHATWG trata `\` como `/` nos esquemas http e https, por isso
  // `/\evil.com` resolve para `https://evil.com` tal como `//evil.com`.
  // Recusamos a barra invertida em qualquer posicao: nenhum caminho legitimo
  // deste produto a usa.
  if (limpo.startsWith("//") || limpo.includes("\\")) return null;

  // Cinto e suspensorios: resolvemos contra uma origem descartavel e so
  // aceitamos o que nao saiu de la. O que devolvemos e a forma ja normalizada,
  // e nao o texto que veio de fora.
  try {
    const resolvido = new URL(limpo, ORIGEM_DE_TESTE);
    if (resolvido.origin !== ORIGEM_DE_TESTE) return null;
    return `${resolvido.pathname}${resolvido.search}${resolvido.hash}`;
  } catch {
    return null;
  }
}

/**
 * Origem inexistente usada apenas para resolver caminhos relativos. O dominio
 * `.invalid` esta reservado pela norma para nunca resolver, portanto um erro
 * de logica aqui falha fechado em vez de apontar para um sitio real.
 */
const ORIGEM_DE_TESTE = "https://axon.invalid";

/** Rotas que exigem sessão iniciada. */
export const protectedSegments: string[] = [
  segments.onboarding,
  segments.today,
  segments.workout,
  segments.readiness,
  segments.progress,
  segments.community,
  segments.profile,
  segments.account,
  segments.admin,
  segments.plans,
];

/** Rotas de autenticação — inacessíveis a quem já tem sessão. */
export const authSegments: string[] = [
  segments.signIn,
  segments.signUp,
  segments.recover,
];
