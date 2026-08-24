import { NextResponse, type NextRequest } from "next/server";

import { buildReport, type DadosRelatorio } from "@/lib/export/report";
import { marketByLocale, isLocale, defaultLocale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

/**
 * O relatório de evolução, em PDF.
 *
 * Esta é a única peça da família de exportação que fica atrás do PRO, e a
 * distinção é deliberada: os CSV e o backup são os dados da pessoa e saem
 * sempre; isto é trabalho feito por cima deles.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const ESTADOS: Record<string, string> = {
  strong: "Em condições",
  moderate: "Moderado",
  rest: "Recuperação",
};

function porExtenso(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

function curto(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()].slice(0, 3)}`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sem sessão" }, { status: 401 });

  const { data: perfil } = await supabase
    .from("profiles")
    .select("display_name, plan, locale")
    .eq("id", user.id)
    .maybeSingle();

  // A porta do PRO. Devolve 402 e não 403: não é falta de permissão, é falta
  // de plano, e a página trata os dois de maneira diferente.
  if (perfil?.plan !== "pro") {
    return NextResponse.json({ error: "plano" }, { status: 402 });
  }

  const meses = Number(request.nextUrl.searchParams.get("meses") ?? 6);
  const ate = new Date();
  const de = new Date(ate);
  de.setMonth(de.getMonth() - (Number.isFinite(meses) && meses > 0 ? Math.min(meses, 24) : 6));

  const from = de.toISOString().slice(0, 10);
  const to = ate.toISOString().slice(0, 10);

  const locale = isLocale(perfil?.locale) ? perfil.locale : defaultLocale;
  const intl = marketByLocale[locale].intl;

  try {
    const [carga, musculos, prontidao, exercicios, esforco] = await Promise.all([
      supabase.rpc("training_load_summary", { p_from: from, p_to: to }),
      supabase.rpc("training_sets_by_muscle", { p_from: from, p_to: to }),
      supabase.rpc("readiness_summary", { p_from: from, p_to: to }),
      supabase.rpc("exercise_progress", { p_from: from, p_to: to }),
      supabase
        .from("workout_sessions")
        .select("rpe")
        .eq("user_id", user.id)
        .not("rpe", "is", null)
        .gte("started_at", `${from}T00:00:00Z`),
    ]);

    const rpes = (esforco.data ?? []).map((s) => s.rpe).filter((r): r is number => r != null);
    const esforcoMedio =
      rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;

    const dias = carga.data ?? [];
    const sessoes = dias.reduce((n, d) => n + (d.sessoes ?? 0), 0);
    const minutos = dias.reduce((n, d) => n + (d.minutos ?? 0), 0);
    const volumeTotal = (musculos.data ?? []).reduce((n, m) => n + (m.volume_kg ?? 0), 0);

    // Volume por semana, a partir do diário. A semana começa à segunda, como
    // no resto do produto.
    const porSemana = new Map<string, number>();
    for (const d of dias) {
      const data = new Date(`${d.dia}T12:00:00Z`);
      const diaDaSemana = (data.getUTCDay() + 6) % 7;
      data.setUTCDate(data.getUTCDate() - diaDaSemana);
      const chave = data.toISOString().slice(0, 10);
      porSemana.set(chave, (porSemana.get(chave) ?? 0) + (d.carga ?? 0));
    }

    // Os exercícios que valem uma página são os que a pessoa mais treinou.
    const porExercicio = new Map<
      string,
      { pontos: { semana: string; carga: number }[]; volume: number; melhor: number; reps: number | null }
    >();
    for (const linha of exercicios.data ?? []) {
      const atual = porExercicio.get(linha.exercicio) ?? {
        pontos: [],
        volume: 0,
        melhor: 0,
        reps: null,
      };
      if (linha.carga_maxima != null) {
        atual.pontos.push({ semana: curto(linha.semana), carga: linha.carga_maxima });
        if (linha.carga_maxima > atual.melhor) {
          atual.melhor = linha.carga_maxima;
          atual.reps = linha.reps_na_maxima;
        }
      }
      atual.volume += linha.volume ?? 0;
      porExercicio.set(linha.exercicio, atual);
    }

    const p = prontidao.data?.[0];

    const dados: DadosRelatorio = {
      resumo: {
        nome: perfil?.display_name ?? "",
        de: porExtenso(from),
        ate: porExtenso(to),
        sessoes,
        volumeTotal,
        minutos,
        esforcoMedio,
        diasProntidao: p?.dias_registados ?? 0,
      },
      semanas: [...porSemana.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([semana, volume]) => ({ semana: curto(semana), volume })),
      exercicios: [...porExercicio.entries()]
        // Uma curva com um ponto só não é uma curva.
        .filter(([, v]) => v.pontos.length >= 2)
        .sort((a, b) => b[1].volume - a[1].volume)
        .slice(0, 6)
        .map(([exercicio, v]) => ({
          exercicio,
          pontos: v.pontos,
          melhorCarga: v.melhor,
          melhorReps: v.reps,
          volume: v.volume,
        })),
      musculos: (musculos.data ?? [])
        .sort((a, b) => (b.sets ?? 0) - (a.sets ?? 0))
        .map((m) => ({ musculo: m.muscle, series: m.sets ?? 0 })),
      prontidao: p
        ? [
            { estado: ESTADOS.strong, dias: p.dias_forte ?? 0 },
            { estado: ESTADOS.moderate, dias: p.dias_moderado ?? 0 },
            { estado: ESTADOS.rest, dias: p.dias_descanso ?? 0 },
          ].filter((f) => f.dias > 0)
        : [],
      rodape:
        "Gerado pela AXON. Os teus dados são teus: podes exportá-los em bruto, a qualquer momento, na tua conta.",
    };

    const pdf = buildReport(dados, intl);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="axon-relatorio-${to}.pdf"`,
        "content-length": String(pdf.length),
        "cache-control": "no-store",
      },
    });
  } catch (erro) {
    console.error("[relatorio] falhou", erro);
    return NextResponse.json({ error: "relatório falhou" }, { status: 500 });
  }
}
