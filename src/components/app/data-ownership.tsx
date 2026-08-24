"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Alert as AlertIcon, Check, Download } from "@/components/ui/icons";
import { Alert, Card, ListGroup, ListRow, Spinner } from "@/components/ui/surface";
import {
  cancelAccountDeletionAction,
  requestAccountDeletionAction,
} from "@/lib/account/actions";
import { formatDate, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";

/**
 * "Os teus dados são teus", em botões.
 *
 * A exportação não depende do plano de propósito. Cobrar por ela partiria a
 * promessa — e, para quem vende na União Europeia, também o direito à
 * portabilidade, que existe independentemente de haver assinatura.
 */
export function DataOwnership({
  locale,
  dict,
  deletionRequestedAt,
}: {
  locale: Locale;
  dict: Dict;
  /** Quando a pessoa pediu para apagar a conta, se pediu. */
  deletionRequestedAt: string | null;
}) {
  const copy = dict.app.data;
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aCorrer, iniciar] = useTransition();

  const apagaEm = deletionRequestedAt
    ? new Date(
        new Date(deletionRequestedAt).getTime() + 92 * 24 * 60 * 60 * 1000,
      )
    : null;

  function pedirEliminacao() {
    setErro(null);
    iniciar(async () => {
      const r = await requestAccountDeletionAction();
      if (!r.ok) setErro(r.error === "subscricao" ? copy.deleteBilling : copy.deleteFailed);
      else setConfirmar(false);
    });
  }

  function anularEliminacao() {
    setErro(null);
    iniciar(async () => {
      const r = await cancelAccountDeletionAction();
      if (!r.ok) setErro(copy.deleteFailed);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <ListGroup title={copy.title} footer={copy.footer}>
        <ListRow
          icon={<Download className="size-4.5" />}
          label={copy.csvLabel}
          detail={copy.csvHint}
          href="/api/exportar?formato=csv"
        />
        <ListRow
          icon={<Download className="size-4.5" />}
          label={copy.jsonLabel}
          detail={copy.jsonHint}
          href="/api/exportar?formato=json"
        />
      </ListGroup>

      {deletionRequestedAt && apagaEm ? (
        <Card className="flex flex-col gap-4">
          <Alert tone="danger" icon={<AlertIcon className="size-4" />}>
            {t(copy.pendingTitle, { date: formatDate(apagaEm, locale) })}
          </Alert>
          <p className="text-callout leading-relaxed text-fg-muted">
            {copy.pendingBody}
          </p>
          <Button
            type="button"
            variant="primary"
            fullWidth
            disabled={aCorrer}
            onClick={anularEliminacao}
          >
            {aCorrer ? <Spinner /> : <Check className="size-4" />}
            {copy.pendingUndo}
          </Button>
          {erro ? <Alert tone="danger">{erro}</Alert> : null}
        </Card>
      ) : (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-headline font-semibold text-fg">{copy.deleteTitle}</h3>
            <p className="text-callout leading-relaxed text-fg-muted">
              {copy.deleteBody}
            </p>
          </div>

          {erro ? <Alert tone="danger">{erro}</Alert> : null}

          {confirmar ? (
            <div className="flex flex-col gap-3">
              <Alert tone="danger">{copy.deleteConfirm}</Alert>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  disabled={aCorrer}
                  onClick={() => setConfirmar(false)}
                >
                  {copy.deleteKeep}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  fullWidth
                  disabled={aCorrer}
                  onClick={pedirEliminacao}
                >
                  {aCorrer ? <Spinner /> : null}
                  {copy.deleteGo}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setConfirmar(true)}
            >
              {copy.deleteCta}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
