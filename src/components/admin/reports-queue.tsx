"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, Spinner } from "@/components/ui/surface";
import { moderatePostAction } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

export type PostDenunciado = {
  id: string;
  body: string;
  createdAt: string;
  autor: string;
  autorHandle: string | null;
  imagemUrl: string | null;
  temTreino: boolean;
  escondido: boolean;
  apagadoPeloAutor: boolean;
  denuncias: { motivo: string; nota: string | null; quando: string; quem: string }[];
};

const MOTIVO: Record<string, string> = {
  spam: "Spam",
  abuso: "Ofensa ou assédio",
  perigoso: "Conselho perigoso",
  outro: "Outro",
};

/**
 * A fila de denúncias, um cartão por post. A fotografia aparece porque é
 * muitas vezes o motivo da denúncia — moderar às cegas não é moderar.
 * Três decisões: esconder (ninguém vê, o autor também não), ignorar (as
 * denúncias fecham, o post fica), e voltar a mostrar (para rever).
 */
export function ReportsQueue({ posts }: { posts: PostDenunciado[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aTratar, setATratar] = useState<string | null>(null);

  function decidir(postId: string, decisao: "esconder" | "mostrar" | "ignorar") {
    setErro(null);
    setATratar(postId);
    iniciar(async () => {
      const r = await moderatePostAction(postId, decisao);
      if (!r.ok) setErro(r.error);
      setATratar(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-title1 text-fg">Comunidade</h1>
        <p className="mt-1.5 text-callout text-fg-muted">
          {posts.length === 0
            ? "Sem denúncias por rever."
            : `${posts.length} ${posts.length === 1 ? "publicação denunciada" : "publicações denunciadas"} por rever.`}
        </p>
      </div>

      {erro ? <Alert tone="danger">{erro}</Alert> : null}

      {posts.map((p) => (
        <Card key={p.id} className={cn("flex flex-col gap-4", p.escondido && "opacity-70")}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-headline text-fg">{p.autor}</span>
            {p.autorHandle ? (
              <span className="text-caption text-fg-subtle">@{p.autorHandle}</span>
            ) : null}
            <span className="text-caption text-fg-subtle">
              · {new Date(p.createdAt).toLocaleString("pt-PT")}
            </span>
            {p.escondido ? <Badge tone="warning">Escondida</Badge> : null}
            {p.apagadoPeloAutor ? <Badge tone="neutral">Apagada pelo autor</Badge> : null}
            {p.temTreino ? <Badge tone="accent">treino</Badge> : null}
          </div>

          {p.body ? (
            <p className="whitespace-pre-wrap text-callout leading-relaxed text-fg">{p.body}</p>
          ) : null}

          {p.imagemUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.imagemUrl}
              alt=""
              className="max-h-80 w-auto max-w-full rounded-md border border-hairline object-contain"
              loading="lazy"
            />
          ) : null}

          <ul className="flex flex-col gap-1.5 rounded-md bg-surface-strong/60 p-3">
            {p.denuncias.map((d, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-subhead">
                <Badge tone="warning">{MOTIVO[d.motivo] ?? d.motivo}</Badge>
                <span className="text-fg-muted">{d.quem}</span>
                <span className="text-caption text-fg-subtle">
                  {new Date(d.quando).toLocaleString("pt-PT")}
                </span>
                {d.nota ? <span className="w-full text-fg-muted">{d.nota}</span> : null}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 sm:flex-row">
            {p.escondido ? (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={pendente}
                onClick={() => decidir(p.id, "mostrar")}
              >
                {pendente && aTratar === p.id ? <Spinner /> : null}
                Voltar a mostrar
              </Button>
            ) : (
              <Button
                type="button"
                variant="danger"
                fullWidth
                disabled={pendente}
                onClick={() => decidir(p.id, "esconder")}
              >
                {pendente && aTratar === p.id ? <Spinner /> : null}
                Esconder do mural
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={pendente}
              onClick={() => decidir(p.id, "ignorar")}
            >
              Ignorar denúncias
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
