"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { defaultLocale, isLocale, marketByLocale, type Locale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type {
  ExperienceLevel,
  ThemePreference,
  TrainingGoal,
} from "@/lib/supabase/types";
import { isValidEmail, SITE_URL } from "@/lib/utils";

/** Chaves de erro traduzidas em `dict.errors`. */
export type AuthErrorKey =
  | "generic"
  | "network"
  | "invalidCredentials"
  | "emailInUse"
  | "emailNotConfirmed"
  | "invalidEmail"
  | "passwordTooShort"
  | "passwordMismatch"
  | "nameRequired"
  | "rateLimited"
  | "sessionExpired";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: AuthErrorKey };

function readLocale(formData: FormData): Locale {
  const value = formData.get("locale");
  return isLocale(typeof value === "string" ? value : null)
    ? (value as Locale)
    : defaultLocale;
}

/** Traduz o erro devolvido pelo Supabase numa chave do dicionário. */
function mapAuthError(message: string, status?: number): AuthErrorKey {
  const text = message.toLowerCase();

  if (status === 429 || text.includes("rate limit") || text.includes("too many")) {
    return "rateLimited";
  }
  if (text.includes("invalid login credentials") || text.includes("invalid credentials")) {
    return "invalidCredentials";
  }
  if (text.includes("email not confirmed")) return "emailNotConfirmed";
  if (
    text.includes("already registered") ||
    text.includes("already been registered") ||
    text.includes("user already exists")
  ) {
    return "emailInUse";
  }
  if (text.includes("password") && text.includes("6 characters")) {
    return "passwordTooShort";
  }
  if (text.includes("invalid email") || text.includes("unable to validate email")) {
    return "invalidEmail";
  }
  if (text.includes("fetch") || text.includes("network")) return "network";

  return "generic";
}

/* ============================================================
   Registo e sessão
   ============================================================ */

export async function signUpAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const locale = readLocale(formData);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { ok: false, error: "nameRequired" };
  if (!isValidEmail(email)) return { ok: false, error: "invalidEmail" };
  if (password.length < 8) return { ok: false, error: "passwordTooShort" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/confirm?next=${encodeURIComponent(
        route(locale, "onboarding"),
      )}`,
      data: {
        display_name: name.slice(0, 60),
        locale,
        market: marketByLocale[locale].market,
      },
    },
  });

  if (error) return { ok: false, error: mapAuthError(error.message, error.status) };

  return { ok: true, message: email };
}

export async function signInAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const locale = readLocale(formData);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "");

  if (!isValidEmail(email)) return { ok: false, error: "invalidEmail" };
  if (!password) return { ok: false, error: "invalidCredentials" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ok: false, error: mapAuthError(error.message, error.status) };

  const destination =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : route(locale, "today");

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = readLocale(formData);
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(route(locale, "home"));
}

export async function requestPasswordResetAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const locale = readLocale(formData);
  const email = String(formData.get("email") ?? "").trim();

  if (!isValidEmail(email)) return { ok: false, error: "invalidEmail" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/confirm?next=${encodeURIComponent(
      route(locale, "reset"),
    )}`,
  });

  // Não revelamos se o email existe: a resposta é sempre a mesma.
  if (error && error.status === 429) return { ok: false, error: "rateLimited" };

  return { ok: true, message: email };
}

export async function updatePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const locale = readLocale(formData);
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirm") ?? "");

  if (password.length < 8) return { ok: false, error: "passwordTooShort" };
  if (password !== confirmation) return { ok: false, error: "passwordMismatch" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sessionExpired" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: mapAuthError(error.message, error.status) };

  revalidatePath("/", "layout");
  redirect(route(locale, "today"));
}

/* ============================================================
   Perfil
   ============================================================ */

const GOALS: TrainingGoal[] = ["hypertrophy", "strength", "endurance", "health"];
const LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
const THEMES: ThemePreference[] = ["system", "light", "dark"];

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sessionExpired" };

  const name = String(formData.get("display_name") ?? "").trim();
  if (name.length < 2) return { ok: false, error: "nameRequired" };

  const goal = String(formData.get("goal") ?? "");
  const experience = String(formData.get("experience") ?? "");
  const birthDate = String(formData.get("birth_date") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: name.slice(0, 60),
      goal: GOALS.includes(goal as TrainingGoal) ? (goal as TrainingGoal) : null,
      experience: LEVELS.includes(experience as ExperienceLevel)
        ? (experience as ExperienceLevel)
        : null,
      weekly_frequency: optionalNumber(formData.get("weekly_frequency")),
      height_cm: optionalNumber(formData.get("height_cm")),
      weight_kg: optionalNumber(formData.get("weight_kg")),
      birth_date: birthDate || null,
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: "generic" };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function completeOnboardingAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const locale = readLocale(formData);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sessionExpired" };

  const name = String(formData.get("display_name") ?? "").trim();
  if (name.length < 2) return { ok: false, error: "nameRequired" };

  const goal = String(formData.get("goal") ?? "");
  const experience = String(formData.get("experience") ?? "");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: name.slice(0, 60),
      goal: GOALS.includes(goal as TrainingGoal) ? (goal as TrainingGoal) : null,
      experience: LEVELS.includes(experience as ExperienceLevel)
        ? (experience as ExperienceLevel)
        : null,
      weekly_frequency: optionalNumber(formData.get("weekly_frequency")),
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: "generic" };

  revalidatePath("/", "layout");
  redirect(route(locale, "today"));
}

export async function updatePreferencesAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const theme = String(formData.get("theme") ?? "");
  const locale = String(formData.get("preferred_locale") ?? "");

  const patch: { theme?: ThemePreference; locale?: Locale; market?: "PT" | "BR" } = {};
  if (THEMES.includes(theme as ThemePreference)) patch.theme = theme as ThemePreference;
  if (isLocale(locale)) {
    patch.locale = locale;
    patch.market = marketByLocale[locale].market;
  }

  if (Object.keys(patch).length === 0) return;

  await supabase.from("profiles").update(patch).eq("id", user.id);

  // O tema é aplicado no cliente; revalidar a layout aqui só provocaria
  // uma re-renderização capaz de repor o atributo no <html>.
  if (patch.locale) revalidatePath("/", "layout");
}
