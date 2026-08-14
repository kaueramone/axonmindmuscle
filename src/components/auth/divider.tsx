export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4" role="separator">
      <span className="h-px flex-1 bg-hairline" />
      <span className="text-caption uppercase tracking-widest text-fg-subtle">
        {label}
      </span>
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}
