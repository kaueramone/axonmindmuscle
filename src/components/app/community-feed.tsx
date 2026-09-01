"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Badge, Card } from "@/components/ui/surface";
import { Bolt, Trash } from "@/components/ui/icons";
import {
  alternarGostoAction,
  apagarPostAction,
  denunciarPostAction,
} from "@/lib/community/actions";
import type { PostView } from "@/lib/community/shared";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

type Copy = Dict["app"]["community"];

const MOTIVOS = [
  { valor: "spam", chave: "reasonSpam" },
  { valor: "abuso", chave: "reasonAbuse" },
  { valor: "perigoso", chave: "reasonDanger" },
  { valor: "outro", chave: "reasonOther" },
] as const;

export function CommunityFeed({
  posts,
  copy,
  intlLocale,
  agoraISO,
}: {
  posts: PostView[];
  copy: Copy;
  intlLocale: string;
  /** O relógio do servidor. Ver a nota em `Quando`. */
  agoraISO: string;
}) {
  if (posts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          copy={copy}
          intlLocale={intlLocale}
          agoraISO={agoraISO}
        />
      ))}
    </div>
  );
}

function PostCard({
  post,
  copy,
  intlLocale,
  agoraISO,
}: {
  post: PostView;
  copy: Copy;
  intlLocale: string;
  agoraISO: string;
}) {
  const [gostei, setGostei] = useState(post.gostei);
  const [gostos, setGostos] = useState(post.likeCount);
  const [apagado, setApagado] = useState(false);
  const [aConfirmar, setAConfirmar] = useState(false);
  const [aDenunciar, setADenunciar] = useState(false);
  const [denunciado, setDenunciado] = useState(false);

  if (apagado) return null;

  // O contador muda no ecrã antes de o servidor responder: reagir tem de
  // parecer instantâneo. Se o pedido falhar, volta atrás - o que é honesto e
  // muito menos frequente do que a espera que se evita.
  async function alternar() {
    const antes = gostei;
    setGostei(!antes);
    setGostos((n) => n + (antes ? -1 : 1));

    const r = await alternarGostoAction(post.id, !antes);
    if (!r.ok) {
      setGostei(antes);
      setGostos((n) => n + (antes ? 1 : -1));
    }
  }

  async function apagar() {
    const r = await apagarPostAction(post.id);
    if (r.ok) setApagado(true);
    setAConfirmar(false);
  }

  async function denunciar(motivo: string) {
    await denunciarPostAction(post.id, motivo);
    setADenunciar(false);
    setDenunciado(true);
  }

  return (
    <Card as="article" className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar nome={post.autor.nome} url={post.autor.avatarUrl} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate text-headline text-fg">{post.autor.nome}</span>
            {post.autor.handle ? (
              <span className="truncate text-caption text-fg-subtle">
                @{post.autor.handle}
              </span>
            ) : null}
            <span className="text-caption text-fg-subtle">
              · <Quando iso={post.createdAt} agoraISO={agoraISO} intlLocale={intlLocale} />
            </span>
          </div>

          <p className="mt-1.5 whitespace-pre-wrap text-callout leading-relaxed text-fg [text-wrap:pretty]">
            {post.body}
          </p>

          {post.doTreino ? (
            <span className="mt-2 self-start">
              <Badge tone="accent">{copy.fromWorkout}</Badge>
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1 border-t border-hairline pt-2.5">
        <button
          type="button"
          onClick={alternar}
          aria-pressed={gostei}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-caption transition-colors",
            gostei ? "text-accent" : "text-fg-subtle hover:text-fg-muted",
          )}
        >
          <Bolt className="size-4" />
          <span className="data-mono">{gostos > 0 ? gostos : ""}</span>
          <span className="sr-only">{copy.like}</span>
        </button>

        {post.replyCount > 0 ? (
          <span className="px-2 py-1 text-caption text-fg-subtle">
            {t(copy.replies, { n: String(post.replyCount) })}
          </span>
        ) : null}

        <span className="flex-1" />

        {post.meu ? (
          <button
            type="button"
            onClick={() => setAConfirmar(true)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-caption text-fg-subtle transition-colors hover:text-danger"
          >
            <Trash className="size-4" />
            <span className="sr-only">{copy.remove}</span>
          </button>
        ) : denunciado ? (
          <span className="px-2 py-1 text-caption text-fg-subtle">{copy.reportSent}</span>
        ) : (
          <button
            type="button"
            onClick={() => setADenunciar((v) => !v)}
            className="rounded-md px-2 py-1 text-caption text-fg-subtle transition-colors hover:text-fg-muted"
          >
            {copy.report}
          </button>
        )}
      </div>

      {aConfirmar ? (
        <div className="flex flex-col gap-2.5 border-t border-hairline pt-3">
          <p className="text-callout text-fg">{copy.removeConfirm}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={apagar}>
              {copy.remove}
            </Button>
            <Button size="sm" variant="plain" onClick={() => setAConfirmar(false)}>
              {copy.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {aDenunciar ? (
        <div className="flex flex-col gap-2 border-t border-hairline pt-3">
          <p className="text-callout text-fg">{copy.reportTitle}</p>
          {MOTIVOS.map((m) => (
            <button
              key={m.valor}
              type="button"
              onClick={() => denunciar(m.valor)}
              className="rounded-md px-3 py-2 text-left text-callout text-fg-muted transition-colors hover:bg-surface-hover"
            >
              {copy[m.chave] as string}
            </button>
          ))}
          <Button size="sm" variant="plain" onClick={() => setADenunciar(false)}>
            {copy.cancel}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

/** Sem fotografia, a inicial. Nunca um espaço vazio onde devia estar alguém. */
function Avatar({ nome, url }: { nome: string; url: string | null }) {
  if (url) {
    // Não passa por next/image de propósito: é uma miniatura de 40px vinda do
    // Storage, e uma optimização por avatar visível encarecia o feed inteiro
    // para poupar bytes que já são poucos.
    return (
      <img
        src={url}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        className="size-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-headline text-accent">
      {nome.replace("@", "").charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * "há 3 min".
 *
 * O relógio inicial vem do servidor por prop: calcular `Date.now()` durante a
 * primeira renderização dava um texto no servidor e outro no browser, e o
 * React acusa a diferença. Depois de montar, passa a ser o relógio local e
 * anda de minuto a minuto.
 */
function Quando({
  iso,
  agoraISO,
  intlLocale,
}: {
  iso: string;
  agoraISO: string;
  intlLocale: string;
}) {
  const [agora, setAgora] = useState(() => new Date(agoraISO).getTime());

  useEffect(() => {
    setAgora(Date.now());
    const timer = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const segundos = Math.round((new Date(iso).getTime() - agora) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" });

  const escalas: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 3600],
    ["hour", 86_400],
    ["day", 604_800],
    ["week", 2_592_000],
    ["month", 31_536_000],
  ];

  let unidade: Intl.RelativeTimeFormatUnit = "year";
  let divisor = 31_536_000;
  let anterior = 1;
  for (const [u, limite] of escalas) {
    if (Math.abs(segundos) < limite) {
      unidade = u;
      divisor = anterior;
      break;
    }
    anterior = limite;
  }

  return <time dateTime={iso}>{rtf.format(Math.round(segundos / divisor), unidade)}</time>;
}
