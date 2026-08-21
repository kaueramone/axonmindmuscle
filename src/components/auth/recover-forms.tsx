"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { Turnstile } from "@/components/auth/turnstile";
import { Button } from "@/components/ui/button";
import { Field, PasswordField, PasswordStrength } from "@/components/ui/field";
import { Alert as AlertIcon, Check } from "@/components/ui/icons";
import { Alert, Spinner } from "@/components/ui/surface";
import {
  requestPasswordResetAction,
  updatePasswordAction,
  type ActionResult,
} from "@/lib/auth/actions";
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

export function RecoverForm({ locale, dict }: { locale: Locale; dict: Dict }) {
  const copy = dict.auth.recover;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    requestPasswordResetAction,
    null,
  );

  // Cada erro repõe o widget: os tokens do Turnstile são de uso único.
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    if (state && !state.ok) setTentativa((n) => n + 1);
  }, [state]);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-success/12 text-success">
          <Check className="size-7" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-title2 text-fg">{copy.sentTitle}</h2>
          <p className="text-callout text-fg-muted">
            {t(copy.sentBody, { email: state.message ?? "" })}
          </p>
        </div>
        <Link
          href={route(locale, "signIn")}
          className="text-callout font-semibold text-accent transition-opacity hover:opacity-70"
        >
          {copy.backToSignIn}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {state && !state.ok ? (
        <Alert tone="danger" icon={<AlertIcon className="size-4" />}>
          {dict.errors[state.error as keyof Dict["errors"]] as string}
        </Alert>
      ) : null}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <Field
          label={dict.auth.fields.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={dict.auth.fields.emailPlaceholder}
        />
        <Turnstile resetSignal={tentativa} locale={locale} />
        <SubmitButton label={copy.submit} />
      </form>

      <p className="text-center text-subhead text-fg-muted">
        <Link
          href={route(locale, "signIn")}
          className="font-semibold text-accent transition-opacity hover:opacity-70"
        >
          {copy.backToSignIn}
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dict;
}) {
  const copy = dict.auth.reset;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    updatePasswordAction,
    null,
  );
  const [password, setPassword] = useState("");

  return (
    <div className="flex flex-col gap-6">
      {state && !state.ok ? (
        <Alert tone="danger" icon={<AlertIcon className="size-4" />}>
          {dict.errors[state.error as keyof Dict["errors"]] as string}
        </Alert>
      ) : null}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />

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
              score={passwordScore(password)}
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

        <PasswordField
          label={dict.auth.fields.passwordConfirm}
          name="passwordConfirm"
          autoComplete="new-password"
          required
          minLength={8}
          showLabel={dict.auth.fields.showPassword}
          hideLabel={dict.auth.fields.hidePassword}
        />

        <SubmitButton label={copy.submit} />
      </form>
    </div>
  );
}
