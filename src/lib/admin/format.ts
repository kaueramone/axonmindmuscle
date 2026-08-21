/** Formatação curta dos números do painel: 1 240 → 1,2 mil. */
export function compact(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) < 1000) return String(Math.round(n));
  if (Math.abs(n) < 1_000_000) return `${(n / 1000).toFixed(1).replace(".0", "")} mil`;
  return `${(n / 1_000_000).toFixed(1).replace(".0", "")} M`;
}

export function volume(kg: number | null | undefined): string {
  const n = Number(kg ?? 0);
  if (n < 1000) return `${Math.round(n)} kg`;
  return `${(n / 1000).toFixed(1).replace(".0", "")} t`;
}

export function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
