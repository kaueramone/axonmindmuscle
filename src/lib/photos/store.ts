"use client";

import { prepararImagem } from "@/lib/community/imagem";

/**
 * Fotografias de progresso — só no dispositivo.
 *
 * Nunca saem daqui. Não há coluna na base de dados, não há balde no Storage,
 * não há pedido de rede: ficam em IndexedDB, no browser em que foram
 * tiradas. É o argumento de privacidade da funcionalidade e é também a sua
 * limitação, e a interface diz as duas coisas. Trocar de telemóvel ou limpar
 * os dados do browser apaga-as; a exportação em ZIP existe para isso.
 *
 * Guarda-se a variante grande (2048px) que a compressão do mural já produz —
 * suficiente para comparar de perto, ~500 KB por foto — e uma miniatura para
 * a galeria não descodificar dezenas de fotos grandes de cada vez.
 */

const DB = "axon-fotos";
const VERSAO = 1;
const STORE = "fotos";

export type FotoProgresso = {
  id: string;
  /** ISO. A data que a pessoa escolheu, por omissão a de hoje. */
  takenAt: string;
  blob: Blob;
  thumb: Blob;
  largura: number;
  altura: number;
  nota: string;
  createdAt: string;
};

export type FotoResumo = Omit<FotoProgresso, "blob"> & { thumbUrl: string };

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb"));
      return;
    }
    const pedido = indexedDB.open(DB, VERSAO);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("takenAt", "takenAt");
      }
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error ?? new Error("indexeddb"));
  });
}

function pedir<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexeddb"));
  });
}

export function fotosDisponiveis(): boolean {
  return typeof indexedDB !== "undefined";
}

/**
 * Pede ao browser para não despejar este armazenamento quando faltar espaço.
 * Não é garantido — é um pedido — e no iPhone só vale com a app instalada.
 */
export async function pedirPersistencia(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function guardarFoto(file: File, takenAt: string, nota: string): Promise<FotoResumo> {
  const preparada = await prepararImagem(file);
  URL.revokeObjectURL(preparada.previewUrl);

  const thumb = await miniatura(preparada.feed.blob);
  const foto: FotoProgresso = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    takenAt,
    blob: preparada.full.blob,
    thumb,
    largura: preparada.full.largura,
    altura: preparada.full.altura,
    nota: nota.slice(0, 80),
    createdAt: new Date().toISOString(),
  };

  const db = await abrir();
  try {
    await pedir(db.transaction(STORE, "readwrite").objectStore(STORE).put(foto));
  } finally {
    db.close();
  }
  const { blob: _blob, ...resto } = foto;
  return { ...resto, thumbUrl: URL.createObjectURL(thumb) };
}

export async function listarFotos(): Promise<FotoResumo[]> {
  const db = await abrir();
  try {
    const todas = await pedir(
      db.transaction(STORE, "readonly").objectStore(STORE).getAll() as IDBRequest<FotoProgresso[]>,
    );
    return todas
      .sort((a, b) => (a.takenAt < b.takenAt ? 1 : a.takenAt > b.takenAt ? -1 : 0))
      .map(({ blob: _blob, ...f }) => ({ ...f, thumbUrl: URL.createObjectURL(f.thumb) }));
  } finally {
    db.close();
  }
}

export async function lerFoto(id: string): Promise<FotoProgresso | null> {
  const db = await abrir();
  try {
    return (
      (await pedir(
        db.transaction(STORE, "readonly").objectStore(STORE).get(id) as IDBRequest<FotoProgresso>,
      )) ?? null
    );
  } finally {
    db.close();
  }
}

export async function apagarFoto(id: string): Promise<void> {
  const db = await abrir();
  try {
    await pedir(db.transaction(STORE, "readwrite").objectStore(STORE).delete(id));
  } finally {
    db.close();
  }
}

export async function todasAsFotos(): Promise<FotoProgresso[]> {
  const db = await abrir();
  try {
    return await pedir(
      db.transaction(STORE, "readonly").objectStore(STORE).getAll() as IDBRequest<FotoProgresso[]>,
    );
  } finally {
    db.close();
  }
}

/** 320px no lado maior: chega para uma grelha de três colunas num telemóvel. */
async function miniatura(origem: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(origem);
  try {
    const escala = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("thumb"))), "image/jpeg", 0.8),
    );
  } finally {
    bitmap.close();
  }
}

/* -------------------------------------------------------------------------
 * ZIP sem compressão (método "store").
 *
 * As fotos já vêm comprimidas; um ZIP serve só para sair daqui num ficheiro
 * só. Escrever o formato à mão evita uma biblioteca que a CSP não deixaria
 * carregar de um CDN e que pesaria mais do que este ficheiro inteiro.
 * ---------------------------------------------------------------------- */

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = TABELA_CRC[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dataDos(iso: string): { data: number; hora: number } {
  const d = new Date(iso);
  const ano = Math.max(1980, d.getFullYear());
  return {
    data: ((ano - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  };
}

export async function exportarZip(fotos: FotoProgresso[]): Promise<Blob> {
  const codificador = new TextEncoder();
  const partes: Uint8Array<ArrayBuffer>[] = [];
  const central: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;

  const usados = new Set<string>();
  for (const f of fotos) {
    const ext = f.blob.type === "image/webp" ? "webp" : "jpg";
    let nome = `${f.takenAt.slice(0, 10)}${f.nota ? "-" + f.nota.replace(/[^a-z0-9]+/gi, "_").slice(0, 30) : ""}.${ext}`;
    while (usados.has(nome)) nome = nome.replace(/(\.\w+)$/, `-${f.id.slice(-4)}$1`);
    usados.add(nome);

    const nomeBytes = new Uint8Array(codificador.encode(nome));
    const dados = new Uint8Array(await f.blob.arrayBuffer());
    const crc = crc32(dados);
    const { data, hora } = dataDos(f.takenAt);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nomes em UTF-8
    local.setUint16(8, 0, true); // store
    local.setUint16(10, hora, true);
    local.setUint16(12, data, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, dados.length, true);
    local.setUint32(22, dados.length, true);
    local.setUint16(26, nomeBytes.length, true);
    local.setUint16(28, 0, true);

    const cabecalho = new DataView(new ArrayBuffer(46));
    cabecalho.setUint32(0, 0x02014b50, true);
    cabecalho.setUint16(4, 20, true);
    cabecalho.setUint16(6, 20, true);
    cabecalho.setUint16(8, 0x0800, true);
    cabecalho.setUint16(10, 0, true);
    cabecalho.setUint16(12, hora, true);
    cabecalho.setUint16(14, data, true);
    cabecalho.setUint32(16, crc, true);
    cabecalho.setUint32(20, dados.length, true);
    cabecalho.setUint32(24, dados.length, true);
    cabecalho.setUint16(28, nomeBytes.length, true);
    cabecalho.setUint16(30, 0, true);
    cabecalho.setUint16(32, 0, true);
    cabecalho.setUint16(34, 0, true);
    cabecalho.setUint16(36, 0, true);
    cabecalho.setUint32(38, 0, true);
    cabecalho.setUint32(42, offset, true);

    partes.push(new Uint8Array(local.buffer as ArrayBuffer), nomeBytes, dados);
    central.push(new Uint8Array(cabecalho.buffer as ArrayBuffer), nomeBytes);
    offset += 30 + nomeBytes.length + dados.length;
  }

  const tamanhoCentral = central.reduce((t, p) => t + p.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(4, 0, true);
  fim.setUint16(6, 0, true);
  fim.setUint16(8, fotos.length, true);
  fim.setUint16(10, fotos.length, true);
  fim.setUint32(12, tamanhoCentral, true);
  fim.setUint32(16, offset, true);
  fim.setUint16(20, 0, true);

  return new Blob([...partes, ...central, new Uint8Array(fim.buffer as ArrayBuffer)], {
    type: "application/zip",
  });
}
