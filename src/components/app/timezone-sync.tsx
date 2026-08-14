"use client";

import { useEffect } from "react";

import { updateTimezoneAction } from "@/lib/auth/actions";

/**
 * Mantém o fuso do perfil alinhado com o do dispositivo.
 *
 * Corre uma vez por carregamento e só escreve quando há diferença — o
 * utilizador que viaja ou muda de país passa a ver os treinos agrupados
 * nos dias certos sem ter de configurar nada.
 */
export function TimezoneSync({ current }: { current: string | null }) {
  useEffect(() => {
    const detetado = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detetado || detetado === current) return;
    void updateTimezoneAction(detetado);
  }, [current]);

  return null;
}
