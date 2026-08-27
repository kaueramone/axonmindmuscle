/**
 * Service worker da AXON.
 *
 * Duas coisas: instalar no ecrã inicial, e deixar treinar sem rede.
 *
 * A segunda parte apoia-se numa propriedade do próprio produto. A página de
 * treino é desenhada no servidor com o catálogo de exercícios e as sugestões
 * de carga já embutidos no HTML — guardar a navegação guarda os dados com
 * ela, e não é preciso um armazém em paralelo que depois se desactualiza
 * sozinho. Gravar já funcionava sem rede; o que faltava era conseguir abrir.
 */

const SHELL = "axon-shell-v2";
/** Páginas já autenticadas. Cache à parte, para poder ser apagada sozinha. */
const PRIVADO = "axon-privado-v1";

const PRECACHE = ["/offline.html", "/favicon.svg", "/icon-192.png"];

/**
 * Num ginásio em cave o telemóvel não fica sem rede: fica com rede que não
 * responde. Sem prazo, o `fetch` de uma navegação pode pendurar-se dezenas de
 * segundos com a pessoa a olhar para um ecrã branco — pior do que uma falha
 * limpa.
 */
const PRAZO_MS = 3500;

/** Rotas que valem a pena ter guardadas para abrir sem rede. */
const OFFLINE_UTIL = /^\/(pt-pt|pt-br)\/(treino|hoje)\/?$/;
const AUTENTICACAO = /^\/(pt-pt|pt-br)\/(entrar|criar-conta)\/?$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL && k !== PRIVADO).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function comPrazo(request) {
  const controlador = new AbortController();
  const relogio = setTimeout(() => controlador.abort(), PRAZO_MS);
  try {
    return await fetch(request, { signal: controlador.signal });
  } finally {
    clearTimeout(relogio);
  }
}

async function navegar(request, url) {
  // Chegar ao ecrã de entrada significa que não há sessão neste dispositivo.
  // É o momento certo para deitar fora as páginas guardadas de quem saiu:
  // levam nome, histórico e cargas dentro do HTML.
  if (AUTENTICACAO.test(url.pathname)) {
    await caches.delete(PRIVADO);
    return fetch(request);
  }

  const guardavel = OFFLINE_UTIL.test(url.pathname);

  try {
    const resposta = await comPrazo(request);

    // Um redirecionamento a partir de uma página da aplicação só acontece por
    // uma razão: o servidor deixou de reconhecer a sessão. Sessão expirada,
    // saída noutro dispositivo, palavra-passe trocada — em qualquer dos casos
    // as páginas guardadas deixaram de ser desta pessoa e vão fora já. É o
    // sinal mais fiável que o service worker tem, e não custa um pedido.
    if (guardavel && resposta.redirected) {
      await caches.delete(PRIVADO);
      return resposta;
    }

    // Só se guarda o que veio inteiro e é mesmo a página. Um redirecionamento
    // para o login guardado como se fosse o treino deixava a pessoa presa a
    // um ecrã de entrada que nunca mais saía do cache.
    if (guardavel && resposta.ok) {
      const copia = resposta.clone();
      caches.open(PRIVADO).then((c) => c.put(url.pathname, copia));
    }
    return resposta;
  } catch {
    const guardada = guardavel ? await caches.match(url.pathname) : null;
    return guardada ?? (await caches.match("/offline.html"));
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/api/")) return;

  // Pedidos de dados do Next para navegações do lado do cliente. Guardá-los
  // não ajuda — sem rede a aplicação já está aberta — e guardar respostas
  // parciais confunde a hidratação.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1") return;

  if (request.mode === "navigate") {
    event.respondWith(navegar(request, url));
    return;
  }

  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/brand")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
