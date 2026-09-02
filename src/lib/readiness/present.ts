import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";

import { prescriptionFor, type Driver, type ReadinessResult } from "./score";

/**
 * Da pontuação à frase.
 *
 * O modelo devolve um número, um estado e uma lista de fatores. Mostrar isso
 * tal e qual obriga a pessoa a fazer a leitura sozinha — e é exatamente a
 * queixa que os utilizadores de outras aplicações fazem: dez métricas e
 * nenhuma resposta. A ordem aqui é a inversa: primeiro a decisão, depois o
 * significado numa frase, e os sinais só para quem os quiser ver.
 *
 * Partilhado entre o painel (cliente) e a página inicial (servidor), por isso
 * não importa nada de `server-only`.
 */

export type TrendLine = {
  key: string;
  direction: Driver["direction"];
  label: string;
  /** "↓ 1,4 h vs. o teu habitual"; vazio quando o fator não tem medida. */
  trend: string;
};

export type Presented = {
  /** "Boa", "Moderada", "Em recuperação". */
  state: string;
  /** Uma frase com os fatores que mais pesaram. */
  summary: string;
  /** O que fazer no treino de hoje, em texto. */
  decision: string;
  /** Ajuste numérico, para quem quiser ver o mecanismo. */
  loadPct: number;
  rirDelta: number;
  trends: TrendLine[];
};

type Copy = Dict["readiness"];

/** Primeira letra minúscula, para encadear duas frases curtas numa só. */
function minuscula(texto: string): string {
  return texto.charAt(0).toLocaleLowerCase("pt") + texto.slice(1);
}

function chaveDoFator(d: Driver): keyof Copy["why"] {
  if (d.key === "energy" && d.direction === "up") return "energyUp";
  if (d.key === "sleepQuality" && d.direction === "up") return "sleepQualityUp";
  return d.key as keyof Copy["why"];
}

/**
 * O detalhe vem gravado como "-1.4 h", "+6 bpm", "62%", "5". O sinal já está
 * dito pela seta do texto; o que fica é o valor, com vírgula decimal.
 */
function valorDoDetalhe(detail: string | undefined): string {
  if (!detail) return "";
  return detail.replace(/^[+-]/, "").replace(".", ",");
}

export function presentReadiness(result: ReadinessResult, copy: Copy): Presented {
  const receita = prescriptionFor(result.state);

  const trends: TrendLine[] = [];
  for (const d of result.drivers) {
    const chave = chaveDoFator(d);
    const label = copy.why[chave];
    if (!label) continue;
    const modelo = copy.trend[d.key as keyof Copy["trend"]];
    trends.push({
      key: d.key + d.direction,
      direction: d.direction,
      label,
      trend: modelo && d.detail ? t(modelo, { value: valorDoDetalhe(d.detail) }) : "",
    });
  }

  // A frase pega nos dois fatores mais relevantes para o estado: o que puxou
  // para baixo quando a prontidão não é boa, o que puxou para cima quando é.
  // Os fatores vêm do modelo já por ordem de peso.
  const relevantes = trends.filter((l) =>
    result.state === "strong" ? l.direction === "up" : l.direction === "down",
  );
  const escolhidos = (relevantes.length > 0 ? relevantes : trends).slice(0, 2);

  let summary: string;
  if (escolhidos.length === 0) {
    summary = result.needsBaseline ? copy.summaryNoBaseline : copy.summaryNeutral;
  } else if (escolhidos.length === 1) {
    summary = `${escolhidos[0].label}.`;
  } else {
    summary = `${escolhidos[0].label}${copy.summaryJoin}${minuscula(escolhidos[1].label)}.`;
  }

  return {
    state: copy.states[result.state],
    summary,
    decision: copy.decision[result.state],
    loadPct: Math.round(receita.loadDelta * 1000) / 10,
    rirDelta: receita.rirDelta,
    trends,
  };
}
