"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ReadinessAnswers, ReadinessResult } from "@/lib/readiness/score";
import { localDate } from "@/lib/workout/periods";

/**
 * Grava o registo de prontidão do dia. Um por dia local: voltar a submeter
 * substitui o anterior, para quem se enganou poder corrigir.
 */
export async function saveReadinessAction({
  answers,
  result,
}: {
  answers: ReadinessAnswers;
  result: ReadinessResult;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();

  const hoje = localDate(new Date(), profile?.timezone ?? "Europe/Lisbon");

  await supabase.from("readiness_checkins").upsert(
    {
      user_id: user.id,
      local_date: hoje,
      sleep_hours: answers.sleepHours,
      sleep_quality: answers.sleepQuality,
      fatigue: answers.energy,
      soreness: answers.soreness,
      sore_muscles: answers.soreMuscles,
      resting_hr: answers.restingHr,
      score: result.score,
      state: result.state,
      drivers: result.drivers,
    },
    { onConflict: "user_id,local_date" },
  );

  revalidatePath("/", "layout");
}
