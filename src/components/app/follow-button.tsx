"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Check, Plus } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/surface";
import { alternarSeguirAction } from "@/lib/community/actions";

/**
 * Seguir muda no ecrã antes de o servidor responder, e volta atrás se ele
 * disser que não — o mesmo padrão do "apoiar". O contador de seguidores ao
 * lado acompanha, para a página não contar uma coisa e o botão outra.
 */
export function FollowButton({
  userId,
  initial,
  labels,
  onChange,
}: {
  userId: string;
  initial: boolean;
  labels: { follow: string; unfollow: string };
  onChange?: (seguindo: boolean) => void;
}) {
  const [seguindo, setSeguindo] = useState(initial);
  const [aCorrer, iniciar] = useTransition();

  function alternar() {
    const antes = seguindo;
    setSeguindo(!antes);
    onChange?.(!antes);
    iniciar(async () => {
      const r = await alternarSeguirAction(userId, !antes);
      if (!r.ok) {
        setSeguindo(antes);
        onChange?.(antes);
      }
    });
  }

  return (
    <Button
      type="button"
      variant={seguindo ? "secondary" : "primary"}
      onClick={alternar}
      disabled={aCorrer}
      aria-pressed={seguindo}
    >
      {aCorrer ? <Spinner /> : seguindo ? <Check className="size-4" /> : <Plus className="size-4" />}
      {seguindo ? labels.unfollow : labels.follow}
    </Button>
  );
}
