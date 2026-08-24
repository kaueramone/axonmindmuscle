import { deflateRawSync } from "node:zlib";

/**
 * Escritor de ZIP mínimo, sem dependências.
 *
 * Um ficheiro por tabela é muito melhor do que um CSV gigante, e isso pede um
 * arquivo. Trazer uma biblioteca para isto seria acrescentar uma dependência —
 * e uma superfície de manutenção — a troco de trezentos bytes de formato que
 * está estável desde 1989. O `zlib` já vem no Node.
 *
 * Só o essencial: sem pastas, sem zip64, sem encriptação. Chega para dezenas
 * de milhares de linhas de treino, que é a ordem de grandeza real de uma conta.
 */

export type ZipEntry = { name: string; content: string };

/** CRC-32, tabela calculada uma vez. É o que valida o conteúdo do arquivo. */
const TABELA = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABELA[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** Data e hora no formato MS-DOS que o cabeçalho do ZIP usa. */
function dataDos(d: Date): { tempo: number; data: number } {
  return {
    tempo:
      (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    data:
      ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export function makeZip(entries: ZipEntry[], now: Date): Buffer {
  const { tempo, data } = dataDos(now);
  const locais: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entrada of entries) {
    const nome = Buffer.from(entrada.name, "utf8");
    // BOM para o Excel perceber que é UTF-8; sem ele, os acentos saem trocados.
    const cru = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(entrada.content, "utf8"),
    ]);
    const comprimido = deflateRawSync(cru);
    const soma = crc32(cru);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versão necessária
    local.writeUInt16LE(0x0800, 6); // nomes em UTF-8
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(tempo, 10);
    local.writeUInt16LE(data, 12);
    local.writeUInt32LE(soma, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(cru.length, 22);
    local.writeUInt16LE(nome.length, 26);
    local.writeUInt16LE(0, 28);

    locais.push(local, nome, comprimido);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4); // versão de origem
    dir.writeUInt16LE(20, 6); // versão necessária
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(tempo, 12);
    dir.writeUInt16LE(data, 14);
    dir.writeUInt32LE(soma, 16);
    dir.writeUInt32LE(comprimido.length, 20);
    dir.writeUInt32LE(cru.length, 24);
    dir.writeUInt16LE(nome.length, 28);
    dir.writeUInt32LE(offset, 42);

    central.push(dir, nome);
    offset += local.length + nome.length + comprimido.length;
  }

  const corpoCentral = Buffer.concat(central);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(entries.length, 8);
  fim.writeUInt16LE(entries.length, 10);
  fim.writeUInt32LE(corpoCentral.length, 12);
  fim.writeUInt32LE(offset, 16);

  return Buffer.concat([...locais, corpoCentral, fim]);
}
