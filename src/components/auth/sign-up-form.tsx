"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { AuthDivider } from "@/components/auth/divider";
import { GoogleButton } from "@/components/auth/google-button";
import { Turnstile } from "@/components/auth/turnstile";
import { Button } from "@/components/ui/button";
import { Field, PasswordField, PasswordStrength } from "@/components/ui/field";
import { Alert as AlertIcon, Check } from "@/components/ui/icons";
import { Alert, Spinner } from "@/components/ui/surface";
import { signUpAction, type ActionResult } from "@/lib/auth/actions";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import { route } from "@/lib/routes";
import { passwordScore } from "@/lib/utils";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth disabled={pending}>
      {pending ? <Spinner /> : null}
      {label}
    </Button>
  );
}

export function SignUpForm({ locale, dict }: { locale: Locale; dict: Dict }) {
  const copy = dict.auth.signUp;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    signUpAction,
    null,
  );
  const [password, setPassword] = useState("");
  const [oauthError, setOauthError] = useState(false);

  // Cada erro devolvido pelo servidor repõe o widget: os tokens são de uso único.
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    if (state && !state.ok) setTentativa((n) => n + 1);
  }, [state]);

  // Registo concluído: falta confirmar o email.
  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-success/12 text-success">
          <Check className="size-7" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-title2 text-fg">{copy.checkEmailTitle}</h2>
          <p className="text-callout text-fg-muted">
            {t(copy.checkEmailBody, { email: state.message ?? "" })}
          </p>
        </div>
        <p className="text-footnote text-fg-subtle">{copy.checkEmailHint}</p>
        <Link
          href={route(locale, "signIn")}
          className="text-callout font-semibold text-accent transition-opacity hover:opacity-70"
        >
          {copy.signInLink}
        </Link>
      </div>
    );
  }

  const errorKey = oauthError ? "generic" : state && !state.ok ? state.error : null;
  const score = passwordScore(password);

  return (
    <div className="flex flex-col gap-6">
      {errorKey ? (
        <Alert tone="danger" icon={<AlertIcon className="size-4" />}>
          {dict.errors[errorKey as keyof Dict["errors"]] as string}
        </Alert>
      ) : null}

      <GoogleButton
        label={copy.googleCta}
        next={route(locale, "onboarding")}
        onError={() => setOauthError(true)}
      />

      <AuthDivider label={dict.auth.dividerOr} />

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />

        <Field
          label={dict.auth.fields.name}
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={60}
          placeholder={dict.auth.fields.namePlaceholder}
        />

        <Field
          label={dict.auth.fields.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={dict.auth.fields.emailPlaceholder}
        />

        <div className="flex flex-col gap-2">
          <PasswordField
            label={dict.auth.fields.password}
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={dict.auth.fields.passwordPlaceholder}
            showLabel={dict.auth.fields.showPassword}
            hideLabel={dict.auth.fields.hidePassword}
          />
          {password ? (
            <PasswordStrength
              score={score}
              label={dict.auth.strength.label}
              levels={[
                dict.auth.strength.weak,
                dict.auth.strength.fair,
                dict.auth.strength.good,
                dict.auth.strength.strong,
              ]}
            />
          ) : null}
        </div>

        <Turnstile resetSignal={tentativa} locale={locale} />

        <SubmitButton label={copy.submit} />

        <p className="text-center text-caption leading-relaxed text-fg-subtle">
          {copy.terms}
        </p>
      </form>

      <p className="text-center text-subhead text-fg-muted">
        {copy.hasAccount}{" "}
        <Link
          href={route(locale, "signIn")}
          className="font-semibold text-accent transition-opacity hover:opacity-70"
        >
          {copy.signInLink}
        </Link>
      </p>
    </div>
  );
}
