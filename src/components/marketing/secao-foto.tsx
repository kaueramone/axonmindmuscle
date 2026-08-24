import Image from "next/image";

/**
 * Fotografia de ambiente por trás de uma secção da landing page.
 *
 * A fotografia fica a 30% e o resto é a identidade da marca. Isto não é
 * decoração gratuita: a 30% de visibilidade uma fotografia deixa de ser uma
 * fotografia e passa a ser textura — o que se lê dela é a composição e o
 * contraste, não o detalhe. É também por isso que o texto por cima não precisa
 * de mudar de cor em nenhum dos temas.
 *
 * As imagens são servidas do próprio domínio. Ligar a um banco de imagens
 * seria mais rápido de montar e traria dois problemas de graça: a landing page
 * passaria a depender de um servidor de terceiros para carregar, e cada
 * visitante seria anunciado a esse terceiro.
 */
export function SecaoFoto({
  src,
  posicao = "center",
  prioridade = false,
}: {
  src: string;
  /** Enquadramento, quando o motivo não está ao centro. */
  posicao?: string;
  prioridade?: boolean;
}) {
  return (
    <div className="secao-foto" aria-hidden="true">
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        priority={prioridade}
        quality={70}
        className="object-cover opacity-30"
        style={{ objectPosition: posicao }}
      />
      <div className="secao-foto-veu" />
    </div>
  );
}
