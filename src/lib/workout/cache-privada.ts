"use client";

/**
 * Nome da cache do service worker onde ficam as páginas já autenticadas.
 * Tem de coincidir com `PRIVADO` em `public/sw.js`.
 */
export const CACHE_PRIVADA = "axon-privado-v1";

/**
 * Apaga as páginas guardadas para uso sem rede ao sair da conta.
 *
 * O `/hoje` e o `/treino` são desenhados no servidor com o nome da pessoa, o
 * histórico e as cargas sugeridas dentro do próprio HTML — é isso que os faz
 * abrir numa cave sem rede, e é isso que os torna um problema depois de sair.
 * Até aqui só eram apagados por quem passasse pelo ecrã de entrada, e a saída
 * leva à página inicial: quem terminasse sessão num telemóvel emprestado
 * deixava lá o treino todo, legível sem sessão nenhuma.
 *
 * Nunca falha para fora: perder a cache é irrelevante ao pé de não conseguir
 * sair da conta.
 */
export function limparCachePrivada(): void {
  try {
    if (typeof caches === "undefined") return;
    void caches.delete(CACHE_PRIVADA);
  } catch {
    // Modo privado, armazenamento bloqueado, browser antigo: seguimos.
  }
}
