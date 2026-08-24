/**
 * CSV que o Excel e o Google Sheets abrem sem se queixar.
 *
 * O detalhe que costuma correr mal é o separador: o Excel em português lê
 * ponto e vírgula, e um ficheiro com vírgulas abre com tudo numa coluna só.
 * A linha `sep=` no topo é uma extensão da Microsoft, ignorada por quem não
 * precisa dela, e é o que faz o ficheiro abrir bem nos dois lados.
 */

const SEP = ";";

function campo(valor: unknown): string {
  if (valor === null || valor === undefined) return "";

  if (Array.isArray(valor)) return campo(valor.join(", "));

  const texto = String(valor);

  // Aspas duplicadas por dentro, aspas à volta se houver separador, aspas ou
  // mudança de linha. Sem isto, uma nota com ponto e vírgula parte a coluna.
  if (
    texto.includes(SEP) ||
    texto.includes('"') ||
    texto.includes("\n") ||
    texto.includes("\r")
  ) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function toCsv(
  linhas: Record<string, unknown>[],
  colunas?: string[],
): string {
  const cabecalho = colunas ?? (linhas[0] ? Object.keys(linhas[0]) : []);
  if (cabecalho.length === 0) return `sep=${SEP}\n`;

  const corpo = linhas.map((linha) =>
    cabecalho.map((c) => campo(linha[c])).join(SEP),
  );

  // \r\n porque é o que o Excel espera; o resto do mundo tolera.
  return [`sep=${SEP}`, cabecalho.join(SEP), ...corpo].join("\r\n") + "\r\n";
}
