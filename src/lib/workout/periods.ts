import type { Locale } from "@/lib/i18n/config";

export type PeriodKey = "day" | "week" | "meso" | "month" | "year";

export const PERIODS: PeriodKey[] = ["day", "week", "meso", "month", "year"];

/**
 * Intervalo de um período, calculado no fuso do utilizador.
 *
 * Toda a agregação parte daqui. As datas são strings `YYYY-MM-DD` porque é
 * assim que as funções da base de dados comparam com `local_date` — sem
 * conversões de fuso pelo meio, que é onde estes cálculos costumam partir.
 */
export function periodRange(
  period: PeriodKey,
  timezone: string,
  now = new Date(),
): { from: string; to: string; days: number } {
  const hoje = localDate(now, timezone);
  const fim = hoje;

  switch (period) {
    case "day":
      return { from: fim, to: fim, days: 1 };
    case "week": {
      // Semana a começar na segunda-feira.
      const inicio = addDays(fim, -((weekdayIndex(fim) + 6) % 7));
      return { from: inicio, to: fim, days: 7 };
    }
    case "meso":
      return { from: addDays(fim, -27), to: fim, days: 28 };
    case "month": {
      const [ano, mes] = fim.split("-").map(Number);
      return { from: `${ano}-${String(mes).padStart(2, "0")}-01`, to: fim, days: 31 };
    }
    case "year": {
      const ano = Number(fim.slice(0, 4));
      return { from: `${ano}-01-01`, to: fim, days: 365 };
    }
  }
}

/** Data de calendário no fuso indicado, em formato `YYYY-MM-DD`. */
export function localDate(instante: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

export function addDays(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo, 1 = segunda… Calculado sem depender do fuso local do servidor. */
export function weekdayIndex(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/** Segunda-feira da semana a que a data pertence. */
export function weekStart(iso: string): string {
  return addDays(iso, -((weekdayIndex(iso) + 6) % 7));
}

/**
 * Sequência de semanas cumpridas, a contar da semana atual para trás.
 *
 * Conta semanas em que o utilizador atingiu a frequência que definiu — não
 * dias seguidos. Descansar faz parte do programa: uma sequência que quebra
 * no dia de recuperação estaria a castigar exatamente o comportamento certo.
 * A semana em curso só conta quando já foi cumprida, para não a quebrar a
 * meio.
 */
export function weeklyStreak(
  diasComTreino: string[],
  frequenciaAlvo: number,
  hoje: string,
): number {
  if (diasComTreino.length === 0) return 0;

  const porSemana = new Map<string, number>();
  for (const dia of new Set(diasComTreino)) {
    const semana = weekStart(dia);
    porSemana.set(semana, (porSemana.get(semana) ?? 0) + 1);
  }

  const alvo = Math.max(1, frequenciaAlvo);
  let sequencia = 0;
  let semana = weekStart(hoje);

  // A semana em curso não quebra a sequência se ainda estiver a decorrer.
  if ((porSemana.get(semana) ?? 0) >= alvo) sequencia += 1;
  semana = addDays(semana, -7);

  while ((porSemana.get(semana) ?? 0) >= alvo) {
    sequencia += 1;
    semana = addDays(semana, -7);
  }

  return sequencia;
}

export function formatVolume(kg: number, locale: Locale): string {
  const intl = locale === "pt-br" ? "pt-BR" : "pt-PT";
  if (kg >= 10000) {
    return `${new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(kg / 1000)} t`;
  }
  if (kg >= 1000) {
    return `${new Intl.NumberFormat(intl, { maximumFractionDigits: 1 }).format(kg / 1000)} t`;
  }
  return `${new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(kg)} kg`;
}
