"use client";

import { useEffect, useState, useTransition } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Check, Users } from "@/components/ui/icons";
import { Alert, Badge, Card, Spinner } from "@/components/ui/surface";
import { partilharTreinoAction, resumoSessaoAction } from "@/lib/community/actions";
import {
  LIMITE_CARACTERES,
  type ShareChoices,
  type WorkoutSummary,
} from "@/lib/community/shared";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import { route } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * A pergunta no fim da sessão, e não uma partilha automática: foi assim que
 * o Kaue decidiu, e é o que evita que alguém descubra o treino no mural sem
 * ter escolhido pô-lo lá. Cada caixa é uma parte do resumo; o servidor
 * recalcula os números e guarda só as partes marcadas.
 */
export function ShareWorkout({
  sessionId,
  plan,
  locale,
  copy,
}: {
  sessionId: string;
  plan: "free" | "pro";
  locale: Locale;
  copy: Dict["app"]["community"];
}) {
  const [resumo, setResumo] = useState<WorkoutSummary | null | "erro">(null);
  const [escolhas, setEscolhas] = useState<ShareChoices>({
    exercises: true,
    totals: true,
    records: true,
    readiness: false,
  });
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"aberto" | "feito" | "saltado">("aberto");
  const [erro, setErro] = useState<string | null>(null);
  const [aCorrer, iniciar] = useTransition();

  useEffect(() => {
    let cancelado = false;
    void resumoSessaoAction(sessionId).then((r) => {
      if (!cancelado) setResumo(r ?? "erro");
    });
    return () => {
      cancelado = true;
    };
  }, [sessionId]);

  if (estado === "saltado") return null;

  if (estado === "feito") {
    return (
      <Alert tone="success" icon={<Check className="size-4" />}>
        {copy.shareDone}
      </Alert>
    );
  }

  if (resumo === "erro") {
    return (
      <Card className="flex flex-col gap-2">
        <p className="text-callout text-fg-muted">{copy.shareOffline}</p>
      </Card>
    );
  }

  const temRecordes = (resumo?.records?.length ?? 0) > 0;
  const temProntidao = resumo?.readiness != null;

  const opcoes: { chave: keyof ShareChoices; rotulo: string; disponivel: boolean }[] = [
    { chave: "exercises", rotulo: copy.shareExercises, disponivel: true },
    { chave: "totals", rotulo: copy.shareTotals, disponivel: true },
    {
      chave: "records",
      rotulo: t(copy.shareRecords, { n: resumo?.records?.length ?? 0 }),
      disponivel: temRecordes,
    },
    { chave: "readiness", rotulo: copy.shareReadiness, disponivel: temProntidao },
  ];

  function partilhar() {
    setErro(null);
    iniciar(async () => {
      const r = await partilharTreinoAction({ sessionId, body: texto, choices: escolhas });
      if (r.ok) {
        setEstado("feito");
        return;
      }
      setErro(
        r.error === "vazio"
          ? copy.errorChoices
          : r.error === "longo"
            ? copy.errorLong
            : r.error === "plano"
              ? copy.shareProOnly
              : r.error === "limite"
                ? copy.errorRate
                : copy.errorGeneric,
      );
    });
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="flex items-center gap-2 text-headline font-semibold text-fg">
            <Users className="size-4.5 text-accent" />
            {copy.shareTitle}
          </h3>
          <p className="text-subhead text-fg-muted">{copy.shareBody}</p>
        </div>
        {plan !== "pro" ? <Badge tone="accent">PRO</Badge> : null}
      </div>

      {resumo == null ? (
        <div className="flex items-center gap-2 text-subhead text-fg-subtle">
          <Spinner /> …
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {opcoes
              .filter((o) => o.disponivel)
              .map((o) => (
                <label
                  key={o.chave}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-2.5 text-callout transition-colors",
                    escolhas[o.chave]
                      ? "border-accent bg-accent-soft text-fg"
                      : "border-hairline bg-surface text-fg-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={escolhas[o.chave]}
                    onChange={(e) => setEscolhas({ ...escolhas, [o.chave]: e.target.checked })}
                    className="size-4 accent-[var(--accent)]"
                  />
                  {o.rotulo}
                </label>
              ))}
          </div>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_CARACTERES))}
            placeholder={copy.sharePlaceholder}
            rows={2}
            maxLength={LIMITE_CARACTERES}
            className="w-full resize-none rounded-md border border-hairline bg-surface px-3.5 py-2.5 text-callout text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
          />

          {erro ? <Alert tone="danger">{erro}</Alert> : null}

          {plan === "pro" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={aCorrer}
                onClick={() => setEstado("saltado")}
              >
                {copy.shareSkip}
              </Button>
              <Button type="button" fullWidth disabled={aCorrer} onClick={partilhar}>
                {aCorrer ? <Spinner /> : null}
                {copy.shareCta}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-caption text-fg-subtle">{copy.shareProOnly}</p>
              <ButtonLink href={route(locale, "plans")} variant="secondary" fullWidth>
                {copy.proOnlyCta}
              </ButtonLink>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
