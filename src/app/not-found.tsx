import Link from "next/link";

import { LogoLockup } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 px-5 text-center">
      <LogoLockup className="h-12 w-auto text-fg" />
      <div>
        <h1 className="text-title1 text-fg">Página não encontrada</h1>
        <p className="mt-2 text-callout text-fg-muted">
          O caminho que seguiste não existe ou foi movido.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-md bg-accent-solid px-6 py-3 text-callout font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
