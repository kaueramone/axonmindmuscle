import { A4, Pagina, makePdf, type Cor } from "@/lib/export/pdf";

/**
 * O relatório de evolução.
 *
 * É a única peça desta família que se pode cobrar sem contradizer a promessa
 * de que os dados são da pessoa: os CSV e o backup são os dados dela, isto é
 * trabalho feito por cima deles.
 */

const TINTA: Cor = [0.06, 0.08, 0.11];
const SUAVE: Cor = [0.42, 0.47, 0.54];
const TENUE: Cor = [0.87, 0.89, 0.92];
const IMPULSO: Cor = [0.17, 0.39, 0.91];
const MARGEM = 48;
const LARGURA_UTIL = A4.largura - MARGEM * 2;

export type ResumoRelatorio = {
  nome: string;
  de: string;
  ate: string;
  sessoes: number;
  volumeTotal: number;
  minutos: number;
  esforcoMedio: number | null;
  diasProntidao: number;
};

export type SemanaVolume = { semana: string; volume: number };
export type ProgressoExercicio = {
  exercicio: string;
  pontos: { semana: string; carga: number }[];
  melhorCarga: number;
  melhorReps: number | null;
  volume: number;
};
export type FatiaMusculo = { musculo: string; series: number };
export type FatiaProntidao = { estado: string; dias: number };

export type DadosRelatorio = {
  resumo: ResumoRelatorio;
  semanas: SemanaVolume[];
  exercicios: ProgressoExercicio[];
  musculos: FatiaMusculo[];
  prontidao: FatiaProntidao[];
  rodape: string;
};

function nf(locale: string, casas = 0) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: casas });
}

/** Cabeçalho comum às páginas, para o documento não parecer folhas soltas. */
function cabecalho(p: Pagina, titulo: string, subtitulo: string) {
  p.texto("AXON MIND-MUSCLE", MARGEM, 52, { tamanho: 8, negrito: true, cor: IMPULSO });
  p.texto(titulo, MARGEM, 82, { tamanho: 23, negrito: true });
  p.texto(subtitulo, MARGEM, 104, { tamanho: 10.5, cor: SUAVE });
  p.linha(MARGEM, 120, A4.largura - MARGEM, 120, TENUE);
}

function titulo(p: Pagina, texto: string, y: number) {
  p.texto(texto, MARGEM, y, { tamanho: 13, negrito: true });
}

/**
 * Barras verticais com eixo. Sem grelha densa nem rótulos em todas as barras:
 * num relatório impresso, o que se procura é a forma da série.
 */
function graficoBarras(
  p: Pagina,
  valores: { rotulo: string; valor: number }[],
  y: number,
  altura: number,
  locale: string,
) {
  if (valores.length === 0) return;
  const max = Math.max(...valores.map((v) => v.valor), 1);
  const base = y + altura;
  const passo = LARGURA_UTIL / valores.length;
  const largura = Math.min(passo * 0.62, 34);

  p.linha(MARGEM, base, A4.largura - MARGEM, base, TENUE);

  valores.forEach((v, i) => {
    const h = (v.valor / max) * (altura - 16);
    const x = MARGEM + i * passo + (passo - largura) / 2;
    if (h > 0) p.retangulo(x, base - h, largura, h, IMPULSO);
    // Rótulos alternados quando são muitos, para não colidirem.
    const mostra = valores.length <= 14 || i % 2 === 0;
    if (mostra) {
      p.texto(v.rotulo, x, base + 12, { tamanho: 7, cor: SUAVE });
    }
  });

  p.texto(nf(locale).format(max), MARGEM, y + 8, { tamanho: 8, cor: SUAVE });
}

/** Curva de carga de um exercício. */
function grafico(
  p: Pagina,
  serie: { semana: string; carga: number }[],
  y: number,
  altura: number,
  locale: string,
) {
  if (serie.length === 0) return;
  const cargas = serie.map((s) => s.carga);
  const max = Math.max(...cargas);
  const min = Math.min(...cargas);
  const amplitude = max - min || 1;
  const base = y + altura;

  p.linha(MARGEM, base, A4.largura - MARGEM, base, TENUE);

  const pontos: [number, number][] = serie.map((s, i) => {
    const x =
      serie.length === 1
        ? MARGEM + LARGURA_UTIL / 2
        : MARGEM + (i / (serie.length - 1)) * LARGURA_UTIL;
    const alturaPonto = base - 12 - ((s.carga - min) / amplitude) * (altura - 26);
    return [x, alturaPonto];
  });

  p.polilinha(pontos, IMPULSO);
  pontos.forEach(([x, py]) => p.ponto(x, py, 2.4, IMPULSO));

  p.texto(`${nf(locale, 1).format(min)} kg`, MARGEM, base + 12, { tamanho: 8, cor: SUAVE });
  p.textoDireita(`${nf(locale, 1).format(max)} kg`, A4.largura - MARGEM, base + 12, {
    tamanho: 8,
    cor: SUAVE,
    negrito: true,
  });
}

export function buildReport(dados: DadosRelatorio, locale: string): Buffer {
  const n = nf(locale);
  const paginas: Pagina[] = [];

  /* ---------------- Página 1: resumo e volume ---------------- */
  const p1 = new Pagina();
  cabecalho(p1, "Relatório de evolução", `${dados.resumo.nome} · ${dados.resumo.de} a ${dados.resumo.ate}`);

  const cartoes: [string, string][] = [
    ["Treinos", n.format(dados.resumo.sessoes)],
    ["Volume total", `${n.format(dados.resumo.volumeTotal)} kg`],
    ["Tempo", `${n.format(dados.resumo.minutos)} min`],
    [
      "Esforço médio",
      dados.resumo.esforcoMedio != null ? nf(locale, 1).format(dados.resumo.esforcoMedio) : "—",
    ],
  ];

  const largCartao = LARGURA_UTIL / cartoes.length;
  cartoes.forEach(([rotulo, valor], i) => {
    const x = MARGEM + i * largCartao;
    p1.texto(rotulo.toUpperCase(), x, 152, { tamanho: 7.5, cor: SUAVE, negrito: true });
    p1.texto(valor, x, 176, { tamanho: 17, negrito: true });
  });
  p1.linha(MARGEM, 196, A4.largura - MARGEM, 196, TENUE);

  titulo(p1, "Volume por semana", 228);
  p1.texto("Peso movido em cada semana, em quilos.", MARGEM, 244, { tamanho: 9, cor: SUAVE });
  graficoBarras(
    p1,
    dados.semanas.map((s) => ({ rotulo: s.semana, valor: s.volume })),
    258,
    170,
    locale,
  );

  titulo(p1, "Séries por grupo muscular", 486);
  let yMusc = 508;
  const maxSeries = Math.max(...dados.musculos.map((m) => m.series), 1);
  for (const m of dados.musculos.slice(0, 8)) {
    const larguraBarra = (m.series / maxSeries) * (LARGURA_UTIL - 190);
    p1.texto(m.musculo, MARGEM, yMusc + 8, { tamanho: 9.5 });
    p1.retangulo(MARGEM + 140, yMusc, larguraBarra, 11, IMPULSO);
    p1.textoDireita(n.format(m.series), A4.largura - MARGEM, yMusc + 8, {
      tamanho: 9.5,
      cor: SUAVE,
    });
    yMusc += 22;
  }

  if (dados.prontidao.length > 0) {
    titulo(p1, "Como chegaste ao treino", yMusc + 24);
    let yPront = yMusc + 46;
    for (const f of dados.prontidao) {
      p1.texto(f.estado, MARGEM, yPront, { tamanho: 9.5 });
      p1.textoDireita(`${n.format(f.dias)} dias`, A4.largura - MARGEM, yPront, {
        tamanho: 9.5,
        cor: SUAVE,
      });
      yPront += 18;
    }
  }

  p1.texto(dados.rodape, MARGEM, A4.altura - 40, { tamanho: 7.5, cor: SUAVE });
  paginas.push(p1);

  /* ---------------- Páginas seguintes: exercícios ---------------- */
  const porPagina = 3;
  for (let i = 0; i < dados.exercicios.length; i += porPagina) {
    const p = new Pagina();
    cabecalho(p, "Evolução por exercício", "Carga máxima de cada semana");

    let y = 156;
    for (const ex of dados.exercicios.slice(i, i + porPagina)) {
      titulo(p, ex.exercicio, y);
      const marca =
        ex.melhorReps != null
          ? `Melhor marca: ${nf(locale, 1).format(ex.melhorCarga)} kg × ${ex.melhorReps}`
          : `Melhor marca: ${nf(locale, 1).format(ex.melhorCarga)} kg`;
      p.texto(marca, MARGEM, y + 16, { tamanho: 9, cor: SUAVE });
      grafico(p, ex.pontos, y + 30, 130, locale);
      y += 216;
    }

    p.texto(dados.rodape, MARGEM, A4.altura - 40, { tamanho: 7.5, cor: SUAVE });
    paginas.push(p);
  }

  return makePdf(paginas, `AXON — relatório de ${dados.resumo.nome}`);
}
