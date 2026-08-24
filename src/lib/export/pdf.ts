import { deflateSync } from "node:zlib";

/**
 * Escritor de PDF mínimo, sem dependências.
 *
 * Mesma razão do ZIP: uma biblioteca de PDF traz megabytes e uma superfície de
 * manutenção para produzir um relatório que é texto, linhas e retângulos. Aqui
 * não há imagens nem tipos de letra embebidos — usamos as fontes base do
 * formato, que todos os leitores têm, e desenhamos os gráficos como vetores.
 *
 * A acentuação funciona porque WinAnsiEncoding cobre o Latin-1, onde vivem o
 * ã, o ç e o é. Sem isso o relatório sairia com caixas no lugar dos acentos,
 * que é a forma mais rápida de um documento parecer amador.
 */

export const A4 = { largura: 595.28, altura: 841.89 };

/** Alguns caracteres tipográficos não estão onde o Latin-1 os teria. */
const WINANSI: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84,
  "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88,
  "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c,
  "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94,
  "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98,
  "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c,
};

function paraWinAnsi(texto: string): Buffer {
  const bytes: number[] = [];
  for (const ch of texto) {
    const especial = WINANSI[ch];
    if (especial !== undefined) {
      bytes.push(especial);
      continue;
    }
    const c = ch.codePointAt(0) ?? 63;
    // Fora do Latin-1 não há representação nestas fontes; melhor um ponto de
    // interrogação visível do que um byte inválido que parte o ficheiro.
    bytes.push(c <= 0xff ? c : 63);
  }
  return Buffer.from(bytes);
}

/** Escapa o que o formato usa como delimitador dentro de uma string. */
function literal(texto: string): Buffer {
  const cru = paraWinAnsi(texto);
  const saida: number[] = [0x28]; // (
  for (const b of cru) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) saida.push(0x5c);
    saida.push(b);
  }
  saida.push(0x29); // )
  return Buffer.from(saida);
}

export type Cor = [number, number, number];

/** Uma página em construção: acumula operadores de desenho. */
export class Pagina {
  private ops: Buffer[] = [];

  private push(s: string) {
    this.ops.push(Buffer.from(s, "latin1"));
  }

  /** O eixo do PDF cresce para cima; trabalhamos de cima para baixo. */
  private y(valor: number) {
    return A4.altura - valor;
  }

  texto(
    conteudo: string,
    x: number,
    y: number,
    opcoes: { tamanho?: number; negrito?: boolean; cor?: Cor } = {},
  ) {
    const { tamanho = 10, negrito = false, cor = [0.1, 0.12, 0.16] } = opcoes;
    this.push(`BT /${negrito ? "F2" : "F1"} ${tamanho} Tf `);
    this.push(`${cor[0]} ${cor[1]} ${cor[2]} rg `);
    this.push(`1 0 0 1 ${x.toFixed(2)} ${this.y(y).toFixed(2)} Tm `);
    this.ops.push(literal(conteudo));
    this.push(" Tj ET\n");
  }

  /** Texto alinhado à direita, para colunas de números. */
  textoDireita(
    conteudo: string,
    xDireita: number,
    y: number,
    opcoes: { tamanho?: number; negrito?: boolean; cor?: Cor } = {},
  ) {
    const t = opcoes.tamanho ?? 10;
    // Largura aproximada da Helvetica: chega para alinhar números.
    const largura = conteudo.length * t * (opcoes.negrito ? 0.56 : 0.5);
    this.texto(conteudo, xDireita - largura, y, opcoes);
  }

  retangulo(x: number, y: number, w: number, h: number, cor: Cor) {
    this.push(
      `${cor[0]} ${cor[1]} ${cor[2]} rg ${x.toFixed(2)} ${this.y(y + h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`,
    );
  }

  linha(x1: number, y1: number, x2: number, y2: number, cor: Cor, espessura = 0.6) {
    this.push(
      `${cor[0]} ${cor[1]} ${cor[2]} RG ${espessura} w ${x1.toFixed(2)} ${this.y(y1).toFixed(2)} m ${x2.toFixed(2)} ${this.y(y2).toFixed(2)} l S\n`,
    );
  }

  /** Sequência de pontos ligados — a curva de evolução de uma carga. */
  polilinha(pontos: [number, number][], cor: Cor, espessura = 1.4) {
    if (pontos.length < 2) return;
    const [p0, ...resto] = pontos;
    this.push(`${cor[0]} ${cor[1]} ${cor[2]} RG ${espessura} w 1 j 1 J `);
    this.push(`${p0[0].toFixed(2)} ${this.y(p0[1]).toFixed(2)} m `);
    for (const p of resto) this.push(`${p[0].toFixed(2)} ${this.y(p[1]).toFixed(2)} l `);
    this.push("S\n");
  }

  ponto(x: number, y: number, raio: number, cor: Cor) {
    // Um círculo por quatro curvas de Bézier; k é a constante habitual.
    const k = raio * 0.5523;
    const cy = this.y(y);
    this.push(`${cor[0]} ${cor[1]} ${cor[2]} rg `);
    this.push(`${(x - raio).toFixed(2)} ${cy.toFixed(2)} m `);
    this.push(`${(x - raio).toFixed(2)} ${(cy + k).toFixed(2)} ${(x - k).toFixed(2)} ${(cy + raio).toFixed(2)} ${x.toFixed(2)} ${(cy + raio).toFixed(2)} c `);
    this.push(`${(x + k).toFixed(2)} ${(cy + raio).toFixed(2)} ${(x + raio).toFixed(2)} ${(cy + k).toFixed(2)} ${(x + raio).toFixed(2)} ${cy.toFixed(2)} c `);
    this.push(`${(x + raio).toFixed(2)} ${(cy - k).toFixed(2)} ${(x + k).toFixed(2)} ${(cy - raio).toFixed(2)} ${x.toFixed(2)} ${(cy - raio).toFixed(2)} c `);
    this.push(`${(x - k).toFixed(2)} ${(cy - raio).toFixed(2)} ${(x - raio).toFixed(2)} ${(cy - k).toFixed(2)} ${(x - raio).toFixed(2)} ${cy.toFixed(2)} c f\n`);
  }

  conteudo(): Buffer {
    return Buffer.concat(this.ops);
  }
}

export function makePdf(paginas: Pagina[], titulo: string): Buffer {
  const objetos: Buffer[] = [];
  const add = (corpo: string | Buffer): number => {
    objetos.push(typeof corpo === "string" ? Buffer.from(corpo, "latin1") : corpo);
    return objetos.length; // os objetos são numerados a partir de 1
  };

  const fonte = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fonteBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  // As páginas precisam de saber o número do seu pai, que ainda não existe;
  // reservamos o número agora e preenchemos o objeto no fim.
  const numPaginas = objetos.length + 1;
  add("");

  const idsPagina: number[] = [];
  for (const pagina of paginas) {
    const cru = pagina.conteudo();
    // zlib e não deflate cru: /FlateDecode espera o cabeçalho de dois bytes.
    // Com o deflate cru o ficheiro abre, conta as páginas certas e desenha
    // absolutamente nada — falha silenciosa, a pior espécie.
    const comprimido = deflateSync(cru);
    const fluxo = add(
      Buffer.concat([
        Buffer.from(`<< /Length ${comprimido.length} /Filter /FlateDecode >>\nstream\n`, "latin1"),
        comprimido,
        Buffer.from("\nendstream", "latin1"),
      ]),
    );
    idsPagina.push(
      add(
        `<< /Type /Page /Parent ${numPaginas} 0 R /MediaBox [0 0 ${A4.largura} ${A4.altura}] ` +
          `/Resources << /Font << /F1 ${fonte} 0 R /F2 ${fonteBold} 0 R >> >> /Contents ${fluxo} 0 R >>`,
      ),
    );
  }

  objetos[numPaginas - 1] = Buffer.from(
    `<< /Type /Pages /Count ${idsPagina.length} /Kids [${idsPagina.map((n) => `${n} 0 R`).join(" ")}] >>`,
    "latin1",
  );

  const infoId = add(`<< /Title ${literal(titulo).toString("latin1")} /Producer (AXON Mind-Muscle) >>`);
  const raiz = add(`<< /Type /Catalog /Pages ${numPaginas} 0 R >>`);

  const partes: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  let deslocamento = partes[0].length;
  const offsets: number[] = [];

  objetos.forEach((corpo, i) => {
    offsets.push(deslocamento);
    const bloco = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`, "latin1"),
      corpo,
      Buffer.from("\nendobj\n", "latin1"),
    ]);
    partes.push(bloco);
    deslocamento += bloco.length;
  });

  let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += `${String(o).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objetos.length + 1} /Root ${raiz} 0 R /Info ${infoId} 0 R >>\nstartxref\n${deslocamento}\n%%EOF\n`;

  partes.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(partes);
}
