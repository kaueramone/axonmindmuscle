"use client";

import { useRef, useState } from "react";

import { Photo, Play, Trash, Upload } from "@/components/ui/icons";
import { Alert, Spinner } from "@/components/ui/surface";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseMediaType } from "@/lib/supabase/types";

const IMAGENS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEOS = ["video/mp4", "video/webm"];
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Envia a figura ou o vídeo do exercício para o balde `exercises`. O caminho
 * é estável por exercício, portanto substituir a media não deixa ficheiros
 * órfãos para trás.
 */
export function MediaField({
  exerciseKey,
  url,
  type,
  onChange,
}: {
  exerciseKey: string;
  url: string | null;
  type: ExerciseMediaType | null;
  onChange: (url: string | null, type: ExerciseMediaType | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function enviar(file: File) {
    setErro(null);

    const ehImagem = IMAGENS.includes(file.type);
    const ehVideo = VIDEOS.includes(file.type);
    if (!ehImagem && !ehVideo) {
      setErro("Formatos aceites: JPG, PNG, WebP, GIF, MP4 e WebM.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErro("O ficheiro tem de ter menos de 25 MB.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const extensao = file.name.split(".").pop()?.toLowerCase() || (ehVideo ? "mp4" : "jpg");
      const caminho = `${exerciseKey}/media.${extensao}`;

      const { error } = await supabase.storage
        .from("exercises")
        .upload(caminho, file, { upsert: true, contentType: file.type });
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("exercises").getPublicUrl(caminho);

      onChange(`${publicUrl}?v=${Date.now()}`, ehVideo ? "video" : "image");
    } catch {
      setErro("Não foi possível enviar o ficheiro.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="label-brand text-fg-subtle">Imagem ou vídeo</p>

      <div className="flex items-start gap-4">
        <span className="relative grid aspect-video w-44 shrink-0 place-items-center overflow-hidden rounded-lg border border-hairline bg-bg-sunken">
          {url && type === "video" ? (
            <video src={url} className="size-full object-cover" muted playsInline />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="size-full object-cover" />
          ) : (
            <Photo className="size-6 text-fg-subtle" />
          )}
          {url && type === "video" ? (
            <span className="absolute grid size-9 place-items-center rounded-full bg-bg/70 text-fg">
              <Play className="size-4" />
            </span>
          ) : null}
          {busy ? (
            <span className="absolute inset-0 grid place-items-center bg-bg/70 text-fg">
              <Spinner />
            </span>
          ) : null}
        </span>

        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-sm border border-hairline bg-surface-strong px-3.5 py-2 text-subhead font-medium text-fg transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              <Upload className="size-3.5" />
              {url ? "Substituir" : "Carregar"}
            </button>
            {url ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onChange(null, null)}
                className="inline-flex items-center gap-1.5 rounded-sm px-2 py-2 text-subhead text-fg-subtle transition-colors hover:text-danger disabled:opacity-50"
              >
                <Trash className="size-3.5" />
                Remover
              </button>
            ) : null}
          </div>
          <p className="text-caption leading-relaxed text-fg-subtle">
            JPG, PNG, WebP, GIF, MP4 ou WebM, até 25 MB. Um GIF curto costuma
            explicar melhor a execução do que uma fotografia parada.
          </p>
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept={[...IMAGENS, ...VIDEOS].join(",")}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void enviar(file);
        }}
      />

      {erro ? <Alert tone="danger">{erro}</Alert> : null}
    </div>
  );
}
