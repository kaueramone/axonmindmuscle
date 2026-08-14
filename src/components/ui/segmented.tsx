"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
};

/**
 * Controlo segmentado ao estilo iOS: o indicador desliza por baixo das
 * opções em vez de cada botão mudar de cor.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const groupId = useId();
  const index = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "relative isolate flex rounded-md border border-hairline bg-surface p-1",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 z-0 rounded-sm bg-surface-strong shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-300 [transition-timing-function:var(--ease-spring)]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(calc(${index} * 100%))`,
          left: "0.25rem",
        }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            id={`${groupId}-${option.value}`}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-2 text-subhead font-medium transition-colors duration-200",
              selected ? "text-fg" : "text-fg-subtle hover:text-fg-muted",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Cartões de escolha usados na calibração — alternativa vertical ao segmentado. */
export function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  columns = 2,
}: {
  options: readonly { value: T; label: string; detail?: string }[];
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel: string;
  columns?: 1 | 2;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid gap-2.5", columns === 2 ? "sm:grid-cols-2" : "")}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-lg border p-4 text-left transition-all duration-200 [transition-timing-function:var(--ease-spring)] active:scale-[0.98]",
              selected
                ? "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent)]"
                : "border-hairline bg-surface hover:bg-surface-hover",
            )}
          >
            <span className="text-callout font-semibold text-fg">{option.label}</span>
            {option.detail ? (
              <span className="text-footnote text-fg-subtle">{option.detail}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
