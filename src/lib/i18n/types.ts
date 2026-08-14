import type { Dictionary } from "./dictionaries/pt-pt";

/**
 * Converte o dicionário canónico (declarado com `as const`) numa forma
 * estrutural: mesma árvore de chaves, mas com strings livres. Garante que
 * qualquer tradução tem exatamente as mesmas chaves, sem obrigar ao mesmo texto.
 */
export type Loose<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? readonly Loose<U>[]
        : { readonly [K in keyof T]: Loose<T[K]> };

export type Dict = Loose<Dictionary>;
