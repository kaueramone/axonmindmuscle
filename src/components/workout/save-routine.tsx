"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Check } from "@/components/ui/icons";
import { Alert, Card, Spinner } from "@/components/ui/surface";
import { saveRoutineFromSessionAction } from "@/lib/routines/actions";
import type { Dict } from "@/lib/i18n/types";

/**
 * Guardar o treino que se acabou de fazer, no ecrã em que se acabou de o fazer.
 *
 * É o único momento em que a pessoa tem a lista toda fresca na cabeça e sabe
 * que aquilo resultou. Pedir-lhe para montar a rotina antes, num formulário,
 * seria pedir-lhe para adivinhar.
 */
export function SaveRoutine({
  sessionId,
  copy,
}: {
  sessionId: string;
  copy: Dict["workout"]["routines"];
}) {
  const [nome, setNome] = useState("");
  const [estado, setEstado] = useState<"aberto" | "guardado">("aberto");
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, guardar] = useTransition();

  if (estado === "guardado") {
    return (
      <Alert tone="success" icon={<Check className="size-4" />}>
        {copy.saved}
      </Alert>
    );
  }

  function submeter() {
    if (nome.trim().length === 0) {
      setErro(copy.saveEmpty);
      return;
    }
    setErro(null);
    guardar(async () => {
      const r = await saveRoutineFromSessionAction(sessionId, nome);
      if (r.ok) setEstado("guardado");
      else setErro(r.error === "vazia" ? copy.saveEmptySession : copy.saveFailed);
    });
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-headline font-semibold text-fg">{copy.saveTitle}</h3>
        <p className="text-callout leading-relaxed text-fg-muted">{copy.saveBody}</p>
      </div>

      {erro ? <Alert tone="danger">{erro}</Alert> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={nome}
          maxLength={60}
          onChange={(e) => setNome(e.target.value)}
          placeholder={copy.savePlaceholder}
          aria-label={copy.saveTitle}
          className="h-11 flex-1 rounded-md border border-hairline bg-surface px-4 text-callout text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        />
        <Button type="button" disabled={aGuardar} onClick={submeter}>
          {aGuardar ? <Spinner /> : null}
          {copy.saveCta}
        </Button>
      </div>
    </Card>
  );
}
