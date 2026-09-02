"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type DeleteExerciseResult =
  | { ok: true; sets: number; sessions: number }
  | { ok: false };

/**
 * Apaga todas as séries de um exercício. Apagamento real, não marcação: são
 * dados de treino da própria pessoa e o pedido é "recomeçar do zero". A
 * função da base de dados corre com as permissões de quem chama, por isso
 * só apaga o que a política de RLS já lhe deixava apagar.
 */
export async function deleteExerciseHistoryAction(input: {
  exerciseId: string | null;
  exerciseName: string;
}): Promise<DeleteExerciseResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const nome = String(input?.exerciseName ?? "").slice(0, 200);
  if (!nome) return { ok: false };

  const { data, error } = await supabase.rpc("apagar_registos_exercicio", {
    p_exercise_id: input.exerciseId ?? null,
    p_exercise_name: nome,
  });
  if (error) {
    console.error("[histórico] falha a apagar exercício", error.message);
    return { ok: false };
  }

  const linha = Array.isArray(data) ? data[0] : data;
  revalidatePath("/", "layout");
  return {
    ok: true,
    sets: Number(linha?.sets_apagados ?? 0),
    sessions: Number(linha?.sessoes_apagadas ?? 0),
  };
}
