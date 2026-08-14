"use client";

import { useEffect } from "react";

import { LogoLockup } from "@/components/brand/logo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 px-5 text-center">
      <LogoLockup className="h-12 w-auto text-fg" />
      <div>
        <h1 className="text-title1 text-fg">Algo falhou</h1>
        <p className="mt-2 text-callout text-fg-muted">
          Ocorreu um erro inesperado. Podes tentar novamente.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-accent-solid px-6 py-3 text-callout font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
      >
        Tentar novamente
      </button>
    </div>
  );
}
