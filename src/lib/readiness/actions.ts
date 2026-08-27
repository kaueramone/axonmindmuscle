"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  computeReadiness,
  type ReadinessAnswers,
  type ReadinessContext,
  type ReadinessResult,
} from "@/lib/readiness/score";
import type { MuscleGroup } from "@/lib/supabase/types";
import { localDate } from "@/lib/workout/periods";

const MUSCULOS: MuscleGroup[] = [
  "peito", "costas", "ombros", "biceps", "triceps", "antebraco", "abdomen",
  "quadriceps", "isquiotibiais", "gluteos", "gemeos", "lombar", "corpo_inteiro",
];

/**
 * Os tipos de TypeScript desaparecem na compilacao: o que chega aqui e o que
 * o browser quis enviar. Cada campo e trazido para dentro do seu intervalo em
 * vez de ser recusado — quem se engana a escrever as horas de sono nao merece
 * um erro, merece um numero possivel.
 */
function inteiroEntre(valor: unknown, min: number, max: number): number | null {
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function decimalEntre(valor: unknown, min: number, max: number): number | null {
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
}

function limparRespostas(bruto: ReadinessAnswers): ReadinessAnswers {
  const musculos = Array.isArray(bruto?.soreMuscles) ? bruto.soreMuscles : [];

  return {
    sleepHours: bruto?.sleepHours == null ? null : decimalEntre(bruto.sleepHours, 0, 24),
    sleepQuality: bruto?.sleepQuality == null ? null : inteiroEntre(bruto.sleepQuality, 1, 5),
    energy: bruto?.energy == null ? null : inteiroEntre(bruto.energy, 1, 5),
    soreness: bruto?.soreness == null ? null : inteiroEntre(bruto.soreness, 1, 5),
    // Lista fechada e sem repetidos: o que nao e um grupo muscular conhecido
    // nao entra na coluna, e um pedido com mil entradas nao enche a linha.
    soreMuscles: [...new Set(musculos)]
      .filter((m): m is MuscleGroup => MUSCULOS.includes(m as MuscleGroup))
      .slice(0, MUSCULOS.length),
    // Limites fisiologicos largos de proposito: 25 e bradicardia de atleta,
    // 220 e taquicardia. Fora disto e engano de digitacao ou pedido forjado.
    restingHr: bruto?.restingHr == null ? null : inteiroEntre(bruto.restingHr, 25, 220),
  };
}

/**
 * Grava o registo de prontidao do dia. Um por dia local: voltar a submeter
 * substitui o anterior, para quem se enganou poder corrigir.
 *
 * A pontuacao e calculada AQUI, no servidor, a partir do contexto que a base
 * de dados devolve. Antes vinha ja feita do browser e era gravada tal e qual:
 * bastava um pedido forjado para escrever uma prontidao de 100 num dia sem
 * dormir — e como este numero alimenta a sugestao de carga e o relatorio, a
 * pessoa acabava a treinar com base num numero que nao mediu nada.
 */
export async function saveReadinessAction({
  answers,
}: {
  answers: ReadinessAnswers;
}): Promise<ReadinessResult | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const respostas = limparRespostas(answers);

  const [{ data: profile }, { data: contexto }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    supabase.rpc("readiness_context"),
  ]);

  const linha = Array.isArray(contexto) ? contexto[0] : contexto;

  const context: ReadinessContext = {
    baselineRestingHr: linha?.baseline_resting_hr ?? null,
    baselineSleepHours: linha?.baseline_sleep_hours ?? null,
    baselineDays: linha?.baseline_days ?? 0,
    daysSinceLastSession: linha?.days_since_last_session ?? null,
    consecutiveDays: linha?.consecutive_days ?? 0,
    setsLast7: linha?.sets_last_7 ?? 0,
    avgWeeklySets: Number(linha?.avg_weekly_sets ?? 0),
    recentMuscles: linha?.recent_muscles ?? [],
  };

  const result = computeReadiness(respostas, context);

  const hoje = localDate(new Date(), profile?.timezone ?? "Europe/Lisbon");

  const { error } = await supabase.from("readiness_checkins").upsert(
    {
      user_id: user.id,
      local_date: hoje,
      sleep_hours: respostas.sleepHours,
      sleep_quality: respostas.sleepQuality,
      fatigue: respostas.energy,
      soreness: respostas.soreness,
      sore_muscles: respostas.soreMuscles,
      resting_hr: respostas.restingHr,
      score: result.score,
      state: result.state,
      drivers: result.drivers,
    },
    { onConflict: "user_id,local_date" },
  );

  if (error) {
    console.error("[prontidão] falha a gravar", error.message);
    return null;
  }

  revalidatePath("/", "layout");
  return result;
}
