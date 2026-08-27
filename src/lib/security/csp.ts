/**
 * Política de segurança de conteúdo.
 *
 * A aplicação não escreve HTML fornecido por ninguém: o React escapa tudo e o
 * único `dangerouslySetInnerHTML` do projeto é uma constante escrita por nós.
 * Isto não é, por isso, a defesa contra o XSS — é a camada que fica de pé
 * quando essa primeira falhar, por uma dependência comprometida, por um
 * componente novo escrito à pressa, ou por um campo que passe a aceitar
 * formatação. Sem ela, um script injectado tem a origem inteira à disposição.
 *
 * O modelo é `nonce` + `strict-dynamic`, e não uma lista de domínios: cada
 * pedido traz um número irrepetível, os scripts do Next e o nosso script de
 * tema levam-no, e o que for injectado depois não o tem. Uma lista de domínios
 * seria contornada no dia em que qualquer um deles servisse um ficheiro
 * aberto a parâmetros.
 */

/** Host do projeto Supabase, para as ligações de dados, media e realtime. */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
  } catch {
    return null;
  }
})();

const supabaseHttps = supabaseHost ? `https://${supabaseHost}` : "";
const supabaseWss = supabaseHost ? `wss://${supabaseHost}` : "";

/** O widget do Turnstile carrega o seu script e abre um iframe próprio. */
const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * O checkout e o portal de faturação são navegações de topo depois de um
 * formulário. O Chrome verifica `form-action` também no destino do
 * redirecionamento, por isso os dois anfitriões do Stripe têm de constar —
 * sem isto, carregar em "assinar" com o JavaScript desligado não ia a lado
 * nenhum, e é precisamente aí que o dinheiro está.
 */
const STRIPE_FORM = "https://checkout.stripe.com https://billing.stripe.com";

export function gerarNonce(): string {
  // `crypto` global, disponível no ambiente de Edge onde o proxy corre.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function construirCsp(nonce: string, producao: boolean): string {
  const diretivas = [
    `default-src 'self'`,

    // `strict-dynamic` faz o browser ignorar a lista de domínios para scripts
    // e confiar apenas no que foi carregado por um script já autorizado. Em
    // desenvolvimento o Next avalia código para o recarregamento a quente.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: ${
      producao ? "" : "'unsafe-eval'"
    }`.trim(),

    // O Next e o `next/font` injectam estilos em linha. Um estilo injectado
    // não executa código; abrir aqui custa muito menos do que partir o
    // primeiro desenho de todas as páginas.
    `style-src 'self' 'unsafe-inline'`,

    // Imagens não executam. As fotografias de perfil vindas do Google mudam
    // de anfitrião sem aviso, e o optimizador do Next serve-as da própria
    // origem, por isso `https:` aqui é largueza consciente, não descuido.
    `img-src 'self' data: blob: https:`,

    `font-src 'self' data:`,

    // Esta é a diretiva que fecha a porta à exfiltração: mesmo que corresse
    // código estranho, não tem para onde mandar o que lesse.
    `connect-src 'self' ${supabaseHttps} ${supabaseWss} ${TURNSTILE}`.trim(),

    `media-src 'self' blob: ${supabaseHttps}`.trim(),
    `frame-src ${TURNSTILE}`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,

    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' ${STRIPE_FORM}`,

    // Substitui o `X-Frame-Options`, que só sabe dizer "mesma origem". Aqui
    // dizemos o que queremos mesmo: ninguém emoldura esta aplicação.
    `frame-ancestors 'none'`,
  ];

  if (producao) diretivas.push("upgrade-insecure-requests");

  return diretivas.join("; ").replace(/\s{2,}/g, " ");
}
