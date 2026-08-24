"use client";

import { usePathname } from "next/navigation";

import { LogoSymbol } from "@/components/brand/logo";

/**
 * Ecrã de espera da AXON.
 *
 * O gesto é o da marca: o símbolo é um axónio deitado e o impulso atravessa-o
 * da esquerda para a direita. Serve para o tempo em que a área pessoal está a
 * ser montada — dados a chegar, sessão a ser lida, decisão entre servir da
 * rede ou do que ficou guardado.
 *
 * Não cobre tudo, e vale dizê-lo: quando a pessoa abre a aplicação de raiz sem
 * rede, o browser ainda não tem HTML nenhum para desenhar e continua a mostrar
 * o que estava antes. Nesse instante não há componente que valha — o que
 * resolve é o prazo curto no service worker, e esse já lá está.
 *
 * O idioma vem do caminho porque um ecrã de espera não recebe parâmetros de
 * rota, e o `lang` do documento é o mesmo nos dois mercados.
 */
export function Carregando({ className }: { className?: string }) {
  const caminho = usePathname();
  const rotulo = caminho?.startsWith("/pt-br") ? "Carregando…" : "A carregar…";

  return (
    <div
      role="status"
      aria-live="polite"
      className={className ?? "flex min-h-[60vh] flex-col items-center justify-center gap-6 px-5"}
    >
      <div className="relative w-52 sm:w-64">
        {/* O símbolo fica muito abaixo em contraste: o que se lê é o impulso. */}
        <LogoSymbol className="h-auto w-full text-fg opacity-20" title="" />
        <span className="axon-trilho" aria-hidden="true">
          <span className="axon-ponto" />
        </span>
      </div>

      <p className="label-brand text-fg-subtle">{rotulo}</p>
    </div>
  );
}
