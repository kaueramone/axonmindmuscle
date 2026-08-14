"use client";

import { useEffect, useState } from "react";

import { greetingKey } from "@/lib/utils";

/**
 * A saudação depende da hora do utilizador, não do servidor.
 * Renderiza vazio no servidor e preenche depois da hidratação.
 */
export function Greeting({
  name,
  labels,
  className,
}: {
  name: string;
  labels: { morning: string; afternoon: string; evening: string };
  className?: string;
}) {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(labels[greetingKey()]);
  }, [labels]);

  return (
    <p className={className} suppressHydrationWarning>
      {greeting ? (name ? `${greeting}, ${name}.` : `${greeting}.`) : " "}
    </p>
  );
}
