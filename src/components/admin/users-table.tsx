"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, Badge, Spinner } from "@/components/ui/surface";
import { setUserProAction, setUserRoleAction } from "@/lib/admin/actions";
import type { UserRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export type LinhaUtilizador = {
  id: string;
  name: string;
  role: UserRole;
  market: string;
  locale: string;
  plan: string;
  /** PRO atribuído por um administrador, por oposição a PRO comprado. */
  proConcedido: boolean;
  createdAt: string;
  onboarded: boolean;
};

export function UsersTable({
  linhas,
  selfId,
}: {
  linhas: LinhaUtilizador[];
  selfId: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-title1 text-fg">Utilizadores</h1>
        <p className="mt-1.5 text-callout text-fg-muted">
          {linhas.length} contas · {linhas.filter((l) => l.role === "admin").length} com
          acesso ao painel
        </p>
      </div>

      {erro ? <Alert tone="danger">{erro}</Alert> : null}

      <ul className="flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface divide-y divide-[var(--hairline)]">
        {linhas.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-callout font-medium text-fg">
                {l.name || "Sem nome"}
                {l.id === selfId ? (
                  <span className="ml-2 text-caption text-fg-subtle">tu</span>
                ) : null}
              </span>
              <span className="truncate text-footnote text-fg-subtle">
                {l.market} · {l.locale} ·{" "}
                {new Date(l.createdAt).toLocaleDateString("pt-PT")}
                {l.onboarded ? "" : " · calibração por fazer"}
              </span>
            </span>

            {l.plan === "pro" ? (
              <Badge tone="accent">{l.proConcedido ? "PRO dado" : "PRO"}</Badge>
            ) : null}

            {/* Só se dá e se tira o PRO dado à mão. Quem está mesmo a pagar
                não aparece aqui como removível: cancelar uma subscrição é no
                Stripe, não num botão do painel. */}
            <button
              type="button"
              disabled={pendente || (l.plan === "pro" && !l.proConcedido)}
              title={
                l.plan === "pro" && !l.proConcedido
                  ? "Esta conta é PRO por subscrição paga"
                  : undefined
              }
              onClick={() =>
                iniciar(async () => {
                  setErro(null);
                  const r = await setUserProAction(l.id, !l.proConcedido);
                  if (!r.ok) setErro(r.error);
                  router.refresh();
                })
              }
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-caption transition-colors disabled:opacity-50",
                l.proConcedido
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-hairline text-fg-muted hover:text-fg",
              )}
            >
              {l.proConcedido ? "Retirar PRO" : "Dar PRO"}
            </button>

            <button
              type="button"
              disabled={pendente || l.id === selfId}
              onClick={() =>
                iniciar(async () => {
                  setErro(null);
                  const r = await setUserRoleAction(
                    l.id,
                    l.role === "admin" ? "member" : "admin",
                  );
                  if (!r.ok) setErro(r.error);
                  router.refresh();
                })
              }
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-caption transition-colors disabled:opacity-50",
                l.role === "admin"
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-hairline text-fg-muted hover:text-fg",
              )}
            >
              {l.role === "admin" ? "Administrador" : "Tornar administrador"}
            </button>
          </li>
        ))}
      </ul>

      {pendente ? (
        <p className="flex items-center gap-2 text-caption text-fg-subtle">
          <Spinner /> a guardar
        </p>
      ) : null}

      <p className="text-caption leading-relaxed text-fg-subtle">
        O papel de administrador dá acesso a todos os números da plataforma e à
        edição do catálogo. Ninguém se pode promover a si próprio: a base de dados
        rejeita a alteração feita pela própria conta.
        {" "}O PRO dado aqui não tem prazo e fica até ser retirado. Não passa
        pelo Stripe, não é cobrado, e sobrevive a qualquer mudança de
        subscrição — quem o retirar devolve a conta ao que a subscrição disser.
      </p>
    </div>
  );
}
