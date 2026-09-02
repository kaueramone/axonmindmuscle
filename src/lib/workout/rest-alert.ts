"use client";

/**
 * Aviso no fim do descanso, com o ecrã bloqueado.
 *
 * O que é possível num browser, e o que não é: não há maneira de agendar uma
 * notificação para uma hora futura (a API de "notification triggers" nunca
 * saiu do Chrome experimental). O que há são temporizadores, e temporizadores
 * são travados quando a página vai para segundo plano. Por isso o aviso é
 * pedido em dois sítios ao mesmo tempo:
 *
 *   1. Ao service worker, por mensagem — vive fora da página e, no Android,
 *      costuma sobreviver ao bloqueio do ecrã o suficiente para dois minutos.
 *   2. À própria página, por `setTimeout` — apanha o caso em que o service
 *      worker foi encerrado entretanto e a página ainda acorda.
 *
 * Os dois usam a mesma `tag`, por isso o segundo a chegar substitui o
 * primeiro em vez de o duplicar. No iPhone, nada disto existe fora de uma
 * aplicação instalada no ecrã inicial; a interface diz-o em vez de prometer.
 */

const TAG = "axon-descanso";
const CHAVE_PREFERENCIA = "axon.descanso.aviso";

export type RestAlertPermission = "granted" | "denied" | "default" | "unsupported";

export function restAlertSupport(): RestAlertPermission {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission;
}

/** Verdadeiro quando a AXON corre instalada (ecrã inicial), e não num separador. */
export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export async function requestRestAlert(): Promise<RestAlertPermission> {
  const estado = restAlertSupport();
  if (estado !== "default") return estado;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function readRestAlertPreference(): boolean {
  try {
    return localStorage.getItem(CHAVE_PREFERENCIA) === "1";
  } catch {
    return false;
  }
}

export function writeRestAlertPreference(ligado: boolean): void {
  try {
    localStorage.setItem(CHAVE_PREFERENCIA, ligado ? "1" : "0");
  } catch {
    // Sem armazenamento não há preferência guardada; o toggle continua a
    // funcionar durante a sessão.
  }
}

/**
 * Agenda o aviso para `endsAt` (ms desde a época). Devolve a função que o
 * cancela — chamada quando o descanso acaba antes, é prolongado, ou a pessoa
 * sai do ecrã.
 */
export function scheduleRestAlert(
  endsAt: number,
  texto: { title: string; body: string },
): () => void {
  if (restAlertSupport() !== "granted") return () => {};

  const atraso = Math.max(0, endsAt - Date.now());
  let cancelado = false;

  void navigator.serviceWorker.ready.then((registo) => {
    if (cancelado) return;
    registo.active?.postMessage({ type: "axon:descanso", at: endsAt, tag: TAG, ...texto });
  });

  const relogio = window.setTimeout(() => {
    if (cancelado) return;
    void navigator.serviceWorker.ready.then((registo) =>
      registo.showNotification(texto.title, {
        body: texto.body,
        tag: TAG,
        icon: "/icon-192.png",
      }),
    );
  }, atraso);

  return () => {
    cancelado = true;
    window.clearTimeout(relogio);
    void navigator.serviceWorker.ready.then((registo) => {
      registo.active?.postMessage({ type: "axon:descanso:cancelar", tag: TAG });
      // Se o aviso já foi mostrado, fechá-lo ao voltar ao treino evita ficar
      // um "descanso terminado" pendurado na barra.
      void registo.getNotifications({ tag: TAG }).then((lista) => {
        for (const n of lista) n.close();
      });
    });
  };
}
