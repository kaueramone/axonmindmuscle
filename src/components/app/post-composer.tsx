"use client";

import { useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/surface";
import { publicarAction } from "@/lib/community/actions";
import { LIMITE_CARACTERES } from "@/lib/community/shared";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import { route } from "@/lib/routes";
import { cn } from "@/lib/utils";

const ERROS: Record<string, keyof Dict["app"]["community"]> = {
  vazio: "errorEmpty",
  longo: "errorLong",
  plano: "errorPlan",
  limite: "errorRate",
};

/**
 * A caixa de escrita.
 *
 * Quem não tem PRO vê no lugar dela o motivo e o caminho para o resolver — e
 * não um campo desactivado, que não explica nada a quem carrega nele.
 */
export function PostComposer({
  copy,
  locale,
  podePublicar,
}: {
  copy: Dict["app"]["community"];
  locale: Locale;
  podePublicar: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!podePublicar) {
    return (
      <Card className="flex flex-col gap-3 bg-accent-soft">
        <p className="text-callout leading-relaxed text-fg">{copy.proOnly}</p>
        <ButtonLink href={route(locale, "plans")} variant="secondary" size="sm">
          {copy.proOnlyCta}
        </ButtonLink>
      </Card>
    );
  }

  const restam = LIMITE_CARACTERES - texto.length;
  const vazio = texto.trim().length === 0;

  async function submeter() {
    setBusy(true);
    setErro(null);

    const dados = new FormData();
    dados.set("body", texto);
    const r = await publicarAction(dados);

    if (r.ok) {
      setTexto("");
    } else {
      setErro(copy[ERROS[r.error ?? ""] ?? "errorGeneric"] as string);
    }
    setBusy(false);
  }

  return (
    <Card className="flex flex-col gap-3">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_CARACTERES))}
        placeholder={copy.placeholder}
        rows={3}
        disabled={busy}
        className="w-full resize-none bg-transparent text-body text-fg outline-none placeholder:text-fg-subtle disabled:opacity-60"
      />

      {erro ? <Alert tone="danger">{erro}</Alert> : null}

      <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3">
        <span
          className={cn(
            "data-mono text-caption",
            restam <= 20 ? "text-warning" : "text-fg-subtle",
          )}
        >
          {t(copy.remaining, { n: String(restam) })}
        </span>
        <Button size="sm" onClick={submeter} disabled={busy || vazio}>
          {busy ? copy.publishing : copy.publish}
        </Button>
      </div>
    </Card>
  );
}
