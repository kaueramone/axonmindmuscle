"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type RoutineResult = { ok: boolean; id?: string; error?: string };

/**
 * Guarda um treino já feito como rotina.
 *
 * Deliberadamente não há editor de rotinas. Construir um treino num formulário
 * antes de o fazer é trabalho a mais e, pior, é adivinhar: os alvos saem do que
 * a pessoa realmente conseguiu, não do que planeou numa segunda-feira. Treina
 * uma vez, guarda, e a partir daí há um eixo para comparar.
 */
export async function saveRoutineFromSessionAction(
  sessionId: string,
  nome: string,
): Promise<RoutineResult> {
  const limpo = nome.trim().slice(0, 60);
  if (limpo.length < 1) return { ok: false, error: "nome" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sessao" };

  const { data: sessao } = await supabase
    .from("workout_sessions")
    .select("id, routine_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sessao) return { ok: false, error: "sessao" };
  if (sessao.routine_id) return { ok: false, error: "jaTem" };

  const { data: series } = await supabase
    .from("workout_sets")
    .select("exercise_id, position, reps, duration_s")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .not("exercise_id", "is", null)
    .order("position", { ascending: true });

  if (!series || series.length === 0) return { ok: false, error: "vazia" };

  // A ordem é a da primeira aparição — é a ordem por que a pessoa treinou, e
  // é a que ela espera encontrar da próxima vez.
  const porExercicio = new Map<
    string,
    { series: number; reps: number[]; duracoes: number[] }
  >();

  for (const s of series) {
    const id = s.exercise_id as string;
    const atual = porExercicio.get(id) ?? { series: 0, reps: [], duracoes: [] };
    atual.series += 1;
    if (s.reps != null) atual.reps.push(s.reps);
    if (s.duration_s != null) atual.duracoes.push(s.duration_s);
    porExercicio.set(id, atual);
  }

  const { data: rotina, error: erroRotina } = await supabase
    .from("routines")
    .insert({ user_id: user.id, name: limpo })
    .select("id")
    .single();

  if (erroRotina || !rotina) {
    console.error("[rotinas] falha a criar", erroRotina?.message);
    return { ok: false, error: "generico" };
  }

  const linhas = [...porExercicio.entries()].map(([exerciseId, dados], indice) => ({
    routine_id: rotina.id,
    exercise_id: exerciseId,
    position: indice,
    target_sets: dados.series,
    // A mediana e não a média: uma série falhada no fim não deve puxar o alvo
    // para baixo em todas as semanas seguintes.
    target_reps: mediana(dados.reps),
    target_duration_s: mediana(dados.duracoes),
  }));

  const { error: erroLinhas } = await supabase
    .from("routine_exercises")
    .insert(linhas);

  if (erroLinhas) {
    // Sem exercícios a rotina não serve para nada; deixá-la meio feita seria
    // pior do que não a ter.
    await supabase.from("routines").delete().eq("id", rotina.id);
    console.error("[rotinas] falha a gravar exercícios", erroLinhas.message);
    return { ok: false, error: "generico" };
  }

  // A sessão que deu origem à rotina passa a contar como a primeira semana.
  // Sem isto, a comparação começava vazia e só ganhava sentido daí a duas
  // semanas — que é quando a pessoa já desistiu de olhar.
  await supabase
    .from("workout_sessions")
    .update({ routine_id: rotina.id })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  revalidatePath("/", "layout");
  return { ok: true, id: rotina.id };
}

/** Arquivar, nunca apagar: o histórico feito continua a ser comparável. */
export async function archiveRoutineAction(id: string): Promise<RoutineResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sessao" };

  const { error } = await supabase
    .from("routines")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "generico" };

  revalidatePath("/", "layout");
  return { ok: true };
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 1
    ? ordenados[meio]
    : Math.round((ordenados[meio - 1] + ordenados[meio]) / 2);
}
