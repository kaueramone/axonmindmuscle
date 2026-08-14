"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "./icons";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Ícone ou botão no canto direito do campo. */
  trailing?: ReactNode;
};

const inputBase =
  "w-full rounded-md border bg-surface px-4 text-body text-fg placeholder:text-fg-subtle " +
  "outline-none transition-[border-color,background-color,box-shadow] duration-200 " +
  "h-13 focus:border-accent focus:bg-surface-strong focus:shadow-[0_0_0_4px_var(--accent-soft)] " +
  "disabled:opacity-50";

export function Field({
  label,
  hint,
  error,
  trailing,
  className,
  id,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = error
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className="text-footnote font-medium text-fg-muted pl-1"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            inputBase,
            error
              ? "border-danger/60 focus:border-danger focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--danger)_18%,transparent)]"
              : "border-hairline",
            trailing ? "pr-12" : null,
            className,
          )}
          {...props}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>
        ) : null}
      </div>

      {error ? (
        <p id={`${fieldId}-error`} className="text-footnote text-danger pl-1">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-footnote text-fg-subtle pl-1">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({
  showLabel,
  hideLabel,
  ...props
}: Omit<FieldProps, "trailing" | "type"> & {
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          className="grid size-9 place-items-center rounded-xs text-fg-subtle transition-colors hover:text-fg"
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      }
    />
  );
}

/** Barra de força da palavra-passe, de 0 a 4. */
export function PasswordStrength({
  score,
  label,
  levels,
}: {
  score: number;
  label: string;
  levels: readonly string[];
}) {
  const colors = ["bg-danger", "bg-warning", "bg-accent", "bg-success"];
  const active = Math.max(score - 1, 0);

  return (
    <div className="flex items-center gap-3 pl-1">
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              index < score ? colors[active] : "bg-surface-strong",
            )}
          />
        ))}
      </div>
      <span className="text-caption text-fg-subtle tabular-nums">
        {label}: {levels[active] ?? levels[0]}
      </span>
    </div>
  );
}
