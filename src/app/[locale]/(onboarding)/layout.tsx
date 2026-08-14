export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 py-14 safe-t safe-b">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(50%_60%_at_50%_0%,var(--accent-soft),transparent_75%)]"
      />
      <div className="relative flex w-full justify-center">{children}</div>
    </div>
  );
}
