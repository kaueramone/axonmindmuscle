/**
 * Do que a pessoa fez da última vez para o número que ela põe na barra hoje.
 *
 * Até aqui o treino mostrava a prontidão em cru — "Carga sugerida −8%" — e
 * deixava a conta a cargo de quem estava de pé no ginásio com o telemóvel na
 * mão. Pior: só funcionava para quem se lembrasse do peso da última vez. Este
 * módulo existe para que o produto responda à única pergunta que interessa
 * naquele momento, que é quanto peso pôr.
 */

export type Zone = "facil" | "moderado" | "forte";

/** Série de referência da última sessão em que o exercício apareceu. */
export type LastPerformance = {
  performedAt: string;
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  durationS: number | null;
  intensityZone: Zone | null;
};

export type ReadinessAdjust = {
  loadDelta: number;
  rirDelta: number;
};

/** Porque é que o número sugerido é aquele. É isto que a interface explica. */
export type Basis = "primeira" | "progride" | "repete" | "prontidao";

export type Suggestion = {
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  basis: Basis;
  last: LastPerformance | null;
};

/**
 * Passos que existem mesmo num ginásio. Sugerir 56,4 kg é tão inútil como
 * sugerir uma percentagem: ninguém tem esse disco.
 */
export function roundLoad(kg: number): number {
  const passo = kg >= 40 ? 2.5 : kg >= 10 ? 1 : 0.5;
  const arredondado = Math.round(kg / passo) * passo;
  return Math.max(passo, Math.round(arredondado * 100) / 100);
}

/**
 * O degrau seguinte acima de uma carga. Um incremento de 2,5% em halteres de
 * 8 kg dá 8,2 kg, que arredonda de volta para 8: a interface diria "subiste" e
 * o número era o mesmo. Quando se progride, tem de se mexer.
 */
function nextStepUp(kg: number): number {
  const passo = kg >= 40 ? 2.5 : kg >= 10 ? 1 : 0.5;
  return Math.round((kg + passo) * 100) / 100;
}

/** Tempo em passos de meio minuto, pela mesma razão. */
export function roundDuration(seconds: number): number {
  return Math.max(30, Math.round(seconds / 30) * 30);
}

/**
 * Subir só quando a última série ficou claramente longe da falha. Com duas
 * repetições ou menos na reserva a pessoa já está no sítio certo, e insistir
 * em subir todas as sessões é como se acumulam as semanas más.
 */
const RIR_PARA_PROGREDIR = 3;

/** Incremento discreto. O objetivo é a semana seguinte, não a sessão de hoje. */
const PASSO_DE_PROGRESSAO = 0.025;

export function suggest(
  last: LastPerformance | null,
  readiness: ReadinessAdjust | null,
  porTempo: boolean,
): Suggestion {
  if (!last) {
    return {
      weightKg: null,
      reps: null,
      durationS: null,
      basis: "primeira",
      last: null,
    };
  }

  const loadDelta = readiness?.loadDelta ?? 0;
  const diaLimpo = (readiness?.rirDelta ?? 0) === 0;

  // Num dia em que a prontidão pede contenção não se progride, mesmo que a
  // última série tenha sobrado. As duas regras puxavam para lados opostos e
  // quem ganha é a que protege.
  const progride =
    diaLimpo && last.rir != null && last.rir >= RIR_PARA_PROGREDIR;

  const basis: Basis = progride ? "progride" : loadDelta < 0 ? "prontidao" : "repete";

  if (porTempo) {
    const base = last.durationS ?? 0;
    if (base <= 0) {
      return { weightKg: null, reps: null, durationS: null, basis: "primeira", last };
    }
    return {
      weightKg: null,
      reps: null,
      durationS: roundDuration(base * (1 + loadDelta)),
      basis,
      last,
    };
  }

  const base = last.weightKg;
  if (base == null || base <= 0) {
    // Peso do corpo: não há carga para subir, por isso progredir é fazer mais
    // uma repetição. Sem isto o exercício ficava preso no mesmo número para
    // sempre e a pessoa não tinha para onde ir.
    return {
      weightKg: null,
      reps: progride && last.reps != null ? last.reps + 1 : last.reps,
      durationS: null,
      basis,
      last,
    };
  }

  const comProgressao = base * (progride ? 1 + PASSO_DE_PROGRESSAO : 1);
  let weightKg = roundLoad(comProgressao * (1 + loadDelta));

  // Garante que dizer "progride" corresponde a um número diferente.
  if (progride && weightKg <= base) weightKg = roundLoad(nextStepUp(base));

  return { weightKg, reps: last.reps, durationS: null, basis, last };
}
