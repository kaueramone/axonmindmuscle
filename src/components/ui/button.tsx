import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "plain" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-semibold " +
  "transition-[transform,background-color,border-color,opacity] duration-200 " +
  "[transition-timing-function:var(--ease-spring)] active:scale-[0.97] " +
  "disabled:pointer-events-none disabled:opacity-45 select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-solid text-accent-fg shadow-[0_1px_2px_rgba(0,0,0,0.25)] hover:bg-accent-hover",
  secondary:
    "bg-surface-strong text-fg border border-hairline hover:bg-surface-hover backdrop-blur-xl",
  ghost: "text-fg hover:bg-surface",
  plain: "text-accent hover:opacity-70 px-0",
  danger: "bg-danger/12 text-danger border border-danger/30 hover:bg-danger/20",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-subhead rounded-sm",
  md: "h-11 px-5 text-callout rounded-md",
  lg: "h-13 px-7 text-headline rounded-lg",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        base,
        variants[variant],
        variant === "plain" ? "h-auto text-callout" : sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  href,
  prefetch,
  target,
  rel,
}: CommonProps & {
  href: string;
  prefetch?: boolean;
  target?: string;
  rel?: string;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      target={target}
      rel={rel}
      className={cn(
        base,
        variants[variant],
        variant === "plain" ? "h-auto text-callout" : sizes[size],
        fullWidth && "w-full",
        className,
      )}
    >
      {children}
    </Link>
  );
}
