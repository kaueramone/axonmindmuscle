"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { AuthDivider } from "@/components/auth/divider";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Field, PasswordField } from "@/components/ui/field";
import { Alert as AlertIcon } from "@/components/ui/icons";
import { Alert, Spinner } from "@/components/ui/surface";
import { signInAction, type ActionResult } from "@/lib/auth/actions";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/types";
import { route } from "@/lib/routes";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth disabled={pending}>
      {pending ? <Spinner /> : null}
      {label}
    </Button>
  );
}

export function SignInForm({
  locale,
  dict,
  redirectTo,
  initialError,
}: {
  locale: Locale;
  dict: Dict;
  redirectTo?: string;
  initialError?: keyof Dict["errors"] | null;
}) {
  const copy = dict.auth.signIn;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    signInAction,
    initialError ? { ok: false, error: initialError as never } : null,
  );
  const [oauthError, setOauthError] = useState(false);

  const errorKey = oauthError
    ? "generic"
    : state && !state.ok
      ? state.error
      : null;

  return (
    <div className="flex flex-col gap-6">
      {errorKey ? (
        <Alert tone="danger" icon={<AlertIcon className="size-4" />}>
          {dict.errors[errorKey as keyof Dict["errors"]] as string}
        </Alert>
      ) : null}

      <GoogleButton
        label={copy.googleCta}
        next={redirectTo}
        onError={() => setOauthError(true)}
      />

      <AuthDivider label={dict.auth.dividerOr} />

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        {redirectTo ? (
          <input type="hidden" name="redirect" value={redirectTo} />
        ) : null}

        <Field
          label={dict.auth.fields.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={dict.auth.fields.emailPlaceholder}
        />

        <div className="flex flex-col gap-1.5">
          <PasswordField
            label={dict.auth.fields.password}
            name="password"
            autoComplete="current-password"
            required
            placeholder={dict.auth.fields.passwordPlaceholder}
            showLabel={dict.auth.fields.showPassword}
            hideLabel={dict.auth.fields.hidePassword}
          />
          <Link
            href={route(locale, "recover")}
            className="self-end text-footnote text-accent transition-opacity hover:opacity-70"
          >
            {copy.forgot}
          </Link>
        </div>

        <SubmitButton label={copy.submit} />
      </form>

      <p className="text-center text-subhead text-fg-muted">
        {copy.noAccount}{" "}
        <Link
          href={route(locale, "signUp")}
          className="font-semibold text-accent transition-opacity hover:opacity-70"
        >
          {copy.createAccount}
        </Link>
      </p>
    </div>
  );
}
