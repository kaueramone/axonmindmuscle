/**
 * Compressão de imagem no telemóvel, antes de subir.
 *
 * As transformações de imagem do Supabase são do plano pago, por isso não há
 * redimensionamento no servidor. Mas mesmo que houvesse, este é o sítio certo:
 * comprimir aqui não custa nada por imagem, não precisa de fila nem de
 * trabalhador, e a pessoa vê o resultado antes de publicar.
 *
 * Saem duas variantes da mesma leitura do ficheiro:
 *
 *   feed  — 1280px no lado maior. O cartão do mural tem 672px de largura
 *           máxima; num telemóvel a 3x isso dá cerca de 1030px físicos. A
 *           1280 a imagem chega nítida a qualquer ecrã e pesa ~200 KB.
 *   full  — 2048px. É o que abre ao toque, e só é descarregada por quem toca.
 *
 * Se o feed servisse a imagem grande, cada visita ao mural gastava megabytes
 * que ninguém chegou a olhar de perto — e o plano gratuito tem 5 GB por mês.
 *
 * Efeito lateral que vale por si: passar por um canvas apaga os metadados
 * EXIF, incluindo as coordenadas de GPS. Uma fotografia tirada no ginásio
 * costuma trazer a morada do ginásio agarrada, e isso não vai para um mural
 * público.
 */

export const LADO_FEED = 1280;
export const LADO_FULL = 2048;

/** Acima de 25 MB é quase sempre engano: um vídeo, um RAW, um PDF renomeado. */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

export const TIPOS_ACEITES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export type Variante = {
  blob: Blob;
  largura: number;
  altura: number;
  extensao: "webp" | "jpg";
};

export type ImagemPreparada = {
  feed: Variante;
  full: Variante;
  /** Para o URL de objeto do pré-visualizador, antes de publicar. */
  previewUrl: string;
};

/**
 * Lê o ficheiro uma vez e desenha-o duas.
 *
 * `imageOrientation: "from-image"` não é um detalhe: sem isso, as fotografias
 * tiradas na vertical com um iPhone chegam deitadas ao mural, porque a rotação
 * vive no EXIF que o canvas descarta.
 */
export async function prepararImagem(file: File): Promise<ImagemPreparada> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  try {
    const feed = await desenhar(bitmap, LADO_FEED, 0.82);
    const full = await desenhar(bitmap, LADO_FULL, 0.85);
    return { feed, full, previewUrl: URL.createObjectURL(feed.blob) };
  } finally {
    bitmap.close();
  }
}

async function desenhar(
  bitmap: ImageBitmap,
  ladoMaximo: number,
  qualidade: number,
): Promise<Variante> {
  // Nunca aumentar: uma fotografia pequena esticada até 2048 fica pior e pesa
  // mais do que o original.
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const largura = Math.max(1, Math.round(bitmap.width * escala));
  const altura = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("canvas indisponível");
  contexto.imageSmoothingQuality = "high";
  contexto.drawImage(bitmap, 0, 0, largura, altura);

  const blob = await paraBlob(canvas, qualidade);

  // Um browser que não saiba gravar WebP devolve PNG sem avisar — e um PNG de
  // uma fotografia é várias vezes maior do que o JPEG equivalente. Se isso
  // acontecer, é melhor pedir JPEG de propósito.
  if (blob.type === "image/webp") {
    return { blob, largura, altura, extensao: "webp" };
  }
  const jpeg = await paraBlob(canvas, qualidade, "image/jpeg");
  return { blob: jpeg, largura, altura, extensao: "jpg" };
}

function paraBlob(
  canvas: HTMLCanvasElement,
  qualidade: number,
  tipo: "image/webp" | "image/jpeg" = "image/webp",
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("falha a converter"))),
      tipo,
      qualidade,
    );
  });
}
