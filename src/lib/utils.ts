/** Junta classes ignorando valores falsos. */
export function cn(
  ...classes: Array<string | false | null | undefined | 0>
): string {
  return classes.filter((value): value is string => typeof value === "string" && value.length > 0).join(" ");
}

/** Devolve a saudação adequada à hora local do utilizador. */
export function greetingKey(date = new Date()): "morning" | "afternoon" | "evening" {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 20) return "afternoon";
  return "evening";
}

export function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value.trim());
}

/** Força bruta da palavra-passe, de 0 a 4. */
export function passwordScore(value: string): number {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) || /[^\w\s]/.test(value)) score += 1;
  return Math.min(score, 4);
}

/** Iniciais para o avatar, no máximo duas letras. */
export function initials(name: string | null | undefined): string {
  if (!name) return "A";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
