import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { ChevronRight } from "./icons";

/** Cartão elevado com hairline e canto generoso — a superfície base do produto. */
export function Card({
  className,
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag
      className={cn(
        "rounded-xl border border-hairline bg-surface p-5 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Grupo de linhas ao estilo das listas agrupadas do iOS. */
export function ListGroup({
  title,
  footer,
  children,
  className,
}: {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      {title ? (
        <h2 className="label-brand px-4 text-fg-subtle">{title}</h2>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-hairline bg-surface divide-y divide-[var(--hairline)]">
        {children}
      </div>
      {footer ? (
        <p className="px-4 text-footnote text-fg-subtle">{footer}</p>
      ) : null}
    </section>
  );
}

type RowProps = {
  icon?: ReactNode;
  label: ReactNode;
  detail?: ReactNode;
  value?: ReactNode;
  href?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  destructive?: boolean;
  className?: string;
};

function RowContent({
  icon,
  label,
  detail,
  value,
  trailing,
  chevron,
  destructive,
}: RowProps & { chevron?: boolean }) {
  return (
    <>
      {icon ? (
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-sm",
            destructive ? "bg-danger/12 text-danger" : "bg-accent-soft text-accent",
          )}
        >
          {icon}
        </span>
      ) : null}

      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span
          className={cn(
            "truncate text-callout font-medium",
            destructive ? "text-danger" : "text-fg",
          )}
        >
          {label}
        </span>
        {detail ? (
          <span className="truncate text-footnote text-fg-subtle">{detail}</span>
        ) : null}
      </span>

      {value ? (
        <span className="max-w-[55%] shrink-0 truncate text-callout text-fg-muted">
          {value}
        </span>
      ) : null}
      {trailing}
      {chevron ? (
        <ChevronRight className="size-4 shrink-0 text-fg-subtle" />
      ) : null}
    </>
  );
}

export function ListRow(props: RowProps) {
  const { href, onClick, className } = props;
  const shared = cn(
    "flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors duration-150",
    (href || onClick) && "hover:bg-surface-hover active:bg-surface-hover",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shared}>
        <RowContent {...props} chevron />
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shared}>
        <RowContent {...props} chevron={!props.trailing} />
      </button>
    );
  }

  return (
    <div className={shared}>
      <RowContent {...props} />
    </div>
  );
}

/** Etiqueta compacta para estados: Em breve, Beta, PRO. */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-strong text-fg-muted border-hairline",
    accent: "bg-accent-soft text-accent border-accent/25",
    success: "bg-success/12 text-success border-success/25",
    warning: "bg-warning/12 text-warning border-warning/25",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-caption font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Mensagem de estado — erro, aviso ou informação. */
export function Alert({
  tone = "danger",
  children,
  icon,
}: {
  tone?: "danger" | "success" | "info";
  children: ReactNode;
  icon?: ReactNode;
}) {
  const tones = {
    danger: "border-danger/30 bg-danger/10 text-danger",
    success: "border-success/30 bg-success/10 text-success",
    info: "border-accent/25 bg-accent-soft text-accent",
  } as const;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-subhead",
        tones[tone],
      )}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <span className="[text-wrap:pretty]">{children}</span>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}
