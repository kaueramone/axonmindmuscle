import { NextResponse, type NextRequest } from "next/server";

import { toCsv } from "@/lib/export/csv";
import { makeZip, type ZipEntry } from "@/lib/export/zip";
import { createClient } from "@/lib/supabase/server";

/**
 * "Os teus dados são teus" — a rota que torna a frase verdadeira.
 *
 * Gratuita e sem depender do plano. Pôr isto atrás do PRO partiria a promessa
 * e, para quem vende na União Europeia, também o artigo 20.º do RGPD, que já
 * obriga a entregar os dados num formato legível por máquina a quem os pedir.
 *
 * Dois formatos: `csv` dá um arquivo com um ficheiro por tabela, para abrir
 * numa folha de cálculo; `json` dá o mesmo conteúdo num só ficheiro, para
 * quem quiser levar tudo de uma vez.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** O Supabase devolve mil linhas de cada vez. Quem treina há anos tem mais. */
const PAGINA = 1000;

type Cliente = Awaited<ReturnType<typeof createClient>>;

async function todasAsLinhas(
  supabase: Cliente,
  tabela: "workout_sessions" | "workout_sets" | "readiness_checkins" | "subscriptions",
  ordem: string,
): Promise<Record<string, unknown>[]> {
  const tudo: Record<string, unknown>[] = [];

  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await supabase
      .from(tabela)
      .select("*")
      .order(ordem, { ascending: true })
      .range(inicio, inicio + PAGINA - 1);

    // Uma exportação incompleta é pior do que nenhuma: a pessoa levava um
    // ficheiro a menos e não tinha como saber.
    if (error) throw new Error(`${tabela}: ${error.message}`);
    if (!data || data.length === 0) break;

    tudo.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGINA) break;
  }

  return tudo;
}

const LEIA_ME = `AXON Mind-Muscle — exportação de dados

Estes dados são teus. Levas-os para onde quiseres, e continuas a poder
pedi-los enquanto a conta existir.

  perfil.csv       Os teus dados de conta e calibração
  sessoes.csv      Cada treino: início, fim e esforço da sessão
  series.csv       Cada série: exercício, carga, repetições, RIR, tempo
  prontidao.csv    O registo diário de prontidão
  subscricoes.csv  O histórico de subscrição, se existir

Os ficheiros abrem no Excel, no Numbers e no Google Sheets. O separador é
o ponto e vírgula, indicado na primeira linha de cada ficheiro.

Se um dia decidires apagar a conta, o histórico continua a poder ser
exportado durante três meses antes de ser apagado em definitivo.

Exportado em: {DATA}
`;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "sem sessão" }, { status: 401 });
  }

  const formato = request.nextUrl.searchParams.get("formato") === "json" ? "json" : "csv";
  const agora = new Date();
  const carimbo = agora.toISOString().slice(0, 10);

  try {
    const [{ data: perfil }, sessoes, series, prontidao, subscricoes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        todasAsLinhas(supabase, "workout_sessions", "started_at"),
        todasAsLinhas(supabase, "workout_sets", "completed_at"),
        todasAsLinhas(supabase, "readiness_checkins", "local_date"),
        todasAsLinhas(supabase, "subscriptions", "created_at"),
      ]);

    const perfilLinhas = perfil ? [perfil as Record<string, unknown>] : [];

    if (formato === "json") {
      const corpo = JSON.stringify(
        {
          exportado_em: agora.toISOString(),
          aplicacao: "AXON Mind-Muscle",
          perfil: perfil ?? null,
          sessoes,
          series,
          prontidao,
          subscricoes,
        },
        null,
        2,
      );

      return new NextResponse(corpo, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="axon-${carimbo}.json"`,
          "cache-control": "no-store",
        },
      });
    }

    const entradas: ZipEntry[] = [
      { name: "leia-me.txt", content: LEIA_ME.replace("{DATA}", agora.toISOString()) },
      { name: "perfil.csv", content: toCsv(perfilLinhas) },
      { name: "sessoes.csv", content: toCsv(sessoes) },
      { name: "series.csv", content: toCsv(series) },
      { name: "prontidao.csv", content: toCsv(prontidao) },
      { name: "subscricoes.csv", content: toCsv(subscricoes) },
    ];

    const zip = makeZip(entradas, agora);

    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="axon-${carimbo}.zip"`,
        "content-length": String(zip.length),
        "cache-control": "no-store",
      },
    });
  } catch (erro) {
    console.error("[exportar] falhou", erro);
    return NextResponse.json({ error: "exportação falhou" }, { status: 500 });
  }
}
