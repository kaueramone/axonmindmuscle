/**
 * Constantes de faturação seguras para o cliente. O módulo `server.ts` importa
 * `server-only`, por isso não pode ser tocado por componentes do browser —
 * o que é partilhado vive aqui.
 */
export const FOUNDERS_CODE = "FUNDADORES";

export function normalizeCode(valor: string): string {
  return valor.trim().toUpperCase();
}
