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
  terms: "termos",
  privacy: "privacidade",
} as const;

export type RouteKey = keyof typeof segments;

/** Constrói um caminho absoluto com o prefixo de idioma. */
export function route(locale: Locale, key: RouteKey): string {
  const segment = segments[key];
  return segment ? `/${locale}/${segment}` : `/${locale}`;
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
];

/** Rotas de autenticação — inacessíveis a quem já tem sessão. */
export const authSegments: string[] = [
  segments.signIn,
  segments.signUp,
  segments.recover,
];
