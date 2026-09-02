"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Check } from "@/components/ui/icons";
import { Alert, Card, Spinner } from "@/components/ui/surface";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/types";
import { grantReadinessConsentAction } from "@/lib/readiness/consent";
import { route } from "@/lib/routes";

/**
 * O pedido de autorização aparece no sítio onde os dados vão ser pedidos, e
 * não num passo do onboarding que a pessoa aceita sem ler: quem chega aqui
 * está prestes a responder ao questionário, e é nesse momento que a
 * explicação faz sentido. Aceitar liberta o formulário na hora; "agora não"
 * devolve à página inicial sem guardar nada.
 */
export function ReadinessConsent({
  locale,
  dict,
  onAccepted,
}: {
  locale: Locale;
  dict: Dict;
  onAccepted: (consentAt: string) => void;
}) {
  const copy = dict.readiness.consent;
  const [erro, setErro] = useState<string | null>(null);
  const [aCorrer, iniciar] = useTransition();

  function aceitar() {
    setErro(null);
    iniciar(async () => {
      const r = await grantReadinessConsentAction();
      if (!r.ok || !r.consentAt) {
        setErro(copy.failed);
        return;
      }
      onAccepted(r.consentAt);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-title3 text-fg">{copy.title}</h2>
          <p className="text-callout leading-relaxed text-fg-muted">{copy.body}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {copy.items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-subhead text-fg-muted">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <Link
          href={route(locale, "privacy")}
          className="self-start text-subhead font-medium text-accent"
        >
          {copy.privacy}
        </Link>

        {erro ? <Alert tone="danger">{erro}</Alert> : null}
      </Card>

      <div className="flex flex-col gap-2.5">
        <Button size="lg" fullWidth onClick={aceitar} disabled={aCorrer}>
          {aCorrer ? <Spinner /> : null}
          {copy.accept}
        </Button>
        <ButtonLink href={route(locale, "today")} size="lg" variant="ghost" fullWidth>
          {copy.decline}
        </ButtonLink>
      </div>
    </div>
  );
}
