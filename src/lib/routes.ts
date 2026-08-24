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
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

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
