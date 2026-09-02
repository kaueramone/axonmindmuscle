import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";
import { profileRoute } from "@/lib/routes";

/** A mesma expressão que a acção de publicar usa para gravar as menções. */
const MENCAO = /@([a-z0-9_]{3,20})/gi;

/**
 * O corpo de um post com os @ transformados em ligações ao perfil. Só o
 * texto é dividido; nada aqui interpreta HTML, e o que não é menção sai
 * como veio.
 */
export function MentionText({ text, locale }: { text: string; locale: Locale }) {
  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  for (const m of text.matchAll(MENCAO)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo) partes.push(text.slice(ultimo, inicio));
    partes.push(
      <Link
        key={`${inicio}-${m[1]}`}
        href={profileRoute(locale, m[1].toLowerCase())}
        className="font-medium text-accent hover:underline"
      >
        {m[0]}
      </Link>,
    );
    ultimo = inicio + m[0].length;
  }
  if (ultimo < text.length) partes.push(text.slice(ultimo));
  return <>{partes}</>;
}
