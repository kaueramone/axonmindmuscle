"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Card, Spinner } from "@/components/ui/surface";
import { responderAction } from "@/lib/community/actions";
import { LIMITE_CARACTERES } from "@/lib/community/shared";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import { route } from "@/lib/routes";

const ERROS: Record<string, keyof Dict["app"]["community"]> = {
  vazio: "errorEmpty",
  longo: "errorLong",
  plano: "errorPlan",
  limite: "errorRate",
};

/**
 * Responder, no fim do fio. Texto só: a fotografia é do post de topo, e uma
 * resposta com imagem ia pedir a mesma máquina de compressão para um caso
 * raro. Quem não tem PRO vê o motivo, como no compositor do mural.
 */
export function ReplyComposer({
  postId,
  replyingTo,
  copy,
  locale,
  podePublicar,
}: {
  postId: string;
  replyingTo: string | null;
  copy: Dict["app"]["community"];
  locale: Locale;
  podePublicar: boolean;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(replyingTo ? `@${replyingTo} ` : "");
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, iniciar] = useTransition();

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

  function enviar() {
    setErro(null);
    iniciar(async () => {
      const r = await responderAction(postId, texto);
      if (!r.ok) {
        const chave = r.error ? ERROS[r.error] : undefined;
        setErro(String(chave ? copy[chave] : copy.errorGeneric));
        return;
      }
      setTexto("");
      router.refresh();
    });
  }

  return (
    <div id="responder">
    <Card className="flex flex-col gap-3">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_CARACTERES))}
        placeholder={copy.replyPlaceholder}
        rows={3}
        maxLength={LIMITE_CARACTERES}
        className="w-full resize-none rounded-md border border-hairline bg-surface px-3.5 py-2.5 text-callout text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
      />
      {erro ? <Alert tone="danger">{erro}</Alert> : null}
      <div className="flex items-center justify-between gap-3">
        <span className="data-mono text-caption text-fg-subtle">
          {t(copy.remaining, { n: restam })}
        </span>
        <Button type="button" onClick={enviar} disabled={aEnviar || texto.trim().length === 0}>
          {aEnviar ? <Spinner /> : null}
          {copy.reply}
        </Button>
      </div>
    </Card>
    </div>
  );
}
