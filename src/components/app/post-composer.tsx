"use client";

import { useEffect, useRef, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Close, Photo } from "@/components/ui/icons";
import { Alert, Card, Spinner } from "@/components/ui/surface";
import { publicarAction } from "@/lib/community/actions";
import {
  MAX_ORIGINAL_BYTES,
  TIPOS_ACEITES,
  prepararImagem,
  type ImagemPreparada,
} from "@/lib/community/imagem";
import { BUCKET_MURAL, LIMITE_CARACTERES } from "@/lib/community/shared";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import { route } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ERROS: Record<string, keyof Dict["app"]["community"]> = {
  vazio: "errorEmpty",
  longo: "errorLong",
  plano: "errorPlan",
  limite: "errorRate",
};

/**
 * A caixa de escrita.
 *
 * Quem não tem PRO vê no lugar dela o motivo e o caminho para o resolver — e
 * não um campo desactivado, que não explica nada a quem carrega nele.
 */
export function PostComposer({
  copy,
  locale,
  userId,
  podePublicar,
}: {
  copy: Dict["app"]["community"];
  locale: Locale;
  userId: string;
  podePublicar: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  const [aPreparar, setAPreparar] = useState(false);
  const [imagem, setImagem] = useState<ImagemPreparada | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // O URL do objecto ocupa memória até ser devolvido. Sem isto, escolher e
  // trocar de fotografia dez vezes deixa dez imagens presas no separador.
  useEffect(() => {
    return () => {
      if (imagem) URL.revokeObjectURL(imagem.previewUrl);
    };
  }, [imagem]);

  if (!podePublicar) {
    return (
      <Card className="flex flex-col gap-3 bg-accent-soft">
        <p className="text-callout leading-relaxed text-fg">{copy.proOnly}</p>
        <ButtonLink href={route(locale, "plans")} variant="secondary" size="sm">
          {copy.proOnlyCta}
        </ButtonLink>
      </Card>
    );
  }

  const restam = LIMITE_CARACTERES - texto.length;
  const semConteudo = texto.trim().length === 0 && !imagem;

  async function escolher(file: File) {
    setErro(null);

    if (file.size > MAX_ORIGINAL_BYTES) return setErro(copy.errorTooLarge);

    setAPreparar(true);
    try {
      const preparada = await prepararImagem(file);
      if (imagem) URL.revokeObjectURL(imagem.previewUrl);
      setImagem(preparada);
    } catch {
      // Acontece com formatos que o browser não sabe descodificar — um HEIC
      // fora do Safari é o caso comum.
      setErro(copy.errorImage);
    } finally {
      setAPreparar(false);
      if (input.current) input.current.value = "";
    }
  }

  function retirar() {
    if (imagem) URL.revokeObjectURL(imagem.previewUrl);
    setImagem(null);
  }

  async function submeter() {
    setBusy(true);
    setErro(null);

    const dados = new FormData();
    dados.set("body", texto);

    if (imagem) {
      const caminhos = await enviarImagem(userId, imagem);
      if (!caminhos) {
        setErro(copy.errorUpload);
        setBusy(false);
        return;
      }
      dados.set("mediaPath", caminhos.path);
      dados.set("mediaPreviewPath", caminhos.previewPath);
      dados.set("mediaWidth", String(imagem.full.largura));
      dados.set("mediaHeight", String(imagem.full.altura));
    }

    const r = await publicarAction(dados);

    if (r.ok) {
      setTexto("");
      retirar();
    } else {
      setErro(copy[ERROS[r.error ?? ""] ?? "errorGeneric"] as string);
    }
    setBusy(false);
  }

  return (
    <Card className="flex flex-col gap-3">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_CARACTERES))}
        placeholder={copy.placeholder}
        rows={3}
        disabled={busy}
        className="w-full resize-none bg-transparent text-body text-fg outline-none placeholder:text-fg-subtle disabled:opacity-60"
      />

      {aPreparar ? (
        <p className="flex items-center gap-2 text-caption text-fg-subtle">
          <Spinner /> {copy.imagePreparing}
        </p>
      ) : null}

      {imagem ? (
        <div className="relative overflow-hidden rounded-xl border border-hairline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagem.previewUrl}
            alt=""
            className="max-h-80 w-full bg-bg-sunken object-contain"
          />
          <button
            type="button"
            onClick={retirar}
            aria-label={copy.imageRemove}
            className="material absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-fg"
          >
            <Close className="size-4" />
          </button>
          <p className="absolute bottom-2 left-2 rounded-md bg-material px-2 py-0.5 text-caption2 text-fg-muted">
            {t(copy.imageSize, { kb: String(Math.round(imagem.feed.blob.size / 1024)) })}
          </p>
        </div>
      ) : null}

      {erro ? <Alert tone="danger">{erro}</Alert> : null}

      <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3">
        <div className="flex items-center gap-3">
          <input
            ref={input}
            type="file"
            accept={TIPOS_ACEITES.join(",")}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void escolher(f);
            }}
          />
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy || aPreparar || imagem != null}
            aria-label={copy.imageAdd}
            className="rounded-md p-1 text-fg-subtle transition-colors hover:text-accent disabled:opacity-40"
          >
            <Photo className="size-5" />
          </button>
          <span
            className={cn(
              "data-mono text-caption",
              restam <= 20 ? "text-warning" : "text-fg-subtle",
            )}
          >
            {t(copy.remaining, { n: String(restam) })}
          </span>
        </div>

        <Button size="sm" onClick={submeter} disabled={busy || aPreparar || semConteudo}>
          {busy ? copy.publishing : copy.publish}
        </Button>
      </div>
    </Card>
  );
}

/**
 * Envia as duas variantes e devolve os caminhos.
 *
 * O caminho começa sempre pelo id de quem envia porque é assim que a política
 * do Storage decide quem pode escrever onde. O resto do nome é um id novo por
 * publicação: nada é reescrito, e por isso o `cache-control` pode ser de um
 * ano — que é o que evita pagar o mesmo tráfego a cada vez que alguém volta
 * ao mural.
 */
async function enviarImagem(
  userId: string,
  imagem: ImagemPreparada,
): Promise<{ path: string; previewPath: string } | null> {
  const supabase = createClient();
  const id = crypto.randomUUID();
  const path = `${userId}/${id}.${imagem.full.extensao}`;
  const previewPath = `${userId}/${id}-feed.${imagem.feed.extensao}`;

  const opcoes = { cacheControl: "31536000", upsert: false };

  const [grande, pequena] = await Promise.all([
    supabase.storage
      .from(BUCKET_MURAL)
      .upload(path, imagem.full.blob, { ...opcoes, contentType: imagem.full.blob.type }),
    supabase.storage
      .from(BUCKET_MURAL)
      .upload(previewPath, imagem.feed.blob, {
        ...opcoes,
        contentType: imagem.feed.blob.type,
      }),
  ]);

  if (grande.error || pequena.error) {
    console.error(
      "[comunidade] falha a enviar imagem:",
      grande.error?.message ?? pequena.error?.message,
    );
    return null;
  }

  return { path, previewPath };
}
