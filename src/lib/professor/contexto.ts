import "server-only";

import type { Dict } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import { presentReadiness } from "@/lib/readiness/present";
import type { ReadinessResult } from "@/lib/readiness/score";
import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { isoWeekday, localDate } from "@/lib/workout/periods";

import type { ContextoUtilizador } from "./prompt";

type Cliente = Awaited<ReturnType<typeof createClient>>;
type Perfil = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "display_name" | "experience" | "goal" | "weekly_frequency" | "timezone"
>;

const EXPERIENCIA: Record<Locale, Record<string, string>> = {
  "pt-pt": { beginner: "iniciante", intermediate: "intermédio", advanced: "avançado" },
  "pt-br": { beginner: "iniciante", intermediate: "intermediário", advanced: "avançado" },
};

const OBJETIVO: Record<string, string> = {
  hypertrophy: "hipertrofia",
  strength: "força",
  endurance: "resistência muscular",
  health: "saúde geral",
};

/**
 * Reúne o que o Professor precisa de saber sobre a pessoa para responder ao
 * "e hoje?" sem lhe pedir para repetir o que a aplicação já sabe.
 *
 * Tudo o que sai daqui já é texto na língua da pessoa, produzido pelas mesmas
 * funções que a interface usa (`presentReadiness`, etiquetas do dicionário).
 * Assim o Professor fala da prontidão com as mesmas palavras que a pessoa viu
 * no painel, e não há duas traduções do mesmo estado a divergir.
 *
 * A prontidão só chega aqui se a pessoa a registou hoje, e registar exige o
 * consentimento explícito que a base de dados impõe no INSERT. Não há leitura
 * de sinais em bruto: segue o estado, a frase e a decisão, não os batimentos.
 */
export async function reunirContexto(
  supabase: Cliente,
  userId: string,
  locale: Locale,
  dict: Dict,
  perfil: Perfil | null,
): Promise<ContextoUtilizador> {
  const timezone = perfil?.timezone ?? "Europe/Lisbon";
  const agora = new Date();
  const hoje = localDate(agora, timezone);
  const diaSemana = isoWeekday(agora, timezone);

  const [{ data: registo }, { data: rotinas }] = await Promise.all([
    supabase
      .from("readiness_checkins")
      .select("score, state, drivers, sore_muscles")
      .eq("user_id", userId)
      .eq("local_date", hoje)
      .maybeSingle(),
    supabase
      .from("routines")
      .select("id, name")
      .eq("user_id", userId)
      .is("archived_at", null)
      .contains("weekdays", [diaSemana])
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  let prontidao: ContextoUtilizador["prontidao"] = null;
  if (registo) {
    const resultado: ReadinessResult = {
      score: registo.score,
      state: registo.state,
      drivers: (registo.drivers ?? []) as ReadinessResult["drivers"],
      avoidMuscles: registo.sore_muscles ?? [],
      needsBaseline: false,
    };
    const apresentado = presentReadiness(resultado, dict.readiness);
    const musculos = dict.app.progress.muscles as Record<string, string>;
    prontidao = {
      estado: apresentado.state,
      resumo: apresentado.summary,
      decisao: apresentado.decision,
      poupar: resultado.avoidMuscles.map((m) => musculos[m] ?? m),
    };
  }

  let rotinaDeHoje: ContextoUtilizador["rotinaDeHoje"] = null;
  const rotina = rotinas?.[0];
  if (rotina) {
    // Os nomes vivem na tabela de traduções; duas consultas pequenas em vez de
    // um join, como no resto da aplicação.
    const { data: linhas } = await supabase
      .from("routine_exercises")
      .select("exercise_id, position")
      .eq("routine_id", rotina.id)
      .order("position", { ascending: true })
      .limit(20);

    const ids = (linhas ?? []).map((l) => l.exercise_id);
    let nomes: string[] = [];
    if (ids.length > 0) {
      const { data: traducoes } = await supabase
        .from("exercise_translations")
        .select("exercise_id, name")
        .eq("locale", locale)
        .in("exercise_id", ids);
      const porId = new Map((traducoes ?? []).map((t) => [t.exercise_id, t.name]));
      nomes = ids.map((id) => porId.get(id)).filter((n): n is string => !!n);
    }
    rotinaDeHoje = { nome: rotina.name, exercicios: nomes };
  }

  return {
    nome: perfil?.display_name?.trim().split(/\s+/)[0] ?? null,
    experiencia: perfil?.experience ? EXPERIENCIA[locale][perfil.experience] ?? null : null,
    objetivo: perfil?.goal ? OBJETIVO[perfil.goal] ?? null : null,
    frequenciaSemanal: perfil?.weekly_frequency ?? null,
    prontidao,
    rotinaDeHoje,
  };
}
