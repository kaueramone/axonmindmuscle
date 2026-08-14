import type { MuscleGroup } from "@/lib/supabase/types";

/**
 * Modelo de prontidão.
 *
 * O que isto é: uma heurística ponderada sobre sinais que o utilizador
 * consegue medir sem equipamento, corrigida por aquilo que já sabemos do
 * histórico dele.
 *
 * O que isto não é: um marcador validado de recuperação nem uma previsão
 * de lesão. A literatura sustenta que questionários subjetivos de bem-estar
 * acompanham a resposta à carga de treino — não sustenta que uma pontuação
 * calculada assim determine o que se deve levantar hoje. Por isso o
 * resultado é apresentado como recomendação, com os fatores à vista, e
 * nunca impede ninguém de treinar.
 *
 * Todas as escalas de 1 a 5 vão no mesmo sentido: 1 é mau, 5 é bom. Isso
 * evita o erro clássico de misturar direções e obter o inverso do que se
 * queria medir.
 */

export type ReadinessAnswers = {
  /** Horas dormidas. */
  sleepHours: number | null;
  /** 1 = muito má, 5 = excelente. */
  sleepQuality: number | null;
  /** 1 = exausto, 5 = com energia. */
  energy: number | null;
  /** 1 = muito dorido, 5 = sem dores. */
  soreness: number | null;
  soreMuscles: MuscleGroup[];
  /** Batimentos por minuto em repouso, contados ao pulso. */
  restingHr: number | null;
};

export type ReadinessContext = {
  baselineRestingHr: number | null;
  baselineSleepHours: number | null;
  baselineDays: number;
  daysSinceLastSession: number | null;
  consecutiveDays: number;
  setsLast7: number;
  avgWeeklySets: number;
  recentMuscles: MuscleGroup[];
};

export type ReadinessState = "strong" | "moderate" | "rest";

export type Driver = {
  key: string;
  /** Se este fator empurrou a prontidão para cima ou para baixo. */
  direction: "up" | "down";
  /** Valor observado, para a interface mostrar sem recalcular. */
  detail?: string;
};

export type ReadinessResult = {
  score: number;
  state: ReadinessState;
  drivers: Driver[];
  /** Grupos a evitar hoje: doridos ou treinados nas últimas 48 horas. */
  avoidMuscles: MuscleGroup[];
  /** Verdadeiro quando ainda não há dias suficientes para comparar. */
  needsBaseline: boolean;
};

/** Interpolação linear entre pontos de referência. */
function curve(valor: number, pontos: [number, number][]): number {
  if (valor <= pontos[0][0]) return pontos[0][1];
  const ultimo = pontos[pontos.length - 1];
  if (valor >= ultimo[0]) return ultimo[1];

  for (let i = 0; i < pontos.length - 1; i += 1) {
    const [x1, y1] = pontos[i];
    const [x2, y2] = pontos[i + 1];
    if (valor >= x1 && valor <= x2) {
      return y1 + ((valor - x1) / (x2 - x1)) * (y2 - y1);
    }
  }
  return 50;
}

const escala5 = (v: number) => ((v - 1) / 4) * 100;

/** Dias mínimos de histórico para uma média pessoal significar alguma coisa. */
const DIAS_PARA_BASELINE = 5;

export function computeReadiness(
  answers: ReadinessAnswers,
  context: ReadinessContext,
): ReadinessResult {
  const componentes: { peso: number; valor: number; key: string }[] = [];
  const drivers: Driver[] = [];

  const temBaseline = context.baselineDays >= DIAS_PARA_BASELINE;

  /* ---- Energia percebida ---- */
  if (answers.energy != null) {
    const valor = escala5(answers.energy);
    componentes.push({ peso: 0.28, valor, key: "energy" });
    if (answers.energy <= 2) drivers.push({ key: "energy", direction: "down" });
    if (answers.energy >= 4) drivers.push({ key: "energy", direction: "up" });
  }

  /* ---- Qualidade do sono ---- */
  if (answers.sleepQuality != null) {
    const valor = escala5(answers.sleepQuality);
    componentes.push({ peso: 0.22, valor, key: "sleepQuality" });
    if (answers.sleepQuality <= 2) drivers.push({ key: "sleepQuality", direction: "down" });
    if (answers.sleepQuality >= 4) drivers.push({ key: "sleepQuality", direction: "up" });
  }

  /* ---- Duração do sono ---- */
  if (answers.sleepHours != null) {
    let valor: number;
    if (temBaseline && context.baselineSleepHours) {
      // Comparar com a própria média diz mais do que uma referência genérica.
      const desvio = answers.sleepHours - context.baselineSleepHours;
      valor = curve(desvio, [
        [-2.5, 5],
        [-1.5, 30],
        [-0.5, 70],
        [0, 90],
        [1, 100],
      ]);
      if (desvio <= -1) {
        drivers.push({
          key: "sleepDebt",
          direction: "down",
          detail: `${desvio.toFixed(1)} h`,
        });
      }
    } else {
      valor = curve(answers.sleepHours, [
        [4, 5],
        [5.5, 30],
        [6.5, 65],
        [7.5, 92],
        [8.5, 100],
        [10, 88],
      ]);
      if (answers.sleepHours < 6) drivers.push({ key: "sleepShort", direction: "down" });
    }
    componentes.push({ peso: 0.2, valor, key: "sleepHours" });
  }

  /* ---- Dores musculares ---- */
  if (answers.soreness != null) {
    const valor = escala5(answers.soreness);
    componentes.push({ peso: 0.18, valor, key: "soreness" });
    if (answers.soreness <= 2) drivers.push({ key: "soreness", direction: "down" });
  }

  /* ---- Frequência cardíaca de repouso ----
     Só entra quando existe média pessoal: 62 bpm não diz nada; 62 quando a
     média são 54 diz. Sem histórico, fica de fora e a interface explica. */
  if (answers.restingHr != null && temBaseline && context.baselineRestingHr) {
    const desvio = answers.restingHr - context.baselineRestingHr;
    const valor = curve(desvio, [
      [-4, 100],
      [0, 90],
      [4, 55],
      [8, 20],
      [12, 5],
    ]);
    componentes.push({ peso: 0.12, valor, key: "restingHr" });
    if (desvio >= 4) {
      drivers.push({
        key: "restingHrUp",
        direction: "down",
        detail: `+${Math.round(desvio)} bpm`,
      });
    }
  }

  /* ---- Média ponderada sobre o que foi respondido ---- */
  const pesoTotal = componentes.reduce((t, c) => t + c.peso, 0);
  let score =
    pesoTotal > 0
      ? componentes.reduce((t, c) => t + c.valor * c.peso, 0) / pesoTotal
      : 50;

  /* ---- Ajustes vindos do histórico ----
     Pequenos de propósito: são contexto, não devem dominar o que a pessoa
     está a sentir. */
  if (context.consecutiveDays >= 5) {
    score -= 6;
    drivers.push({
      key: "consecutiveDays",
      direction: "down",
      detail: String(context.consecutiveDays),
    });
  }

  if (context.avgWeeklySets > 0 && context.setsLast7 > context.avgWeeklySets * 1.5) {
    score -= 6;
    drivers.push({
      key: "loadSpike",
      direction: "down",
      detail: `${Math.round((context.setsLast7 / context.avgWeeklySets - 1) * 100)}%`,
    });
  }

  if (context.daysSinceLastSession != null && context.daysSinceLastSession >= 4) {
    score += 4;
    drivers.push({
      key: "wellRested",
      direction: "up",
      detail: String(context.daysSinceLastSession),
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const state: ReadinessState = score >= 70 ? "strong" : score >= 45 ? "moderate" : "rest";

  /* ---- Grupos a evitar ---- */
  const avoid = [
    ...new Set([...answers.soreMuscles, ...context.recentMuscles]),
  ] as MuscleGroup[];

  return {
    score,
    state,
    drivers,
    avoidMuscles: avoid,
    needsBaseline: !temBaseline,
  };
}

/**
 * Ajuste concreto que a recomendação implica no treino de hoje.
 * Sem isto o painel seria um horóscopo: diz como te sentes e não muda nada.
 */
export function prescriptionFor(state: ReadinessState): {
  loadDelta: number;
  rirDelta: number;
} {
  switch (state) {
    case "strong":
      return { loadDelta: 0, rirDelta: 0 };
    case "moderate":
      return { loadDelta: -0.075, rirDelta: 1 };
    case "rest":
      return { loadDelta: -0.2, rirDelta: 2 };
  }
}
